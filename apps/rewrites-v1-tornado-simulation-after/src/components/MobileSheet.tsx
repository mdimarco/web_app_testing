import { useState } from 'react';
import { ChevronUp } from 'lucide-react';
import { useSimStore } from '../store';
import { ParameterControls } from './ParameterPanel';

export function MobileSheet() {
  const [open, setOpen] = useState(false);
  const [duration, setDuration] = useState(240);
  const peakWind = useSimStore((s) => s.telemetry.peakWind);

  const toggle = () => {
    setDuration(open ? 170 : 240);
    setOpen((o) => !o);
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 rounded-t px-5 pb-5 pt-2"
      style={{
        background: 'rgba(16,19,23,0.94)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderTop: '1px solid var(--color-hairline)',
        borderLeft: '1px solid var(--color-hairline)',
        borderRight: '1px solid var(--color-hairline)',
        maxHeight: open ? '70dvh' : '56px',
        overflowY: open ? 'auto' : 'hidden',
        transition: `max-height ${duration}ms cubic-bezier(0.2, 0, 0, 1)`,
      }}
    >
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={open ? 'Collapse telemetry controls' : 'Expand telemetry controls'}
        className="flex h-[44px] w-full items-center justify-between gap-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <span className="flex items-center gap-3">
          <span className="h-1 w-9 rounded-full" style={{ background: 'var(--color-hairline)' }} />
          <span className="text-[11px] font-medium uppercase text-text-muted" style={{ letterSpacing: '0.08em' }}>
            Peak wind
          </span>
          <span className="font-mono-tabular text-[20px] text-accent">{Math.round(peakWind)}</span>
          <span className="text-[11px] text-text-muted">mph</span>
        </span>
        <ChevronUp size={18} className="text-text-muted transition-transform duration-120" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </button>
      <div className="mt-3">
        <h2 className="m-0 mb-4 text-[20px] font-bold text-text" style={{ fontFamily: 'var(--font-display)' }}>
          Telemetry Control
        </h2>
        <ParameterControls />
      </div>
    </div>
  );
}
