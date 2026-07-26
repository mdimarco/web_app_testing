import { useEffect, useState } from 'react';

export type DropStatus = 'normal' | 'under-hour' | 'live' | 'post-drop';

export interface DropState {
  status: DropStatus;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const DROP_HOUR = 11;
const DROP_DAY = 4; // Thursday

function computeDropState(now: Date): DropState {
  const day = now.getDay();
  const isThursday = day === DROP_DAY;

  const dropStart = new Date(now);
  dropStart.setHours(DROP_HOUR, 0, 0, 0);
  const dropLiveEnd = new Date(dropStart);
  dropLiveEnd.setHours(DROP_HOUR + 1, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  if (isThursday && now >= dropStart && now < dropLiveEnd) {
    return { status: 'live', days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
  if (isThursday && now >= dropLiveEnd && now <= endOfDay) {
    return { status: 'post-drop', days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  let daysUntil = (DROP_DAY - day + 7) % 7;
  if (daysUntil === 0 && now >= dropStart) daysUntil = 7;

  const target = new Date(now);
  target.setHours(DROP_HOUR, 0, 0, 0);
  target.setDate(target.getDate() + daysUntil);

  const diffMs = Math.max(0, target.getTime() - now.getTime());
  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const status: DropStatus = diffMs <= 60 * 60 * 1000 ? 'under-hour' : 'normal';
  return { status, days, hours, minutes, seconds };
}

export function useCountdown(): DropState {
  const [state, setState] = useState(() => computeDropState(new Date()));

  useEffect(() => {
    const id = window.setInterval(() => {
      setState(computeDropState(new Date()));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  return state;
}

export function pad(n: number): string {
  return n.toString().padStart(2, '0');
}
