import type { Units } from '@/engine/types';

export const cToF = (c: number) => c * 1.8 + 32;
export const fToC = (f: number) => (f - 32) / 1.8;

export function fmtTemp(c: number, units: Units, digits = 0) {
  return units === 'F' ? `${cToF(c).toFixed(digits)}°F` : `${c.toFixed(digits === 0 ? 1 : digits)}°C`;
}
export function displayTemp(c: number, units: Units) {
  return units === 'F' ? Math.round(cToF(c)) : Math.round(c * 2) / 2;
}
export function parseTemp(v: number, units: Units) {
  return units === 'F' ? fToC(v) : v;
}
/** Countries that still use Fahrenheit day to day. */
export function unitsForCountry(cc: string | undefined): Units {
  return ['us', 'bs', 'bz', 'ky', 'pw', 'fm', 'mh', 'lr'].includes((cc ?? '').toLowerCase()) ? 'F' : 'C';
}
export function unitsFromLocale(): Units {
  if (typeof navigator === 'undefined') return 'F';
  const l = navigator.language?.toLowerCase() ?? '';
  return l.endsWith('-us') || l === 'en' ? 'F' : 'C';
}
