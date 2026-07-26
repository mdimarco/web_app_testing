import { useMemo } from 'react';
import * as THREE from 'three';

const VERT = /* glsl */ `
  varying vec3 vPos;
  void main() {
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */ `
  uniform vec3 uZenith;
  uniform vec3 uMid;
  uniform vec3 uHorizon;
  varying vec3 vPos;
  void main() {
    float h = normalize(vPos).y;
    float horizonMix = smoothstep(-0.05, 0.14, h);
    vec3 lower = mix(uHorizon, uMid, horizonMix);
    float zenithMix = smoothstep(0.1, 0.85, h);
    vec3 color = mix(lower, uZenith, zenithMix);
    gl_FragColor = vec4(color, 1.0);
  }
`;

export function Sky() {
  const uniforms = useMemo(
    () => ({
      uZenith: { value: new THREE.Color('#242a31') },
      uMid: { value: new THREE.Color('#5e6b60') },
      uHorizon: { value: new THREE.Color('#c39c67') },
    }),
    [],
  );

  return (
    <mesh scale={[1, 1, 1]} renderOrder={-10}>
      <sphereGeometry args={[300, 32, 24]} />
      <shaderMaterial
        side={THREE.BackSide}
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={VERT}
        fragmentShader={FRAG}
      />
    </mesh>
  );
}
