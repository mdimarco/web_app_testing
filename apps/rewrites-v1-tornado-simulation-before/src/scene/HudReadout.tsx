import { useEffect, useState } from 'react';
import { tornadoCenterAt } from './tornadoPath';
import { useTornadoStore, efScale } from '../store';

const START = 38.65 + Math.random() * 0.4;
const STARTLON = -97.4 - Math.random() * 0.4;

export default function HudReadout() {
  const intensity = useTornadoStore((s) => s.intensity);
  const strikes = useTornadoStore((s) => s.strikes);
  const [pos, setPos] = useState({ x: 0, z: 0 });

  useEffect(() => {
    const startTime = performance.now();
    const id = setInterval(() => {
      const elapsed = (performance.now() - startTime) / 1000;
      setPos(tornadoCenterAt(elapsed));
    }, 400);
    return () => clearInterval(id);
  }, []);

  const windMph = Math.round(65 + intensity * 110);
  const pressure = Math.round(1013 - intensity * 42);
  const lat = (START + pos.z * 0.0009).toFixed(4);
  const lon = (STARTLON + pos.x * 0.0009).toFixed(4);

  return (
    <div className="hud-panel rounded-lg px-4 py-3 text-radar-green font-mono text-[11px] sm:text-xs leading-relaxed w-[168px] sm:w-[190px]">
      <div className="flex items-center justify-between mb-1.5 border-b border-white/10 pb-1.5">
        <span className="text-white/50 tracking-wide">EF-SCALE</span>
        <span className="text-amber-warn font-bold text-sm">{efScale(intensity)}</span>
      </div>
      <Row label="WIND" value={`${windMph} mph`} />
      <Row label="PRESSURE" value={`${pressure} hPa`} />
      <Row label="LAT" value={`${lat}°N`} />
      <Row label="LON" value={`${Math.abs(Number(lon))}°W`} />
      <Row label="STRIKES" value={String(strikes)} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/40">{label}</span>
      <span className="text-radar-green">{value}</span>
    </div>
  );
}
