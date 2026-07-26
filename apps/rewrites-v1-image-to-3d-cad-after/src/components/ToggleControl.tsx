interface Props {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}

export default function ToggleControl({ label, value, onChange, disabled }: Props) {
  return (
    <div className="toggle-row">
      <span className="field-label">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={label}
        className={`toggle ${value ? 'on' : ''}`}
        disabled={disabled}
        onClick={() => onChange(!value)}
      >
        <span className="knob" />
      </button>
    </div>
  );
}
