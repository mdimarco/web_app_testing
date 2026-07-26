import { useEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import SceneEnvironment from './SceneEnvironment';
import * as THREE from 'three';
import type { GeneratedGeometry } from '../lib/types';

function FramedPart({ geometry }: { geometry: GeneratedGeometry }) {
  const bufferGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(geometry.positions, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(geometry.normals, 3));
    return geo;
  }, [geometry]);
  const edgesGeo = useMemo(() => new THREE.EdgesGeometry(bufferGeo, 28), [bufferGeo]);
  const { camera, invalidate } = useThree();

  useEffect(() => {
    bufferGeo.computeBoundingSphere();
    const sphere = bufferGeo.boundingSphere;
    if (!sphere) return;
    const dir = new THREE.Vector3(140, 105, 175).normalize();
    const dist = Math.max(1, sphere.radius * 2.6);
    camera.position.copy(sphere.center.clone().add(dir.multiplyScalar(dist)));
    camera.lookAt(sphere.center);
    camera.updateProjectionMatrix();
    invalidate();
  }, [bufferGeo, camera, invalidate]);

  return (
    <group>
      <mesh geometry={bufferGeo}>
        <meshStandardMaterial color="#c9ccd1" metalness={0.35} roughness={0.45} envMapIntensity={0.35} />
      </mesh>
      <lineSegments geometry={edgesGeo}>
        <lineBasicMaterial color="#1a1d22" transparent opacity={0.45} />
      </lineSegments>
    </group>
  );
}

export default function ExportPreview({ geometry }: { geometry: GeneratedGeometry }) {
  return (
    <Canvas dpr={[1, 2]} frameloop="demand" camera={{ fov: 35, near: 1, far: 3000 }} gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}>
      <color attach="background" args={['#12161b']} />
      <directionalLight position={[-70, 110, 60]} intensity={2.2} color="#fff4e2" />
      <directionalLight position={[80, 40, -40]} intensity={0.35} color="#9fb6d0" />
      <directionalLight position={[-40, 60, -120]} intensity={1.0} color="#ffd9a8" />
      <ambientLight intensity={0.15} />
      <SceneEnvironment />
      <FramedPart geometry={geometry} />
    </Canvas>
  );
}
