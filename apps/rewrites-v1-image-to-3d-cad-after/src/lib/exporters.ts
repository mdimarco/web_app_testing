import * as THREE from 'three';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import type { ExportFormat, GeneratedGeometry } from './types';

export function meshFromGeometry(g: GeneratedGeometry): THREE.Mesh {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(g.positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(g.normals, 3));
  const mat = new THREE.MeshStandardMaterial({ color: 0xc9ccd1, metalness: 0.35, roughness: 0.45 });
  return new THREE.Mesh(geo, mat);
}

export async function exportGeometry(g: GeneratedGeometry, format: ExportFormat): Promise<Blob> {
  const mesh = meshFromGeometry(g);
  if (format === 'stl') {
    const exporter = new STLExporter();
    const result = exporter.parse(mesh, { binary: true });
    const view = result as DataView;
    return new Blob([view.buffer as ArrayBuffer], { type: 'model/stl' });
  }
  if (format === 'obj') {
    const exporter = new OBJExporter();
    const result = exporter.parse(mesh);
    return new Blob([result], { type: 'text/plain' });
  }
  const exporter = new GLTFExporter();
  const result = await new Promise<ArrayBuffer>((resolve, reject) => {
    exporter.parse(
      mesh,
      (res) => resolve(res as ArrayBuffer),
      (err) => reject(err),
      { binary: true }
    );
  });
  return new Blob([result], { type: 'model/gltf-binary' });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function extensionFor(format: ExportFormat): string {
  return format;
}
