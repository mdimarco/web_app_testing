import { useMemo } from 'react';
import * as THREE from 'three';
import { makeGroundTexture } from './textures';

export default function Ground() {
  const texture = useMemo(() => makeGroundTexture(), []);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
        <planeGeometry args={[400, 400, 1, 1]} />
        <meshStandardMaterial map={texture} roughness={1} metalness={0} />
      </mesh>
      {/* distant tree line silhouettes for scale */}
      <TreeLine />
    </group>
  );
}

function TreeLine() {
  const trees = useMemo(() => {
    const arr: { x: number; z: number; s: number }[] = [];
    const count = 90;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.1;
      const radius = 55 + Math.random() * 30;
      arr.push({
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius,
        s: 0.7 + Math.random() * 1.1,
      });
    }
    return arr;
  }, []);

  return (
    <group>
      {trees.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]} scale={t.s}>
          <mesh position={[0, 1.1, 0]} castShadow>
            <cylinderGeometry args={[0.12, 0.18, 2.2, 6]} />
            <meshStandardMaterial color="#2b2116" roughness={1} />
          </mesh>
          <mesh position={[0, 2.6, 0]} castShadow>
            <coneGeometry args={[1.1, 2.6, 7]} />
            <meshStandardMaterial color="#28331f" roughness={1} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
