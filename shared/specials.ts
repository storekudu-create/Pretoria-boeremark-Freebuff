import type { Special } from './types';

export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export type SpecialState = 'active' | 'scheduled' | 'expired' | 'inactive';

export function specialState(special: Special, now: Date = new Date()): SpecialState {
  if (!special.active) return 'inactive';
  const today = todayISO(now);
  if (special.startDate && today < special.startDate) return 'scheduled';
  if (special.endDate && today > special.endDate) return 'expired';
  return 'active';
}

export function activeSpecials(specials: Special[], now: Date = new Date()): Special[] {
  return specials.filter((s) => specialState(s, now) === 'active');
}
