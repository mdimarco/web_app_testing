import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Grid } from '@react-three/drei';
import SceneEnvironment from './SceneEnvironment';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useDocStore } from '../store/useDocStore';
import type { GeneratedGeometry } from '../lib/types';

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const l = () => setReduced(mq.matches);
    mq.addEventListener('change', l);
    return () => mq.removeEventListener('change', l);
  }, []);
  return reduced;
}

function buildGeometry(g: GeneratedGeometry) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(g.positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(g.normals, 3));
  return geo;
}

interface PartProps {
  geometry: GeneratedGeometry;
  opacity: number;
  onFirstFrame: (center: THREE.Vector3, radius: number) => void;
}

function Part({ geometry, opacity, onFirstFrame }: PartProps) {
  const bufferGeo = useMemo(() => buildGeometry(geometry), [geometry]);
  const edgesGeo = useMemo(() => new THREE.EdgesGeometry(bufferGeo, 28), [bufferGeo]);
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    bufferGeo.computeBoundingSphere();
    const sphere = bufferGeo.boundingSphere;
    bufferGeo.computeBoundingBox();
    const bb = bufferGeo.boundingBox!;
    const center = new THREE.Vector3();
    bb.getCenter(center);
    const radius = sphere ? sphere.radius : bb.getSize(new THREE.Vector3()).length() / 2;
    onFirstFrame(center, radius);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bufferGeo]);

  return (
    <group ref={groupRef}>
      <mesh geometry={bufferGeo} castShadow receiveShadow>
        <meshStandardMaterial color="#c9ccd1" metalness={0.35} roughness={0.45} envMapIntensity={0.35} transparent opacity={opacity} />
      </mesh>
      <lineSegments geometry={edgesGeo}>
        <lineBasicMaterial color="#1a1d22" transparent opacity={0.45 * opacity} />
      </lineSegments>
    </group>
  );
}

interface RigProps {
  hasPart: boolean;
  fitTarget: { center: THREE.Vector3; radius: number } | null;
  reducedMotion: boolean;
}

