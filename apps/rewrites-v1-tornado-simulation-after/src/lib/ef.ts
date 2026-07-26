export type Tone = 'ok' | 'warn' | 'danger';

export interface EfRating {
  code: string;
  descriptor: string;
  tone: Tone;
}

export function efForWind(mph: number): EfRating {
  if (mph < 65) return { code: 'SUB-EF', descriptor: 'FORMING', tone: 'ok' };
  if (mph < 86) return { code: 'EF0', descriptor: 'WEAK', tone: 'ok' };
  if (mph < 111) return { code: 'EF1', descriptor: 'MODERATE', tone: 'ok' };
  if (mph < 136) return { code: 'EF2', descriptor: 'STRONG', tone: 'warn' };
  if (mph < 166) return { code: 'EF3', descriptor: 'VIOLENT', tone: 'warn' };
  if (mph < 201) return { code: 'EF4', descriptor: 'EXTREME', tone: 'danger' };
  return { code: 'EF5', descriptor: 'CATASTROPHIC', tone: 'danger' };
}

export function formatElapsed(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}
