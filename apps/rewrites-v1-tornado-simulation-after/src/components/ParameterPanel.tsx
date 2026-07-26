import { useSimStore } from '../store';
import { SliderRow } from './SliderRow';

export function ParameterControls() {
  const windShear = useSimStore((s) => s.windShear);
  const funnelWidth = useSimStore((s) => s.funnelWidth);
  const debrisLoad = useSimStore((s) => s.debrisLoad);
  const simSpeed = useSimStore((s) => s.simSpeed);
  const setWindShear = useSimStore((s) => s.setWindShear);
  const setFunnelWidth = useSimStore((s) => s.setFunnelWidth);
  const setDebrisLoad = useSimStore((s) => s.setDebrisLoad);
  const setSimSpeed = useSimStore((s) => s.setSimSpeed);

  return (
    <div>
      <SliderRow
        label="Wind shear"
        value={windShear}
        min={0}
        max={120}
        step={1}
        unit="mph"
        onChange={setWindShear}
      />
      <SliderRow
        label="Funnel width"
        value={funnelWidth}
        min={40}
        max={1200}
        step={5}
        unit="ft"
        onChange={setFunnelWidth}
      />
      <SliderRow
        label="Debris load"
        value={debrisLoad}
        min={0}
        max={100}
        step={1}
        unit="%"
        onChange={setDebrisLoad}
      />
      <SliderRow
        label="Sim speed"
        value={simSpeed}
        min={0.25}
        max={2}
        step={0.05}
        unit="×"
        format={(v) => v.toFixed(2)}
        onChange={setSimSpeed}
      />
    </div>
  );
}

export function ParameterPanel() {
  return (
    <div
      className="absolute right-6 top-[128px] w-[312px] max-h-[70dvh] overflow-y-auto rounded p-6"
      style={{
        background: 'rgba(16,19,23,0.92)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid var(--color-hairline)',
      }}
    >
      <h2
        className="m-0 mb-5 text-[20px] font-bold text-text"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        Telemetry Control
      </h2>
      <ParameterControls />
    </div>
  );
}
