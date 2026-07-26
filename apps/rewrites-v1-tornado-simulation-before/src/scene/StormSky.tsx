import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useTornadoStore } from '../store';

const vertexShader = /* glsl */ `
  varying vec3 vPos;
  void main() {
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 topColor;
  uniform vec3 bottomColor;
  uniform float flash;
  uniform float uTime;
  varying vec3 vPos;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  void main() {
    float h = normalize(vPos).y * 0.5 + 0.5;
    vec3 col = mix(bottomColor, topColor, pow(clamp(h, 0.0, 1.0), 0.55));
    vec2 cloudUv = vec2(vPos.x * 0.01 + uTime * 0.008, vPos.z * 0.01 + vPos.y * 0.015);
    float n = noise(cloudUv * 3.0) * 0.6 + noise(cloudUv * 7.0) * 0.3;
    col = mix(col, col * 0.55 + vec3(0.04, 0.045, 0.05), n * 0.6);
    col += flash * vec3(0.85, 0.9, 1.0);
    gl_FragColor = vec4(col, 1.0);
  }
`;

interface Props {
  flashDivRef: React.RefObject<HTMLDivElement>;
}

export default function StormSky({ flashDivRef }: Props) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const lightning = useTornadoStore((s) => s.lightning);
  const registerStrike = useTornadoStore((s) => s.registerStrike);

  const state = useRef({ next: 2 + Math.random() * 4, flash: 0, elapsed: 0, pulses: 0 });

  const uniforms = useMemo(
    () => ({
      topColor: { value: new THREE.Color('#2b3236') },
      bottomColor: { value: new THREE.Color('#565f52') },
      flash: { value: 0 },
      uTime: { value: 0 },
    }),
    []
  );

  useFrame((_, delta) => {
    const s = state.current;
    s.elapsed += delta;
    if (materialRef.current) materialRef.current.uniforms.uTime.value = s.elapsed;

    if (lightning) {
      s.next -= delta;
      if (s.next <= 0 && s.pulses <= 0) {
        s.pulses = 2 + Math.floor(Math.random() * 3);
        s.next = 3 + Math.random() * 7;
        registerStrike();
      }
      if (s.pulses > 0) {
        s.flash = Math.min(1, s.flash + delta * 18);
        if (s.flash >= 0.95) s.pulses -= 0.02;
      } else {
        s.flash = Math.max(0, s.flash - delta * 4.2);
      }
    } else {
      s.flash = Math.max(0, s.flash - delta * 6);
    }

    if (materialRef.current) materialRef.current.uniforms.flash.value = s.flash;
    if (lightRef.current) lightRef.current.intensity = s.flash * 14;
    if (flashDivRef.current) flashDivRef.current.style.opacity = String(s.flash * 0.55);
  });

  return (
    <>
      <mesh scale={[1, 1, 1]}>
        <sphereGeometry args={[300, 32, 32]} />
        <shaderMaterial
          ref={materialRef}
          side={THREE.BackSide}
          uniforms={uniforms}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          depthWrite={false}
        />
      </mesh>
      <pointLight ref={lightRef} position={[0, 40, 0]} color="#dfe6ff" intensity={0} distance={200} />
    </>
  );
}
