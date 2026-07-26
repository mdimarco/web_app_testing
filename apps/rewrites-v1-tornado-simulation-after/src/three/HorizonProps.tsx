import { useMemo, useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';

const SILHOUETTE = '#3b3f38';

function GrainBin({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 3, 0]}>
        <cylinderGeometry args={[2.6, 2.6, 6, 16]} />
        <meshBasicMaterial color={SILHOUETTE} fog />
      </mesh>
      <mesh position={[0, 6.6, 0]}>
        <coneGeometry args={[2.7, 1.6, 16]} />
        <meshBasicMaterial color={SILHOUETTE} fog />
      </mesh>
    </group>
  );
}

function Treeline({ count, radius, seedOffset }: { count: number; radius: number; seedOffset: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    if (!ref.current) return;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const t = i / count;
      const angle = t * Math.PI * 0.9 + 2.7 + seedOffset;
      const r = radius + Math.sin(i * 12.9) * 6;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r - 40;
      const s = 3.2 + ((i * 37) % 5);
      dummy.position.set(x, s * 0.32, z);
      dummy.scale.set(s * 0.5, s * 0.55, s * 0.5);
      dummy.rotation.y = i * 1.3;
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
    }
    ref.current.instanceMatrix.needsUpdate = true;
  }, [count, radius, seedOffset]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <icosahedronGeometry args={[1, 0]} />
      <meshBasicMaterial color={SILHOUETTE} fog />
    </instancedMesh>
  );
}

export function HorizonProps() {
  const clumps = useMemo(() => [0, 1, 2, 3, 4], []);
  return (
    <group>
      <GrainBin position={[-58, 0, -130]} scale={1.3} />
      <Treeline count={clumps.length} radius={150} seedOffset={0.4} />
    </group>
  );
}
