import { useRef, useState } from 'react';

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}

export function SliderRow({ label, value, min, max, step, unit, onChange, format }: SliderRowProps) {
  const [active, setActive] = useState(false);
  const trackRef = useRef<HTMLInputElement>(null);
  const pct = ((value - min) / (max - min)) * 100;
  const display = format ? format(value) : value.toFixed(step < 1 ? 2 : 0);

  return (
    <div className="mb-5 last:mb-0">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span
          className="text-[11px] font-medium uppercase text-text-muted"
          style={{ letterSpacing: '0.08em' }}
        >
          {label}
        </span>
        <span
          className={`font-mono-tabular text-[13px] transition-colors duration-120 ${active ? 'text-text' : 'text-text-muted'}`}
        >
          {display}
          <span className="ml-1 text-[11px] text-text-muted">{unit}</span>
        </span>
      </div>
      <input
        ref={trackRef}
        type="range"
        className={`chase-slider ${active ? 'active' : ''}`}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        onPointerDown={() => setActive(true)}
        onPointerUp={() => setActive(false)}
        onBlur={() => setActive(false)}
        style={{
          // @ts-expect-error custom property for track fill
          '--track-fill': `linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) ${pct}%, var(--color-hairline) ${pct}%, var(--color-hairline) 100%)`,
        }}
        aria-label={label}
      />
    </div>
  );
}
