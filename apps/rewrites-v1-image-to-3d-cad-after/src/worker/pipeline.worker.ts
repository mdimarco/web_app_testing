/// <reference lib="webworker" />
import * as THREE from 'three';
import { buildBinaryMask, labelComponents, traceLoops, groupLoops } from '../lib/contour';
import { simplifyClosedLoop, chaikinClosed } from '../lib/rdp';
import type { Point } from '../lib/types';

interface GenerateMsg {
  type: 'generate';
  jobId: number;
  width: number;
  height: number;
  buffer: ArrayBuffer;
  manualMaskBuffer: ArrayBuffer | null;
  threshold: { threshold: number; invert: boolean; minIslandArea: number };
  contour: { simplifyTolerance: number; smoothing: number };
  solid: { targetWidthMm: number; extrudeDepthMm: number; bevelMm: number; twoSided: boolean };
}

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = (e: MessageEvent<GenerateMsg>) => {
  const msg = e.data;
  if (msg.type !== 'generate') return;
  try {
    run(msg);
  } catch (err) {
    ctx.postMessage({ type: 'error', jobId: msg.jobId, message: err instanceof Error ? err.message : 'Unknown error during generation.' });
  }
};

function post(jobId: number, stage: string, progress: number, detail?: string) {
  ctx.postMessage({ type: 'progress', jobId, stage, progress, detail });
}

function run(msg: GenerateMsg) {
  const { jobId, width, height, threshold, contour, solid } = msg;
  const data = new Uint8ClampedArray(msg.buffer);
  const manualMask = msg.manualMaskBuffer ? new Uint8Array(msg.manualMaskBuffer) : undefined;

  post(jobId, 'read', 1, 'Reading image');

  post(jobId, 'trace', 0.05, 'Tracing contours');
  const mask0 = buildBinaryMask(data, width, height, threshold.threshold, threshold.invert, manualMask);
  const { labels, areas } = labelComponents(mask0, width, height);
  const islandsTotal = areas.length;
  let islandsFiltered = 0;
  for (let i = 0; i < areas.length; i++) if (areas[i] < threshold.minIslandArea) islandsFiltered++;

  const mask = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const lb = labels[i];
    if (lb >= 0 && areas[lb] >= threshold.minIslandArea) mask[i] = 1;
  }

  post(jobId, 'trace', 0.4, 'Tracing contours');
  const rawLoops = traceLoops(mask, width, height);
  post(jobId, 'trace', 1, `${rawLoops.length} found`);

  if (rawLoops.length === 0) {
    ctx.postMessage({ type: 'no-contour', jobId, islandsTotal, islandsFiltered });
    return;
  }

  post(jobId, 'simplify', 0.05, 'Simplifying');
  const smoothIterations = Math.round(contour.smoothing * 3);
  const processedLoops: Point[][] = rawLoops.map((loop, i) => {
    let pts = loop;
    if (smoothIterations > 0) pts = chaikinClosed(pts, smoothIterations);
    if (contour.simplifyTolerance > 0) pts = simplifyClosedLoop(pts, contour.simplifyTolerance);
    post(jobId, 'simplify', 0.05 + 0.9 * ((i + 1) / rawLoops.length), 'Simplifying');
    return pts;
  });

  post(jobId, 'extrude', 0.05, 'Extruding solid');
  const groups = groupLoops(processedLoops);
  if (groups.length === 0) {
    ctx.postMessage({ type: 'no-contour', jobId, islandsTotal, islandsFiltered });
    return;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const g of groups) {
    for (const p of g.outer) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
  }
  const bboxWpx = Math.max(1e-6, maxX - minX);
  const bboxHpx = Math.max(1e-6, maxY - minY);
  const scale = solid.targetWidthMm / bboxWpx;
  const toVec = (p: Point) => new THREE.Vector2((p.x - minX) * scale, (bboxHpx - (p.y - minY)) * scale);

  const depth = Math.max(0.05, solid.extrudeDepthMm);
  const bevelEnabled = solid.bevelMm > 0.001;
  const bevelSize = Math.max(0.001, Math.min(solid.bevelMm, depth / 2 - 0.001, bboxWpx * scale * 0.2));

  // ExtrudeGeometry produces non-indexed geometry (each triangle owns 3 unique vertex
  // entries) with correct per-face normals already computed internally, so shapes are
  // simply concatenated below rather than merged through a shared index buffer.
  const geometries: THREE.BufferGeometry[] = [];
  for (const g of groups) {
    if (g.outer.length < 3) continue;
    const shape = new THREE.Shape(g.outer.map(toVec));
    for (const h of g.holes) {
      if (h.length < 3) continue;
      shape.holes.push(new THREE.Path(h.map(toVec)));
    }
    const eg = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled,
      bevelThickness: bevelSize,
      bevelSize,
      bevelSegments: bevelEnabled ? 3 : 1,
      steps: 1,
      curveSegments: 8,
    });
    if (solid.twoSided) eg.translate(0, 0, -depth / 2);
    geometries.push(eg);
  }
  post(jobId, 'extrude', 1, 'Extruding solid');

  post(jobId, 'watertight', 0.2, 'Checking watertight');
  let vertCount = 0;
  for (const g of geometries) vertCount += g.getAttribute('position').count;
  const positions = new Float32Array(vertCount * 3);
  const normals = new Float32Array(vertCount * 3);
  let vOff = 0;
  for (const g of geometries) {
    const p = g.getAttribute('position') as THREE.BufferAttribute;
    const n = g.getAttribute('normal') as THREE.BufferAttribute;
    positions.set(p.array as Float32Array, vOff * 3);
    normals.set(n.array as Float32Array, vOff * 3);
    vOff += p.count;
  }

  const bboxMesh = new THREE.BufferGeometry();
  bboxMesh.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  bboxMesh.computeBoundingBox();
  const bb = bboxMesh.boundingBox!;
  const bbox = { w: bb.max.x - bb.min.x, d: bb.max.y - bb.min.y, h: bb.max.z - bb.min.z };

  const openEdges = countOpenEdges(positions);
  const triangleCount = positions.length / 9;
  post(jobId, 'watertight', 1, 'Checking watertight');

  ctx.postMessage(
    {
      type: 'result',
      jobId,
      contourInfo: { loopCount: rawLoops.length, islandsTotal, islandsFiltered },
      geometry: { bbox, triangleCount, openEdges, watertight: openEdges === 0 },
      positionsBuf: positions.buffer,
      normalsBuf: normals.buffer,
    },
    [positions.buffer, normals.buffer]
  );
}

