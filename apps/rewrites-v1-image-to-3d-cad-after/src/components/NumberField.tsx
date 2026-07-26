import { useEffect, useRef, useState } from 'react';

interface Props {
  value: number;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  onBeginEdit: () => void;
  onLiveChange: (value: number) => void;
  onCommit: (value: number) => void;
  disabled?: boolean;
  ariaLabel?: string;
}

function formatNumber(v: number, precision: number): string {
  if (precision <= 0) return String(Math.round(v));
  return v.toFixed(precision).replace(/0+$/, '').replace(/\.$/, '');
}

export default function NumberField({ value, unit, min = -Infinity, max = Infinity, step = 1, precision = 2, onBeginEdit, onLiveChange, onCommit, disabled, ariaLabel }: Props) {
  const [text, setText] = useState(formatNumber(value, precision));
  const [editing, setEditing] = useState(false);
  const dragRef = useRef<{ startX: number; startValue: number; moved: boolean } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setText(formatNumber(value, precision));
  }, [value, editing, precision]);

  function clamp(v: number) {
    return Math.min(max, Math.max(min, v));
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (disabled) return;
    if ((e.target as HTMLElement).tagName === 'INPUT') return;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    onBeginEdit();
    dragRef.current = { startX: e.clientX, startValue: value, moved: false };
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current || disabled) return;
    const dx = e.clientX - dragRef.current.startX;
    if (Math.abs(dx) > 2) dragRef.current.moved = true;
    if (!dragRef.current.moved) return;
    const next = clamp(dragRef.current.startValue + dx * step);
    setText(formatNumber(next, precision));
    onLiveChange(next);
  }
  function onPointerUp() {
    if (!dragRef.current) return;
    const wasDrag = dragRef.current.moved;
    dragRef.current = null;
    if (wasDrag) {
      onCommit(clamp(parseFloat(text)));
    } else {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }

  function commitText() {
    const parsed = parseFloat(text);
    const v = isNaN(parsed) ? value : clamp(parsed);
    setText(formatNumber(v, precision));
    if (v !== value) onCommit(v);
    setEditing(false);
  }

  return (
    <div
      className="number-field"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={disabled ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
    >
      <input
        ref={inputRef}
        aria-label={ariaLabel}
        className="mono"
        value={text}
        disabled={disabled}
        onFocus={() => {
          setEditing(true);
          onBeginEdit();
        }}
        onChange={(e) => setText(e.target.value)}
        onBlur={commitText}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'Escape') {
            setText(formatNumber(value, precision));
            setEditing(false);
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
      {unit && <span className="unit">{unit}</span>}
    </div>
  );
}
