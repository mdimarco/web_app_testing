import { Environment, Lightformer } from '@react-three/drei';

/**
 * Procedural studio environment built entirely from local Lightformer geometry —
 * no HDRI file or network fetch, so material reflections stay on-device only.
 */
export default function SceneEnvironment() {
  return (
    <Environment resolution={256} background={false}>
      <Lightformer intensity={2.5} color="#fff4e2" position={[-8, 6, 4]} scale={[8, 8, 1]} rotation={[0, Math.PI / 4, 0]} />
      <Lightformer intensity={0.6} color="#9fb6d0" position={[8, 4, -3]} scale={[8, 6, 1]} rotation={[0, -Math.PI / 3, 0]} />
      <Lightformer intensity={1.1} color="#ffd9a8" position={[0, 5, -9]} scale={[12, 10, 1]} rotation={[0, Math.PI, 0]} />
      <Lightformer intensity={0.3} color="#4a5560" position={[0, -6, 0]} scale={[20, 20, 1]} rotation={[Math.PI / 2, 0, 0]} />
    </Environment>
  );
}
