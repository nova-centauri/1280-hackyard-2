import type { Action } from '@/engine/types';

export const ACTION_META: Record<Action, { label: string; short: string; color: string }> = {
  closed: { label: 'Keep closed up', short: 'Closed', color: '#94a3b8' },
  windows: { label: 'Open the windows', short: 'Windows', color: '#22c55e' },
  whf: { label: 'Run the whole-house fan', short: 'WH fan', color: '#14b8a6' },
  ac: { label: 'Run the AC', short: 'AC', color: '#3b82f6' },
  heat: { label: 'Run the heat', short: 'Heat', color: '#f97316' },
  ventilate: { label: 'Ventilate briefly', short: 'Vent', color: '#eab308' },
};

export function hourLabel(iso: string) {
  const h = Number(iso.slice(11, 13));
  if (h === 0) return '12a';
  if (h < 12) return `${h}a`;
  if (h === 12) return '12p';
  return `${h - 12}p`;
}
export function dayLabel(iso: string) {
  const d = new Date(iso + ':00Z');
  return d.toLocaleDateString(undefined, { weekday: 'short', timeZone: 'UTC' });
}
