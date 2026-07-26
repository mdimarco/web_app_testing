import type { Point } from './types';

/**
 * Build a binary fill mask from RGBA pixel data using a luminance threshold.
 * Pixels darker than `threshold` are considered "filled" (part material) unless inverted.
 * A manual override mask (0 = none, 1 = force fill, 2 = force empty) may be supplied,
 * produced by the threshold brush / erase island tools.
 */
export function buildBinaryMask(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  threshold: number,
  invert: boolean,
  manualMask?: Uint8Array
): Uint8Array {
  const mask = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const a = data[i * 4 + 3];
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    let filled = a > 10 ? lum < threshold : false;
    if (invert) filled = !filled;
    if (manualMask) {
      const m = manualMask[i];
      if (m === 1) filled = true;
      else if (m === 2) filled = false;
    }
    mask[i] = filled ? 1 : 0;
  }
  return mask;
}

export interface Components {
  labels: Int32Array;
  areas: number[];
}

/** 4-connected flood-fill labelling of the binary mask. */
export function labelComponents(mask: Uint8Array, width: number, height: number): Components {
  const labels = new Int32Array(width * height).fill(-1);
  const areas: number[] = [];
  let current = 0;
  const stack: number[] = [];
  for (let start = 0; start < width * height; start++) {
    if (mask[start] !== 1 || labels[start] !== -1) continue;
    let area = 0;
    stack.push(start);
    labels[start] = current;
    while (stack.length) {
      const p = stack.pop()!;
      area++;
      const x = p % width;
      const y = (p / width) | 0;
      if (x > 0) {
        const n = p - 1;
        if (mask[n] === 1 && labels[n] === -1) {
          labels[n] = current;
          stack.push(n);
        }
      }
      if (x < width - 1) {
        const n = p + 1;
        if (mask[n] === 1 && labels[n] === -1) {
          labels[n] = current;
          stack.push(n);
        }
      }
      if (y > 0) {
        const n = p - width;
        if (mask[n] === 1 && labels[n] === -1) {
          labels[n] = current;
          stack.push(n);
        }
      }
      if (y < height - 1) {
        const n = p + width;
        if (mask[n] === 1 && labels[n] === -1) {
          labels[n] = current;
          stack.push(n);
        }
      }
    }
    areas.push(area);
    current++;
  }
  return { labels, areas };
}

/**
 * Trace the boundary loops of a binary mask by walking pixel-edge segments between
 * filled and empty cells (marching-squares style for a binary field) and stitching
 * them head-to-tail into closed polylines in pixel-corner coordinates.
 */
export function traceLoops(mask: Uint8Array, width: number, height: number): Point[][] {
  const H1 = height + 1;
  const keyOf = (x: number, y: number) => x * H1 + y;
  const remaining = new Map<number, number[]>();
  const addEdge = (sx: number, sy: number, ex: number, ey: number) => {
    const sk = keyOf(sx, sy);
    const ek = keyOf(ex, ey);
    let arr = remaining.get(sk);
    if (!arr) {
      arr = [];
      remaining.set(sk, arr);
    }
    arr.push(ek);
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y * width + x] !== 1) continue;
      if (y === 0 || mask[(y - 1) * width + x] !== 1) addEdge(x, y, x + 1, y);
      if (x === width - 1 || mask[y * width + x + 1] !== 1) addEdge(x + 1, y, x + 1, y + 1);
      if (y === height - 1 || mask[(y + 1) * width + x] !== 1) addEdge(x + 1, y + 1, x, y + 1);
      if (x === 0 || mask[y * width + x - 1] !== 1) addEdge(x, y + 1, x, y);
    }
  }

  const keyToPoint = (k: number): Point => ({ x: Math.floor(k / H1), y: k % H1 });
  const loops: Point[][] = [];
  const maxSteps = (width + 1) * (height + 1) * 4 + 16;

  for (const startKey of Array.from(remaining.keys())) {
    let bucket = remaining.get(startKey);
    while (bucket && bucket.length) {
      const loopPoints: Point[] = [];
      let currentKey = startKey;
      let steps = 0;
      while (steps < maxSteps) {
        const arrCur = remaining.get(currentKey);
        if (!arrCur || arrCur.length === 0) break;
        const nextKey = arrCur.pop()!;
        loopPoints.push(keyToPoint(currentKey));
        steps++;
        if (nextKey === startKey) break;
        currentKey = nextKey;
      }
      if (loopPoints.length >= 3) loops.push(loopPoints);
      bucket = remaining.get(startKey);
    }
  }
  return loops;
}

function pointInPolygon(pt: Point, poly: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    const intersect = yi > pt.y !== yj > pt.y && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function polygonArea(poly: Point[]): number {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    a += (poly[j].x + poly[i].x) * (poly[j].y - poly[i].y);
  }
  return Math.abs(a / 2);
}

export interface ShapeGroup {
  outer: Point[];
  holes: Point[][];
}

/** Classify loops into outer/hole by even-odd nesting depth and pair holes to their nearest parent. */
export function groupLoops(loops: Point[][]): ShapeGroup[] {
  const areas = loops.map(polygonArea);
  const containment: number[][] = loops.map(() => []);
  for (let i = 0; i < loops.length; i++) {
    for (let j = 0; j < loops.length; j++) {
      if (i === j) continue;
      if (pointInPolygon(loops[i][0], loops[j])) containment[i].push(j);
    }
  }
  const depth = containment.map((c) => c.length);
  const groups: ShapeGroup[] = [];
  const outerIndexToGroup = new Map<number, ShapeGroup>();
  for (let i = 0; i < loops.length; i++) {
    if (depth[i] % 2 === 0) {
      const g: ShapeGroup = { outer: loops[i], holes: [] };
      groups.push(g);
      outerIndexToGroup.set(i, g);
    }
  }
  for (let i = 0; i < loops.length; i++) {
    if (depth[i] % 2 === 1) {
      let bestParent = -1;
      let bestArea = Infinity;
      for (const j of containment[i]) {
        if (depth[j] === depth[i] - 1 && areas[j] < bestArea) {
          bestArea = areas[j];
          bestParent = j;
        }
      }
      if (bestParent >= 0) {
        outerIndexToGroup.get(bestParent)?.holes.push(loops[i]);
      }
    }
  }
  return groups.filter((g) => g.outer.length >= 3);
}
