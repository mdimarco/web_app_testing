import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimStore } from '../store';
import type { FunnelHandle } from './Funnel';

const TOTAL = 1400;
const VARIANTS = 3;
const COUNT_PER = Math.ceil(TOTAL / VARIANTS);

interface Shard {
  heightFrac: number;
  angle: number;
  radialJitter: number;
  radiusReach: number;
  spinSpeed: number;
  bobPhase: number;
  tumbleAxis: THREE.Vector3;
  tumbleSpeed: number;
  scale: number;
}

function makeShards(count: number, seedBase: number): Shard[] {
  const shards: Shard[] = [];
  for (let i = 0; i < count; i++) {
    const r = Math.random();
    shards.push({
      heightFrac: Math.random(),
      angle: Math.random() * Math.PI * 2,
      radialJitter: 0.5 + Math.random() * 1.1,
      radiusReach: 0.7 + Math.pow(r, 1.4) * 1.6,
      spinSpeed: 0.5 + Math.random() * 1.8,
      bobPhase: Math.random() * Math.PI * 2,
      tumbleAxis: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(),
      tumbleSpeed: 2 + Math.random() * 6,
      scale: 0.35 + Math.random() * (0.55 + seedBase * 0.1),
    });
  }
  return shards;
}

function approach(current: number, target: number, dt: number, tau = 0.6) {
  const k = 1 - Math.exp(-dt / tau);
  return current + (target - current) * k;
}

function Variant({
  geometry,
  color,
  shards,
  funnelHandle,
}: {
  geometry: THREE.BufferGeometry;
  color: string;
  shards: Shard[];
  funnelHandle: React.MutableRefObject<FunnelHandle>;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const simTime = useRef(0);
  const eased = useRef({ maxRadius: 5, height: 26, spin: 1.2 });

  useLayoutEffect(() => {
    if (!ref.current) return;
    for (let i = 0; i < shards.length; i++) {
      dummy.position.set(0, -50, 0);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
    }
    ref.current.instanceMatrix.needsUpdate = true;
  }, [shards, dummy]);

  useFrame((_, rawDt) => {
    if (!ref.current) return;
    const dt = Math.min(rawDt, 0.033);
    const s = useSimStore.getState();
    const debrisNorm = s.debrisLoad / 100;

    const e = eased.current;
    e.maxRadius = approach(e.maxRadius, funnelHandle.current.maxRadius, dt);
    e.height = approach(e.height, funnelHandle.current.height, dt);
    e.spin = approach(e.spin, funnelHandle.current.spin, dt);

    if (s.playing) simTime.current += dt * s.simSpeed;
    const t = simTime.current;

    const visibleCount = Math.round(shards.length * Math.max(0.08, debrisNorm));
    ref.current.count = s.degradeLevel >= 1 ? Math.round(visibleCount * 0.5) : visibleCount;

    for (let i = 0; i < ref.current.count; i++) {
      const sh = shards[i];
      const h = sh.heightFrac * 0.85;
      const taperBase = Math.max(0.18, e.maxRadius * (0.25 + 0.85 * h));
      const radius = taperBase * sh.radialJitter * sh.radiusReach;
      const angle = sh.angle + t * e.spin * sh.spinSpeed * (1.3 - 0.4 * h);
      const y = h * e.height + Math.sin(t * 1.4 + sh.bobPhase) * 0.6;
      const lean = 0.12 * y;
      const x = Math.cos(angle) * radius + lean;
      const z = Math.sin(angle) * radius;

      dummy.position.set(x, y, z);
      dummy.rotation.set(
        sh.tumbleAxis.x * t * sh.tumbleSpeed,
        sh.tumbleAxis.y * t * sh.tumbleSpeed,
        sh.tumbleAxis.z * t * sh.tumbleSpeed,
      );
      dummy.scale.setScalar(sh.scale);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
    }
    ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[geometry, undefined, shards.length]} frustumCulled={false}>
      <meshStandardMaterial color={color} roughness={0.85} metalness={0.05} fog />
    </instancedMesh>
  );
}

export function Debris({ funnelHandle }: { funnelHandle: React.MutableRefObject<FunnelHandle> }) {
  const geometries = useMemo(
    () => [
      new THREE.TetrahedronGeometry(0.55, 0),
      new THREE.BoxGeometry(0.6, 0.15, 0.4),
      new THREE.ConeGeometry(0.3, 0.7, 5),
    ],
    [],
  );

  const shardSets = useMemo(
    () => [makeShards(COUNT_PER, 0), makeShards(COUNT_PER, 1), makeShards(COUNT_PER, 2)],
    [],
  );

  const colors = ['#8c7a56', '#6f5f42', '#a08a5f'];

  return (
    <group>
      {geometries.map((geo, i) => (
        <Variant key={i} geometry={geo} color={colors[i]} shards={shardSets[i]} funnelHandle={funnelHandle} />
      ))}
    </group>
  );
}
