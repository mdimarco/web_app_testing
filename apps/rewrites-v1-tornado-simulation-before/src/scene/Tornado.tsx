import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { makeSpriteTexture } from './textures';
import { FUNNEL_HEIGHT, funnelRadiusAt, tornadoCenterAt } from './tornadoPath';
import { useTornadoStore } from '../store';

const COUNT = 7000;

const vertexShader = /* glsl */ `
  attribute float size;
  attribute vec3 particleColor;
  varying vec3 vColor;
  void main() {
    vColor = particleColor;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (260.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D pointTexture;
  varying vec3 vColor;
  void main() {
    vec4 tex = texture2D(pointTexture, gl_PointCoord);
    if (tex.a < 0.04) discard;
    gl_FragColor = vec4(vColor, tex.a * 0.9);
  }
`;

interface Particle {
  angleOffset: number;
  tBase: number;
  radiusJitter: number;
  speedFactor: number;
  wobblePhase: number;
  colorJitter: number;
}

export default function Tornado() {
  const pointsRef = useRef<THREE.Points>(null);
  const sprite = useMemo(() => makeSpriteTexture(), []);

  const particles = useMemo<Particle[]>(() => {
    const arr: Particle[] = [];
    for (let i = 0; i < COUNT; i++) {
      arr.push({
        angleOffset: Math.random() * Math.PI * 2,
        tBase: Math.random(),
        radiusJitter: Math.random(),
        speedFactor: 0.7 + Math.random() * 0.9,
        wobblePhase: Math.random() * Math.PI * 2,
        colorJitter: Math.random(),
      });
    }
    return arr;
  }, []);

  const { positions, colors, sizes } = useMemo(() => {
    return {
      positions: new Float32Array(COUNT * 3),
      colors: new Float32Array(COUNT * 3),
      sizes: new Float32Array(COUNT),
    };
  }, []);

  const dustColor = useMemo(() => new THREE.Color('#8a7554'), []);
  const cloudColor = useMemo(() => new THREE.Color('#c9ced2'), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);

  const uniforms = useMemo(() => ({ pointTexture: { value: sprite } }), [sprite]);

  useFrame(({ clock }) => {
    const intensity = useTornadoStore.getState().intensity;
    const elapsed = clock.getElapsedTime();
    const center = tornadoCenterAt(elapsed);

    for (let i = 0; i < COUNT; i++) {
      const p = particles[i];
      const radius = funnelRadiusAt(p.tBase) * (0.75 + 0.45 * p.radiusJitter);
      const angularSpeed = p.speedFactor * (2.4 - Math.min(1, radius / 6)) * intensity;
      const angle = p.angleOffset + elapsed * angularSpeed;
      const wobbleAmp = (0.12 + p.tBase * 0.9) * intensity;
      const wobble = Math.sin(elapsed * 0.6 + p.wobblePhase) * wobbleAmp;
      const effRadius = radius + wobble;

      const x = center.x + effRadius * Math.cos(angle);
      const z = center.z + effRadius * Math.sin(angle);
      const y =
        p.tBase * FUNNEL_HEIGHT +
        Math.sin(elapsed * 1.3 + p.wobblePhase) * 0.18 * intensity;

      const idx = i * 3;
      positions[idx] = x;
      positions[idx + 1] = y;
      positions[idx + 2] = z;

      tmpColor.copy(dustColor).lerp(cloudColor, Math.pow(p.tBase, 0.8));
      const shade = 0.82 + 0.3 * p.colorJitter;
      colors[idx] = tmpColor.r * shade;
      colors[idx + 1] = tmpColor.g * shade;
      colors[idx + 2] = tmpColor.b * shade;

      const skirtBoost = Math.exp(-p.tBase * 10) * 2.2;
      sizes[i] =
        (1.0 + 2.3 * Math.pow(p.tBase, 2) + skirtBoost) * (0.7 + 0.6 * p.radiusJitter);
    }

    const geom = pointsRef.current?.geometry;
    if (geom) {
      (geom.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      (geom.attributes.particleColor as THREE.BufferAttribute).needsUpdate = true;
      (geom.attributes.size as THREE.BufferAttribute).needsUpdate = true;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-particleColor" args={[colors, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
      />
    </points>
  );
}
