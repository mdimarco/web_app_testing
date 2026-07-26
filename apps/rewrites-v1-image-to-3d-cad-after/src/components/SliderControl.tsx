import NumberField from './NumberField';

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  precision?: number;
  onBeginEdit: () => void;
  onLiveChange: (value: number) => void;
  onCommit: (value: number) => void;
  disabled?: boolean;
}

export default function SliderControl({ label, value, min, max, step = 1, unit, precision = 0, onBeginEdit, onLiveChange, onCommit, disabled }: Props) {
  return (
    <div className="slider-row">
      <div className="slider-top">
        <span className="field-label">{label}</span>
        <NumberField
          value={value}
          unit={unit}
          min={min}
          max={max}
          step={step}
          precision={precision}
          onBeginEdit={onBeginEdit}
          onLiveChange={onLiveChange}
          onCommit={onCommit}
          disabled={disabled}
          ariaLabel={label}
        />
      </div>
      <div className="slider-track-wrap">
        <input
          className="slider"
          type="range"
          aria-label={label}
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onPointerDown={onBeginEdit}
          onKeyDown={onBeginEdit}
          onInput={(e) => onLiveChange(parseFloat((e.target as HTMLInputElement).value))}
          onChange={(e) => onCommit(parseFloat((e.target as HTMLInputElement).value))}
        />
      </div>
    </div>
  );
}
