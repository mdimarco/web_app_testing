import { useMemo } from 'react';
import * as THREE from 'three';

function hash(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

function valueNoise(x: number, y: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  const ux = xf * xf * (3 - 2 * xf);
  const uy = yf * yf * (3 - 2 * yf);
  return a * (1 - ux) * (1 - uy) + b * ux * (1 - uy) + c * (1 - ux) * uy + d * ux * uy;
}

export function Ground() {
  const geometry = useMemo(() => {
    const size = 400;
    const segments = 96;
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const cGround = new THREE.Color('#7f7250');
    const cDark = new THREE.Color('#4e472f');
    const tmp = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const n1 = valueNoise(x * 0.035, z * 0.035);
      const n2 = valueNoise(x * 0.11 + 50, z * 0.11 + 50) * 0.35;
      const ripple = Math.sin(x * 0.12 + z * 0.05) * 0.06;
      const height = (n1 + n2) * 1.6 + ripple;
      pos.setY(i, height);

      const dist = Math.sqrt(x * x + z * z);
      const fade = Math.min(1, dist / 180);
      const t = Math.min(1, Math.max(0, (n1 + n2 * 0.5) * 0.9 + fade * 0.25));
      tmp.copy(cGround).lerp(cDark, t);
      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <mesh geometry={geometry} receiveShadow={false} position={[0, 0, 0]}>
      <meshStandardMaterial vertexColors roughness={1} metalness={0} fog />
    </mesh>
  );
}
