import { useEffect, useRef } from 'react';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

const IDLE_DELAY = 8000;

export function CameraRig() {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const controls = controlsRef.current;
    if (!controls) return;

    const clearIdle = () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = null;
    };

    const scheduleResume = () => {
      clearIdle();
      idleTimer.current = setTimeout(() => {
        if (!reducedMotion.current) controls.autoRotate = true;
      }, IDLE_DELAY);
    };

    const onStart = () => {
      controls.autoRotate = false;
      clearIdle();
    };
    const onEnd = () => {
      scheduleResume();
    };

    controls.addEventListener('start', onStart);
    controls.addEventListener('end', onEnd);
    scheduleResume();

    return () => {
      controls.removeEventListener('start', onStart);
      controls.removeEventListener('end', onEnd);
      clearIdle();
    };
  }, []);

  return (
    <OrbitControls
      ref={controlsRef}
      target={[0, 15, 0]}
      enablePan={false}
      enableDamping
      dampingFactor={0.06}
      minDistance={22}
      maxDistance={140}
      minPolarAngle={(22 * Math.PI) / 180}
      maxPolarAngle={(86 * Math.PI) / 180}
      autoRotateSpeed={0.48}
      makeDefault
    />
  );
}
