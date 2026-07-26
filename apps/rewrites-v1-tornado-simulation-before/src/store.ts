import { create } from 'zustand';

interface TornadoState {
  intensity: number;
  setIntensity: (v: number) => void;
  debris: boolean;
  toggleDebris: () => void;
  lightning: boolean;
  toggleLightning: () => void;
  autoRotate: boolean;
  toggleAutoRotate: () => void;
  sound: boolean;
  toggleSound: () => void;
  strikes: number;
  registerStrike: () => void;
}

export const useTornadoStore = create<TornadoState>((set) => ({
  intensity: 1,
  setIntensity: (v) => set({ intensity: v }),
  debris: true,
  toggleDebris: () => set((s) => ({ debris: !s.debris })),
  lightning: true,
  toggleLightning: () => set((s) => ({ lightning: !s.lightning })),
  autoRotate: true,
  toggleAutoRotate: () => set((s) => ({ autoRotate: !s.autoRotate })),
  sound: false,
  toggleSound: () => set((s) => ({ sound: !s.sound })),
  strikes: 0,
  registerStrike: () => set((s) => ({ strikes: s.strikes + 1 })),
}));

export function efScale(intensity: number): string {
  // Map intensity 0.2..2.2 to a Fujita-scale-like readout
  if (intensity < 0.5) return 'EF0';
  if (intensity < 0.8) return 'EF1';
  if (intensity < 1.15) return 'EF2';
  if (intensity < 1.5) return 'EF3';
  if (intensity < 1.85) return 'EF4';
  return 'EF5';
}
