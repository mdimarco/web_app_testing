import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimStore } from '../store';
import type { FunnelHandle } from './Funnel';

const MAX_POINTS = 3000;

const VERT = /* glsl */ `
  attribute vec3 aSeed;
  attribute float aSize;
  attribute float aAlpha;
  uniform float uTime;
  uniform float uBaseRadius;
  uniform float uSpin;
  uniform float uTilt;
  uniform float uPixelRatio;
  varying float vAlpha;
  void main() {
    float h = aSeed.x;
    float flare = mix(1.55, 0.55, h) * aSeed.z;
    float radius = uBaseRadius * flare;
    float angle = aSeed.y + uTime * uSpin * 1.1;
    float y = h * 4.0;
    float x = cos(angle) * radius + uTilt * y * 4.0;
    float z = sin(angle) * radius;
    vec3 pos = vec3(x, y, z);
    vAlpha = aAlpha * mix(1.0, 0.15, h);
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = aSize * uPixelRatio * (120.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const FRAG = /* glsl */ `
  precision mediump float;
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    float a = smoothstep(0.5, 0.05, d) * vAlpha;
    if (a <= 0.004) discard;
    gl_FragColor = vec4(uColor, a * 0.85);
  }
`;

function approach(current: number, target: number, dt: number, tau = 0.6) {
  const k = 1 - Math.exp(-dt / tau);
  return current + (target - current) * k;
}

export function DustSkirt({ funnelHandle }: { funnelHandle: React.MutableRefObject<FunnelHandle> }) {
  const eased = useRef({ baseRadius: 3.5, spin: 1.2, tilt: 0.02 });

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(MAX_POINTS * 3);
    const seeds = new Float32Array(MAX_POINTS * 3);
    const sizes = new Float32Array(MAX_POINTS);
    const alphas = new Float32Array(MAX_POINTS);
    for (let i = 0; i < MAX_POINTS; i++) {
      seeds[i * 3] = Math.random();
      seeds[i * 3 + 1] = Math.random() * Math.PI * 2;
      seeds[i * 3 + 2] = 0.55 + Math.random() * 0.9;
      sizes[i] = (0.6 + Math.random() * 1.2) * 7.0;
      alphas[i] = 0.35 + Math.random() * 0.5;
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
      uBaseRadius: { value: 3.5 },
      uSpin: { value: 1.2 },
      uTilt: { value: 0.02 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      uColor: { value: new THREE.Color('#8c7a56') },
    }),
    [],
  );

  useLayoutEffect(() => {
    geometry.setDrawRange(0, MAX_POINTS);
  }, [geometry]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.033);
    const s = useSimStore.getState();
    const debrisNorm = s.debrisLoad / 100;
    const bottomRadius = funnelHandle.current.maxRadius * 0.16;
    const targetBase = Math.max(2.2, bottomRadius * (1.6 + debrisNorm * 1.1));

    const e = eased.current;
    e.baseRadius = approach(e.baseRadius, targetBase, dt);
    e.spin = approach(e.spin, funnelHandle.current.spin, dt);

    uniforms.uTime.value = s.playing ? uniforms.uTime.value + dt * s.simSpeed : uniforms.uTime.value;
    uniforms.uBaseRadius.value = e.baseRadius;
    uniforms.uSpin.value = e.spin;
  });

  return (
    <points geometry={geometry} frustumCulled={false} position={[0, 0.15, 0]}>
      <shaderMaterial
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
