import { Wind, Zap, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { useTornadoStore, efScale } from '../store';

export default function ControlPanel() {
  const intensity = useTornadoStore((s) => s.intensity);
  const setIntensity = useTornadoStore((s) => s.setIntensity);
  const debris = useTornadoStore((s) => s.debris);
  const toggleDebris = useTornadoStore((s) => s.toggleDebris);
  const lightning = useTornadoStore((s) => s.lightning);
  const toggleLightning = useTornadoStore((s) => s.toggleLightning);
  const autoRotate = useTornadoStore((s) => s.autoRotate);
  const toggleAutoRotate = useTornadoStore((s) => s.toggleAutoRotate);
  const sound = useTornadoStore((s) => s.sound);
  const toggleSound = useTornadoStore((s) => s.toggleSound);

  return (
    <div className="hud-panel rounded-lg px-4 py-3.5 w-[260px] sm:w-[300px] text-radar-green">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[11px] tracking-widest text-white/50">
          VORTEX INTENSITY
        </span>
        <span className="font-mono text-xs font-bold text-amber-warn">
          {efScale(intensity)} · {intensity.toFixed(2)}×
        </span>
      </div>
      <input
        type="range"
        className="vortex-slider"
        min={0.25}
        max={2.2}
        step={0.01}
        value={intensity}
        onChange={(e) => setIntensity(Number(e.target.value))}
        aria-label="Vortex intensity"
      />
      <div className="flex justify-between font-mono text-[10px] text-white/35 mt-1 mb-3">
        <span>CALM</span>
        <span>VIOLENT</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <ToggleButton
          active={debris}
          onClick={toggleDebris}
          icon={<Wind size={14} />}
          label="Debris"
        />
        <ToggleButton
          active={lightning}
          onClick={toggleLightning}
          icon={<Zap size={14} />}
          label="Lightning"
        />
        <ToggleButton
          active={autoRotate}
          onClick={toggleAutoRotate}
          icon={<RotateCcw size={14} />}
          label="Orbit"
        />
        <ToggleButton
          active={sound}
          onClick={toggleSound}
          icon={sound ? <Volume2 size={14} /> : <VolumeX size={14} />}
          label="Wind SFX"
        />
      </div>
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-active={active}
      className="hud-btn flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-mono text-[11px] cursor-pointer"
    >
      {icon}
      {label}
    </button>
  );
}
