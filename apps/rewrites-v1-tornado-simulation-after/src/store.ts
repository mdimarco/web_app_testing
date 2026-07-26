import { create } from 'zustand';

export type Quality = 'high' | 'low';

export interface TelemetrySnapshot {
  peakWind: number;
  funnelHeight: number;
  forwardSpeed: number;
  elapsed: number;
}

interface SimState {
  windShear: number;
  funnelWidth: number;
  debrisLoad: number;
  simSpeed: number;
  setWindShear: (v: number) => void;
  setFunnelWidth: (v: number) => void;
  setDebrisLoad: (v: number) => void;
  setSimSpeed: (v: number) => void;

  playing: boolean;
  togglePlaying: () => void;
  setPlaying: (v: boolean) => void;

  // 0 = full quality, 1 = debris halved, 2 = + condensation points halved, 3 = + bloom off
  degradeLevel: 0 | 1 | 2 | 3;
  autoDegraded: boolean;
  degradeReason: string | null;
  quality: Quality;
  setDegradeLevel: (level: 0 | 1 | 2 | 3, auto?: boolean, reason?: string | null) => void;
  setQuality: (q: Quality) => void;

  telemetry: TelemetrySnapshot;
  setTelemetry: (t: TelemetrySnapshot) => void;

  resetToken: number;
  reset: () => void;
}

const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const DEFAULTS = {
  windShear: 78,
  funnelWidth: 320,
  debrisLoad: 45,
  simSpeed: prefersReducedMotion ? 0.6 : 1,
};

const DEGRADE_REASONS: Record<number, string> = {
  1: 'Debris shard count halved to hold frame rate.',
  2: 'Debris and condensation point count halved to hold frame rate.',
  3: 'Debris, condensation points halved and bloom disabled to hold frame rate.',
};

export const useSimStore = create<SimState>((set) => ({
  ...DEFAULTS,
  setWindShear: (v) => set({ windShear: v }),
  setFunnelWidth: (v) => set({ funnelWidth: v }),
  setDebrisLoad: (v) => set({ debrisLoad: v }),
  setSimSpeed: (v) => set({ simSpeed: v }),

  playing: true,
  togglePlaying: () => set((s) => ({ playing: !s.playing })),
  setPlaying: (v) => set({ playing: v }),

  degradeLevel: 0,
  autoDegraded: false,
  degradeReason: null,
  quality: 'high',
  setDegradeLevel: (level, auto = false, reason = null) =>
    set({
      degradeLevel: level,
      autoDegraded: auto,
      degradeReason: reason ?? DEGRADE_REASONS[level] ?? null,
      quality: level === 0 ? 'high' : 'low',
    }),
  setQuality: (q) =>
    set({
      quality: q,
      degradeLevel: q === 'high' ? 0 : 3,
      autoDegraded: false,
      degradeReason: q === 'low' ? DEGRADE_REASONS[3] : null,
    }),

  telemetry: { peakWind: 0, funnelHeight: 0, forwardSpeed: 0, elapsed: 0 },
  setTelemetry: (t) => set({ telemetry: t }),

  resetToken: 0,
  reset: () =>
    set((s) => ({
      ...DEFAULTS,
      playing: true,
      resetToken: s.resetToken + 1,
      telemetry: { peakWind: 0, funnelHeight: 0, forwardSpeed: 0, elapsed: 0 },
    })),
}));