/** Count non-manifold / boundary edges by welding vertices at coincident positions. */
function countOpenEdges(positions: Float32Array): number {
  const eps = 1e-4;
  const q = (v: number) => Math.round(v / eps);
  const posKeyToId = new Map<string, number>();
  const vertexCount = positions.length / 3;
  const remap = new Int32Array(vertexCount);
  for (let i = 0; i < vertexCount; i++) {
    const key = `${q(positions[i * 3])}_${q(positions[i * 3 + 1])}_${q(positions[i * 3 + 2])}`;
    let id = posKeyToId.get(key);
    if (id === undefined) {
      id = posKeyToId.size;
      posKeyToId.set(key, id);
    }
    remap[i] = id;
  }
  const edgeCount = new Map<string, number>();
  const triCount = vertexCount / 3;
  for (let t = 0; t < triCount; t++) {
    const a = remap[t * 3];
    const b = remap[t * 3 + 1];
    const c = remap[t * 3 + 2];
    const edges: [number, number][] = [
      [a, b],
      [b, c],
      [c, a],
    ];
    for (const [x, y] of edges) {
      const key = x < y ? `${x}_${y}` : `${y}_${x}`;
      edgeCount.set(key, (edgeCount.get(key) || 0) + 1);
    }
  }
  let open = 0;
  edgeCount.forEach((v) => {
    if (v !== 2) open++;
  });
  return open;
}
