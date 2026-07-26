import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FUNNEL_HEIGHT, funnelRadiusAt, tornadoCenterAt } from './tornadoPath';
import { useTornadoStore } from '../store';

interface Piece {
  t: number;
  angleOffset: number;
  radiusJitter: number;
  riseSpeed: number;
  spinAxis: THREE.Vector3;
  spinSpeed: number;
  spinPhase: number;
  scale: number;
}

function makePieces(count: number, speedRange: [number, number], scaleRange: [number, number]): Piece[] {
  const arr: Piece[] = [];
  for (let i = 0; i < count; i++) {
    arr.push({
      t: Math.random(),
      angleOffset: Math.random() * Math.PI * 2,
      radiusJitter: Math.random(),
      riseSpeed: speedRange[0] + Math.random() * (speedRange[1] - speedRange[0]),
      spinAxis: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(),
      spinSpeed: 2 + Math.random() * 6,
      spinPhase: Math.random() * Math.PI * 2,
      scale: scaleRange[0] + Math.random() * (scaleRange[1] - scaleRange[0]),
    });
  }
  return arr;
}

const dummy = new THREE.Object3D();

function useDebrisLayer(
  meshRef: React.RefObject<THREE.InstancedMesh>,
  pieces: Piece[],
  maxT: number
) {
  useFrame(({ clock }, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const intensity = useTornadoStore.getState().intensity;
    const elapsed = clock.getElapsedTime();
    const center = tornadoCenterAt(elapsed);

    for (let i = 0; i < pieces.length; i++) {
      const p = pieces[i];
      p.t += delta * p.riseSpeed * intensity * 0.16;
      if (p.t > maxT) {
        p.t = 0;
        p.angleOffset = Math.random() * Math.PI * 2;
        p.radiusJitter = Math.random();
      }
      const ejection = Math.max(0, p.t - 0.7) * 4.5;
      const radius = funnelRadiusAt(Math.min(p.t, 0.9) * 0.75) * (0.65 + 0.5 * p.radiusJitter) + ejection;
      const angularSpeed = (1.6 - Math.min(1, radius / 6)) * intensity * 1.4;
      const angle = p.angleOffset + elapsed * angularSpeed;
      const x = center.x + radius * Math.cos(angle);
      const z = center.z + radius * Math.sin(angle);
      const y = p.t * FUNNEL_HEIGHT * 0.75 + 0.15;

      dummy.position.set(x, y, z);
      dummy.rotation.set(
        p.spinPhase + elapsed * p.spinSpeed * p.spinAxis.x,
        p.spinPhase + elapsed * p.spinSpeed * p.spinAxis.y,
        p.spinPhase + elapsed * p.spinSpeed * p.spinAxis.z
      );
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
}

function PlankLayer() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const pieces = useMemo(() => makePieces(45, [0.8, 1.4], [0.25, 0.55]), []);
  useDebrisLayer(ref, pieces, 1);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, pieces.length]} castShadow>
      <boxGeometry args={[1.2, 0.08, 0.25]} />
      <meshStandardMaterial color="#7a5a3a" roughness={0.9} />
    </instancedMesh>
  );
}

function LeafLayer() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const pieces = useMemo(() => makePieces(60, [1.2, 2.2], [0.12, 0.28]), []);
  useDebrisLayer(ref, pieces, 1);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, pieces.length]} castShadow>
      <planeGeometry args={[1, 1]} />
      <meshStandardMaterial color="#5e6b34" roughness={1} side={THREE.DoubleSide} />
    </instancedMesh>
  );
}

function RockLayer() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const pieces = useMemo(() => makePieces(28, [0.5, 0.9], [0.18, 0.4]), []);
  useDebrisLayer(ref, pieces, 1);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, pieces.length]} castShadow>
      <dodecahedronGeometry args={[0.5, 0]} />
      <meshStandardMaterial color="#4a4436" roughness={1} flatShading />
    </instancedMesh>
  );
}

export default function Debris() {
  return (
    <group>
      <PlankLayer />
      <LeafLayer />
      <RockLayer />
    </group>
  );
}
