import { Suspense, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import Ground from './Ground';
import Tornado from './Tornado';
import Debris from './Debris';
import StormSky from './StormSky';
import { tornadoCenterAt } from './tornadoPath';
import { useTornadoStore } from '../store';

function CameraRig() {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const target = useRef(new THREE.Vector3(0, 5, 0));

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();
    const c = tornadoCenterAt(elapsed);
    target.current.lerp(new THREE.Vector3(c.x, 5, c.z), 0.01);
    if (controlsRef.current) {
      controlsRef.current.target.copy(target.current);
      controlsRef.current.autoRotate = useTornadoStore.getState().autoRotate;
      controlsRef.current.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.06}
      autoRotateSpeed={0.5}
      minDistance={8}
      maxDistance={70}
      maxPolarAngle={Math.PI / 2 - 0.02}
      makeDefault
    />
  );
}

interface Props {
  flashDivRef: React.RefObject<HTMLDivElement>;
}

export default function Experience({ flashDivRef }: Props) {
  const debris = useTornadoStore((s) => s.debris);

  return (
    <>
      <fog attach="fog" args={['#565f52', 22, 130]} />
      <ambientLight intensity={0.55} color="#8f9a8a" />
      <hemisphereLight args={['#7f8a76', '#33301f', 0.6]} />
      <directionalLight
        position={[20, 30, -10]}
        intensity={0.4}
        color="#c9d2c0"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-camera-far={80}
      />

      <StormSky flashDivRef={flashDivRef} />
      <Ground />
      <Tornado />
      <Suspense fallback={null}>{debris && <Debris />}</Suspense>

      <CameraRig />
    </>
  );
}
