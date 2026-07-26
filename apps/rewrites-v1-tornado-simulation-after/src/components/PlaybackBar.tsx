import { Pause, Play, RotateCcw, Gauge } from 'lucide-react';
import { useSimStore } from '../store';

function IconButton({
  onClick,
  label,
  children,
  active,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-11 min-w-11 items-center justify-center gap-1.5 rounded px-3 text-text transition-colors duration-120 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      style={{ border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-hairline)'}` }}
    >
      {children}
    </button>
  );
}

export function PlaybackBar() {
  const playing = useSimStore((s) => s.playing);
  const togglePlaying = useSimStore((s) => s.togglePlaying);
  const reset = useSimStore((s) => s.reset);
  const quality = useSimStore((s) => s.quality);
  const autoDegraded = useSimStore((s) => s.autoDegraded);
  const degradeReason = useSimStore((s) => s.degradeReason);
  const setQuality = useSimStore((s) => s.setQuality);

  const qualityTooltip = quality === 'low' && degradeReason ? degradeReason : 'Toggle render quality';

  return (
    <div
      className="absolute bottom-6 right-6 flex items-center gap-2 rounded p-1.5"
      style={{
        background: 'rgba(16,19,23,0.78)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid var(--color-hairline)',
      }}
    >
      <IconButton onClick={togglePlaying} label={playing ? 'Pause' : 'Play'}>
        {playing ? <Pause size={16} /> : <Play size={16} />}
      </IconButton>
      <IconButton onClick={reset} label="Reset simulation">
        <RotateCcw size={16} />
      </IconButton>
      <button
        type="button"
        onClick={() => setQuality(quality === 'high' ? 'low' : 'high')}
        title={qualityTooltip}
        aria-label="Toggle quality"
        className="flex h-11 min-w-11 items-center justify-center gap-1.5 rounded px-3 text-[11px] font-medium uppercase transition-colors duration-120 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        style={{
          letterSpacing: '0.08em',
          border: '1px solid var(--color-hairline)',
          color: quality === 'low' && autoDegraded ? 'var(--color-warn)' : 'var(--color-text)',
        }}
      >
        <Gauge size={14} />
        {quality === 'high' ? 'HIGH' : 'LOW'}
      </button>
    </div>
  );
}