function CameraRig({ hasPart, fitTarget, reducedMotion }: RigProps) {
  const { camera, gl, invalidate } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const autoRotateStopped = useDocStore((s) => s.autoRotateStopped);
  const stopAutoRotate = useDocStore((s) => s.stopAutoRotate);
  const idleTimer = useRef<number | null>(null);
  const [autoRotating, setAutoRotating] = useState(false);
  const tweenRef = useRef<{ from: THREE.Vector3; to: THREE.Vector3; fromTarget: THREE.Vector3; toTarget: THREE.Vector3; start: number; duration: number } | null>(null);
  const didInitialFit = useRef(false);

  function armIdleTimer() {
    if (reducedMotion || autoRotateStopped) return;
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => setAutoRotating(true), 6000);
  }

  useEffect(() => {
    armIdleTimer();
    return () => {
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion, autoRotateStopped]);

  function onUserStart() {
    setAutoRotating(false);
    stopAutoRotate();
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
  }

  function fitTo(center: THREE.Vector3, radius: number, instant: boolean) {
    const controls = controlsRef.current;
    if (!controls) return;
    const dist = Math.max(60, Math.min(900, radius * 2.6 + 40));
    const dir = new THREE.Vector3(140, 105, 175).normalize();
    const toPos = center.clone().add(dir.multiplyScalar(dist));
    if (instant || reducedMotion) {
      camera.position.copy(toPos);
      controls.target.copy(center);
      controls.update();
      invalidate();
      return;
    }
    tweenRef.current = {
      from: camera.position.clone(),
      to: toPos,
      fromTarget: controls.target.clone(),
      toTarget: center.clone(),
      start: performance.now(),
      duration: 900,
    };
  }

  useEffect(() => {
    if (fitTarget && !didInitialFit.current) {
      didInitialFit.current = true;
      fitTo(fitTarget.center, fitTarget.radius, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitTarget]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key.toLowerCase() === 'f' && fitTarget) {
        onUserStart();
        fitTo(fitTarget.center, fitTarget.radius, false);
      } else if (e.key === '1' && fitTarget) {
        onUserStart();
        const controls = controlsRef.current;
        if (!controls) return;
        const dist = Math.max(60, Math.min(900, fitTarget.radius * 3));
        tweenRef.current = {
          from: camera.position.clone(),
          to: fitTarget.center.clone().add(new THREE.Vector3(0, 0, dist)),
          fromTarget: controls.target.clone(),
          toTarget: fitTarget.center.clone(),
          start: performance.now(),
          duration: reducedMotion ? 0 : 900,
        };
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitTarget, reducedMotion]);

  useFrame(() => {
    const tween = tweenRef.current;
    const controls = controlsRef.current;
    if (tween && controls) {
      const t = Math.min(1, (performance.now() - tween.start) / Math.max(1, tween.duration));
      const eased = 1 - Math.pow(1 - t, 3);
      camera.position.lerpVectors(tween.from, tween.to, eased);
      controls.target.lerpVectors(tween.fromTarget, tween.toTarget, eased);
      controls.update();
      if (t >= 1) tweenRef.current = null;
      invalidate();
    } else if (autoRotating && controls) {
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.57;
      controls.update();
      invalidate();
    } else if (controls) {
      controls.autoRotate = false;
    }
  });

  useEffect(() => {
    const dom = gl.domElement;
    const handler = () => onUserStart();
    dom.addEventListener('pointerdown', handler);
    return () => dom.removeEventListener('pointerdown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      minPolarAngle={THREE.MathUtils.degToRad(5)}
      maxPolarAngle={THREE.MathUtils.degToRad(85)}
      minDistance={60}
      maxDistance={900}
      onStart={onUserStart}
      makeDefault
    />
  );
}

function SceneLights() {
  return (
    <>
      <directionalLight position={[-70, 110, 60]} intensity={2.2} color="#fff4e2" castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[80, 40, -40]} intensity={0.35} color="#9fb6d0" />
      <directionalLight position={[-40, 60, -120]} intensity={1.0} color="#ffd9a8" />
      <ambientLight intensity={0.12} />
    </>
  );
}

export default function SolidViewport() {
  const geometry = useDocStore((s) => s.geometry);
  const status = useDocStore((s) => s.status);
  const reducedMotion = usePrefersReducedMotion();
  const [fitTarget, setFitTarget] = useState<{ center: THREE.Vector3; radius: number } | null>(null);
  const [frameloop, setFrameloop] = useState<'always' | 'demand' | 'never'>(reducedMotion ? 'demand' : 'always');

  useEffect(() => {
    function onVis() {
      setFrameloop(document.hidden ? 'never' : reducedMotion ? 'demand' : 'always');
    }
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [reducedMotion]);

  useEffect(() => {
    setFrameloop(document.hidden ? 'never' : reducedMotion ? 'demand' : 'always');
  }, [reducedMotion]);

  const opacity = status === 'generating' ? 0.45 : 1;

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #0e1216, #1a2128)' }}>
      <Canvas
        dpr={[1, 2]}
        frameloop={frameloop}
        shadows
        camera={{ fov: 35, position: [140, 105, 175], near: 1, far: 3000 }}
        gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05, antialias: true }}
      >
        <color attach="background" args={['#12161b']} />
        <fog attach="fog" args={['#12161b', 500, 1400]} />
        <SceneLights />
        <SceneEnvironment />
        <Grid
          position={[0, -0.01, 0]}
          args={[2000, 2000]}
          cellSize={10}
          cellColor="#232a31"
          sectionSize={50}
          sectionColor="#2c353d"
          fadeDistance={900}
          fadeStrength={1.5}
          infiniteGrid
        />
        {geometry && (
          <Part
            geometry={geometry}
            opacity={opacity}
            onFirstFrame={(center, radius) => {
              setFitTarget((prev) => {
                if (prev && prev.center.equals(center) && prev.radius === radius) return prev;
                return { center, radius };
              });
            }}
          />
        )}
        {geometry && <ContactShadows position={[0, 0, 0]} opacity={0.55} scale={200} blur={2} far={100} resolution={1024} color="#05070a" />}
        <CameraRig hasPart={!!geometry} fitTarget={fitTarget} reducedMotion={reducedMotion} />
      </Canvas>
      <div className="viewport-vignette" />
    </div>
  );
}
