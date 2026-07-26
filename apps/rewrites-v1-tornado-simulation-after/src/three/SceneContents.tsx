import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Sky } from './Sky';
import { Ground } from './Ground';
import { HorizonProps } from './HorizonProps';
import { Funnel, type FunnelHandle } from './Funnel';
import { DustSkirt } from './DustSkirt';
import { Debris } from './Debris';
import { CameraRig } from './CameraRig';
import { useSimStore } from '../store';

// The tornado column sits off the orbit target so the composed shot reads
// with the funnel breaking the top third at ~62% frame width instead of
// dead-centre, while OrbitControls still orbits/looks at (0, 15, 0).
const STORM_OFFSET: [number, number, number] = [8, 0, -5];

function Lighting() {
  return (
    <>
      <directionalLight color="#ffb169" intensity={2.2} position={[-30, 22, -18]} />
      <directionalLight color="#9fc0d8" intensity={0.8} position={[26, 14, 34]} />
      <hemisphereLight color="#5e6b60" groundColor="#7f7250" intensity={0.35} />
      <ambientLight intensity={0.12} />
    </>
  );
}

// Degrades in three ordered stages, each requiring ~2s of sustained sub-45fps
// before stepping further: debris count -> condensation points -> bloom off.
function PerfMonitor() {
  const lowFrameAccum = useRef(0);
  const lastCheck = useRef(performance.now());
  const frames = useRef(0);

  useFrame(() => {
    frames.current += 1;
    const now = performance.now();
    const elapsed = now - lastCheck.current;
    if (elapsed >= 1000) {
      const fps = (frames.current * 1000) / elapsed;
      frames.current = 0;
      lastCheck.current = now;
      const s = useSimStore.getState();
      if (fps < 45) {
        lowFrameAccum.current += 1;
      } else {
        lowFrameAccum.current = 0;
      }
      if (lowFrameAccum.current >= 2 && s.degradeLevel < 3) {
        s.setDegradeLevel((s.degradeLevel + 1) as 1 | 2 | 3, true);
        lowFrameAccum.current = 0;
      }
    }
  });
  return null;
}

export function SceneContents() {
  const funnelHandle = useRef<FunnelHandle>({ height: 26, maxRadius: 5, spin: 1.2 });
  const gl = useThree((s) => s.gl);
  const degradeLevel = useSimStore((s) => s.degradeLevel);

  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.05;
  }, [gl]);

  const fogColor = useMemo(() => new THREE.Color('#6a7666'), []);

  return (
    <>
      <fogExp2 attach="fog" args={[fogColor, 0.0055]} />
      <Sky />
      <Lighting />
      <Ground />
      <HorizonProps />
      <group position={STORM_OFFSET}>
        <Funnel handleRef={funnelHandle} />
        <DustSkirt funnelHandle={funnelHandle} />
        <Debris funnelHandle={funnelHandle} />
      </group>
      <CameraRig />
      <PerfMonitor />
      {degradeLevel < 3 ? (
        <EffectComposer multisampling={0}>
          <Bloom luminanceThreshold={0.85} intensity={0.35} radius={0.6} mipmapBlur />
          <Vignette offset={0.3} darkness={0.55} />
        </EffectComposer>
      ) : (
        <EffectComposer multisampling={0}>
          <Vignette offset={0.3} darkness={0.55} />
        </EffectComposer>
      )}
    </>
  );
}
