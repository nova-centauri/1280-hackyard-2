'use client';
import { useState } from 'react';
import { useHouse } from '@/store/house';
import { fmtTemp } from '@/lib/units';
import { ACTION_META, dayLabel, hourLabel } from './actionMeta';
import type { HourResult } from '@/engine/types';

export default function Timeline() {
  const { plan, profile } = useHouse();
  const [sel, setSel] = useState<number | null>(null);
  if (!plan) return null;
  const hours = plan.hours.slice(0, 48);

  // Contiguous runs of the same action become the readable schedule.
  const runs: { from: HourResult; to: HourResult; action: HourResult['action']; reason: string; n: number }[] = [];
  for (const h of hours) {
    const last = runs[runs.length - 1];
    if (last && last.action === h.action) { last.to = h; last.n++; }
    else runs.push({ from: h, to: h, action: h.action, reason: h.reason, n: 1 });
  }

  return (
    <div className="panel p-4 space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="font-medium">Next 48 hours</h3>
        <span className="muted text-xs">tap an hour for the reason</span>
      </div>
      <div className="overflow-x-auto -mx-1 px-1">
        <div className="flex gap-[2px]">
          {hours.map((h, i) => (
            <button
              key={h.time}
              onClick={() => setSel(sel === i ? null : i)}
              title={`${hourLabel(h.time)} ${ACTION_META[h.action].label}`}
              className="flex-1 rounded-sm"
              style={{ height: 34, background: ACTION_META[h.action].color, outline: sel === i ? '2px solid var(--ink)' : 'none', opacity: h.guarded ? 0.75 : 1 }}
            />
          ))}
        </div>
        <div className="flex">
          {hours.map((h, i) => (
            <div key={h.time} className="flex-1 text-[10px] muted text-center whitespace-nowrap">{i % 6 === 0 ? hourLabel(h.time) : ''}</div>
          ))}
        </div>
      </div>
      {sel !== null && hours[sel] && (
        <p className="text-sm">
          <b>{dayLabel(hours[sel].time)} {hourLabel(hours[sel].time)}</b> — {ACTION_META[hours[sel].action].label}. {hours[sel].reason} Inside ≈ {fmtTemp(hours[sel].indoorC, profile.units)}, outside {fmtTemp(hours[sel].outdoorC, profile.units)}.
        </p>
      )}
      <ul className="text-sm space-y-1">
        {runs.map((r) => (
          <li key={r.from.time} className="flex gap-2 items-start">
            <span className="mt-1 inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ background: ACTION_META[r.action].color }} />
            <span>
              <b>{dayLabel(r.from.time)} {hourLabel(r.from.time)}{r.n > 1 ? ` – ${dayLabel(r.to.time) !== dayLabel(r.from.time) ? dayLabel(r.to.time) + ' ' : ''}${hourLabel(r.to.time)}` : ''}:</b> {ACTION_META[r.action].label}.
              <span className="muted"> {r.reason}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
