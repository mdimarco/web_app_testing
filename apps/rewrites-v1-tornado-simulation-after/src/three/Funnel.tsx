import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimStore } from '../store';

const MAX_POINTS = 24000;

const VERT = /* glsl */ `
  attribute vec3 aSeed;
  attribute float aSize;
  attribute float aAlpha;
  uniform float uTime;
  uniform float uHeight;
  uniform float uMaxRadius;
  uniform float uMinRadiusFrac;
  uniform float uTilt;
  uniform float uSpin;
  uniform float uSway;
  uniform float uDensity;
  uniform float uPixelRatio;
  varying float vAlpha;
  varying float vRadial;
  void main() {
    float h = aSeed.x;
    float taper = mix(uMinRadiusFrac, 1.0, pow(h, 1.6));
    float radius = uMaxRadius * taper * aSeed.z;
    float angle = aSeed.y + uTime * uSpin * (1.5 - 0.55 * h);
    float x = cos(angle) * radius;
    float z = sin(angle) * radius;
    float y = h * uHeight;
    float lean = uTilt * y;
    float sway = sin(uTime * 0.18 + h * 3.1 + aSeed.y) * uSway * h;
    x += lean + sway * 0.6;
    z += sin(uTime * 0.11 + h * 2.2) * uSway * 0.4 * h;
    vec3 pos = vec3(x, y, z);
    vAlpha = aAlpha * uDensity * mix(1.2, 0.28, smoothstep(0.75, 1.35, aSeed.z));
    vRadial = clamp(aSeed.z, 0.0, 1.0);
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = aSize * uPixelRatio * (140.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const FRAG = /* glsl */ `
  precision mediump float;
  uniform vec3 uColorCore;
  uniform vec3 uColorEdge;
  varying float vAlpha;
  varying float vRadial;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    float a = smoothstep(0.5, 0.05, d) * vAlpha;
    if (a <= 0.003) discard;
    vec3 color = mix(uColorCore, uColorEdge, vRadial);
    gl_FragColor = vec4(color, a);
  }
`;

function approach(current: number, target: number, dt: number, tau = 0.6) {
  const k = 1 - Math.exp(-dt / tau);
  return current + (target - current) * k;
}

export interface FunnelHandle {
  height: number;
  maxRadius: number;
  spin: number;
}

export function Funnel({ handleRef }: { handleRef: React.MutableRefObject<FunnelHandle> }) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const simTime = useRef(0);
  const eased = useRef({ height: 26, maxRadius: 5, tilt: 0.1, spin: 1.2, sway: 1.2, density: 0.85 });

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(MAX_POINTS * 3);
    const seeds = new Float32Array(MAX_POINTS * 3);
    const sizes = new Float32Array(MAX_POINTS);
    const alphas = new Float32Array(MAX_POINTS);

    for (let i = 0; i < MAX_POINTS; i++) {
      const heightFrac = Math.random();
      const angleOffset = Math.random() * Math.PI * 2;
      const r = Math.random();
      const radialJitter = 0.12 + Math.pow(r, 1.7) * 1.35;

      seeds[i * 3] = heightFrac;
      seeds[i * 3 + 1] = angleOffset;
      seeds[i * 3 + 2] = radialJitter;

      sizes[i] = (2.6 - Math.min(radialJitter, 1.2)) * (0.7 + Math.random() * 0.6) * 6.0;
      alphas[i] = 0.55 + Math.random() * 0.5;

      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
    return geo;
  }, []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uHeight: { value: 26 },
      uMaxRadius: { value: 5 },
      uMinRadiusFrac: { value: 0.12 },
      uTilt: { value: 0.1 },
      uSpin: { value: 1.2 },
      uSway: { value: 1.2 },
      uDensity: { value: 0.85 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      uColorCore: { value: new THREE.Color('#dbd5c8') },
      uColorEdge: { value: new THREE.Color('#7a7365') },
    }),
    [],
  );

  useLayoutEffect(() => {
    const level = useSimStore.getState().degradeLevel;
    geometry.setDrawRange(0, level >= 2 ? MAX_POINTS / 2 : MAX_POINTS);
  }, [geometry]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.033);
    const s = useSimStore.getState();
    geometry.setDrawRange(0, s.degradeLevel >= 2 ? MAX_POINTS / 2 : MAX_POINTS);

    const windNorm = s.windShear / 120;
    const widthNorm = (s.funnelWidth - 40) / (1200 - 40);
    const debrisNorm = s.debrisLoad / 100;

    const targetHeight = 18 + windNorm * 14;
    const targetMaxRadius = 1.4 + widthNorm * 13.6;
    const targetTilt = 0.1 + windNorm * 0.05;
    const targetSpin = 0.55 + windNorm * 2.6;
    const targetSway = 1.0 + debrisNorm * 1.6;
    const targetDensity = 0.62 + debrisNorm * 0.5;

    const e = eased.current;
    e.height = approach(e.height, targetHeight, dt);
    e.maxRadius = approach(e.maxRadius, targetMaxRadius, dt);
    e.tilt = approach(e.tilt, targetTilt, dt);
    e.spin = approach(e.spin, targetSpin, dt);
    e.sway = approach(e.sway, targetSway, dt);
    e.density = approach(e.density, targetDensity, dt);

    if (s.playing) {
      simTime.current += dt * s.simSpeed;
    }

    const u = uniforms;
    u.uTime.value = simTime.current;
    u.uHeight.value = e.height;
    u.uMaxRadius.value = e.maxRadius;
    u.uTilt.value = e.tilt;
    u.uSpin.value = e.spin;
    u.uSway.value = e.sway;
    u.uDensity.value = e.density;

    handleRef.current.height = e.height;
    handleRef.current.maxRadius = e.maxRadius;
    handleRef.current.spin = e.spin;
  });

  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false} position={[0, 0, 0]}>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={VERT}
        fragmentShader={FRAG}
        transparent
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </points>
  );
}
