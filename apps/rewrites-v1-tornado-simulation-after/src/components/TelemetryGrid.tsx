import { useEffect, useRef, useState } from 'react';
import { useSimStore } from '../store';
import { efForWind, formatElapsed } from '../lib/ef';

function TelemetryCell({
  label,
  value,
  unit,
  size = 20,
  flashKey,
  valueColor,
}: {
  label: string;
  value: string;
  unit: string;
  size?: number;
  flashKey?: string;
  valueColor?: string;
}) {
  const [flash, setFlash] = useState(false);
  const prevKey = useRef(flashKey);

  useEffect(() => {
    if (flashKey !== undefined && prevKey.current !== flashKey) {
      prevKey.current = flashKey;
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 120);
      return () => clearTimeout(t);
    }
  }, [flashKey]);

  return (
    <div className={`rounded px-3 py-2 ${flash ? 'telemetry-flash' : ''}`}>
      <div className="text-[11px] font-medium uppercase text-text-muted" style={{ letterSpacing: '0.08em' }}>
        {label}
      </div>
      <div
        className="font-mono-tabular leading-tight"
        style={{ fontSize: size, color: valueColor ?? 'var(--color-text)' }}
      >
        {value}
        <span className="ml-1 text-[11px] font-normal text-text-muted">{unit}</span>
      </div>
    </div>
  );
}

export function TelemetryGrid({ layout = 'grid' }: { layout?: 'grid' | 'strip' }) {
  const telemetry = useSimStore((s) => s.telemetry);
  const ef = efForWind(telemetry.peakWind);
  const toneColor = ef.tone === 'ok' ? 'var(--color-ok)' : ef.tone === 'warn' ? 'var(--color-warn)' : 'var(--color-danger)';

  const badge = (
    <span
      className="rounded-[3px] px-1.5 py-0.5 text-[11px] font-medium"
      style={{ color: toneColor, border: `1px solid ${toneColor}`, letterSpacing: '0.04em' }}
    >
      {ef.code} · {ef.descriptor}
    </span>
  );

  const peakWind = (
    <TelemetryCell
      label="Peak wind"
      value={Math.round(telemetry.peakWind).toString()}
      unit="mph"
      size={28}
      flashKey={ef.code}
      valueColor="var(--color-accent)"
    />
  );
  const funnelHeight = (
    <TelemetryCell label="Funnel height" value={Math.round(telemetry.funnelHeight).toString()} unit="ft" />
  );
  const forwardSpeed = (
    <TelemetryCell label="Forward speed" value={telemetry.forwardSpeed.toFixed(1)} unit="mph" />
  );
  const elapsed = <TelemetryCell label="Elapsed" value={formatElapsed(telemetry.elapsed)} unit="mm:ss" />;

  const panelStyle: React.CSSProperties = {
    background: 'rgba(16,19,23,0.78)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: '1px solid var(--color-hairline)',
  };

  if (layout === 'strip') {
    return (
      <div className="flex items-stretch gap-1 overflow-x-auto rounded p-1.5" style={panelStyle}>
        <div>
          {peakWind}
          <div className="-mt-1 px-3 pb-1">{badge}</div>
        </div>
        {funnelHeight}
        <div className="hidden sm:block">{forwardSpeed}</div>
        {elapsed}
      </div>
    );
  }

  return (
    <div className="absolute bottom-6 left-6 grid w-[268px] grid-cols-2 gap-x-2 gap-y-1 rounded p-2 sm:w-[300px]" style={panelStyle}>
      <div>
        {peakWind}
        <div className="-mt-1 flex items-center gap-1.5 px-3 pb-1">{badge}</div>
      </div>
      {funnelHeight}
      <div className="hidden sm:block">{forwardSpeed}</div>
      {elapsed}
    </div>
  );
}
