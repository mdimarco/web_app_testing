import { useEffect, useRef } from 'react';
import { useSimStore } from '../store';

export function useTelemetryDriver() {
  const elapsedRef = useRef(0);
  const lastRef = useRef(performance.now());

  useEffect(() => {
    const unsub = useSimStore.subscribe((state, prev) => {
      if (state.resetToken !== prev.resetToken) {
        elapsedRef.current = 0;
        lastRef.current = performance.now();
      }
    });

    const interval = setInterval(() => {
      const now = performance.now();
      let dt = (now - lastRef.current) / 1000;
      lastRef.current = now;
      dt = Math.min(dt, 0.5);

      const s = useSimStore.getState();
      if (s.playing) {
        elapsedRef.current += dt * s.simSpeed;
      }
      const t = elapsedRef.current;

      const windNorm = s.windShear / 120;
      const debrisNorm = s.debrisLoad / 100;
      const widthNorm = (s.funnelWidth - 40) / (1200 - 40);

      const peakWind = Math.max(
        0,
        28 + s.windShear * 1.85 + Math.sin(t * 0.7) * 4 + Math.sin(t * 1.9 + 1.2) * 2.4,
      );
      const funnelHeight = Math.max(
        180,
        (18 + windNorm * 14) * 34 + Math.sin(t * 0.5) * 12 + widthNorm * 30,
      );
      const forwardSpeed = Math.max(
        0,
        16 + Math.sin(t * 0.15) * 9 + windNorm * 6 + debrisNorm * 1.5,
      );

      useSimStore.getState().setTelemetry({
        peakWind,
        funnelHeight,
        forwardSpeed,
        elapsed: t,
      });
    }, 166);

    return () => {
      clearInterval(interval);
      unsub();
    };
  }, []);
}
