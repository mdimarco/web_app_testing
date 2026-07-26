import { useEffect, useRef, useState } from 'react';

export function LoadingCurtain({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0);
  const [fading, setFading] = useState(false);
  const startRef = useRef(performance.now());

  useEffect(() => {
    let raf = 0;
    const duration = 1100;
    const tick = (now: number) => {
      const elapsed = now - startRef.current;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setProgress(Math.round(eased * 100));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setFading(true);
        setTimeout(onDone, 500);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onDone]);

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center transition-opacity duration-500 ease-out"
      style={{ background: '#242a31', opacity: fading ? 0 : 1, pointerEvents: fading ? 'none' : 'auto' }}
    >
      <div className="flex w-[220px] flex-col items-center gap-4">
        <div className="h-px w-full" style={{ background: 'var(--color-hairline)' }}>
          <div
            className="h-px"
            style={{ width: `${progress}%`, background: 'var(--color-accent)', transition: 'width 80ms linear' }}
          />
        </div>
        <div className="font-mono-tabular text-[13px] text-text">{progress}%</div>
        <div className="text-[11px] font-medium uppercase text-text-muted" style={{ letterSpacing: '0.08em' }}>
          Compiling vortex shader
        </div>
      </div>
    </div>
  );
}
