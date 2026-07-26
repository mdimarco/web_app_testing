import { useCountdown, pad } from '../hooks/useCountdown';

interface Props {
  className?: string;
}

export default function CountdownDisplay({ className = '' }: Props) {
  const state = useCountdown();

  if (state.status === 'live') {
    return (
      <span className={`font-mono text-[13px] tracking-[0.08em] uppercase text-accent tnum ${className}`}>
        Live now
      </span>
    );
  }

  if (state.status === 'post-drop') {
    return (
      <span className={`font-mono text-[13px] tracking-[0.08em] uppercase text-ink-muted tnum ${className}`}>
        Next drop: Thu 11:00
      </span>
    );
  }

  const digits = `${pad(state.days)}:${pad(state.hours)}:${pad(state.minutes)}:${pad(state.seconds)}`;

  if (state.status === 'under-hour') {
    return (
      <span
        className={`inline-flex items-center gap-2 font-mono text-[13px] tracking-[0.08em] uppercase tnum ${className}`}
      >
        <span className="text-ink-muted hidden sm:inline">Drop in</span>
        <span className="bg-accent text-ink px-1.5 py-0.5">{digits}</span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-2 font-mono text-[13px] tracking-[0.08em] uppercase tnum ${className}`}>
      <span className="text-ink-muted hidden sm:inline">Drop in</span>
      <span className="text-ink">{digits}</span>
    </span>
  );
}
