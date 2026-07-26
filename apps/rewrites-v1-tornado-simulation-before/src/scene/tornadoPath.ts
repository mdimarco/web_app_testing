// Shared deterministic path so every scene element (funnel, debris, camera
// target) agrees on where the tornado currently is without needing refs.
export const FUNNEL_HEIGHT = 17;

export function tornadoCenterAt(t: number): { x: number; z: number } {
  return {
    x: Math.sin(t * 0.055) * 3.6 + Math.sin(t * 0.13 + 1.3) * 1.3,
    z: Math.cos(t * 0.045) * 3.1 + Math.cos(t * 0.09 + 0.6) * 1.1,
  };
}

export function funnelRadiusAt(t: number): number {
  const base = 0.55 + (5.4 - 0.55) * Math.pow(t, 1.15);
  const groundSkirt = 1.6 * Math.exp(-t * 9);
  return base + groundSkirt;
}
