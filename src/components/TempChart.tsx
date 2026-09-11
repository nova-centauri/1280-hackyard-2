'use client';
import { useHouse } from '@/store/house';
import { cToF } from '@/lib/units';
import { hourLabel } from './actionMeta';

/** Indoor temperature projection: follow the plan vs do nothing vs closed-up thermostat. */
export default function TempChart() {
  const { plan, profile } = useHouse();
  if (!plan) return null;
  const n = Math.min(48, plan.hours.length);
  const conv = (c: number) => (profile.units === 'F' ? cToF(c) : c);
  const series = {
    plan: plan.hours.slice(0, n).map((h) => conv(h.indoorC)),
    nothing: plan.doNothingC.slice(0, n).map(conv),
    closed: plan.closedHvacC.slice(0, n).map(conv),
    out: plan.hours.slice(0, n).map((h) => conv(h.outdoorC)),
  };
  const lo = conv(profile.comfort.minC), hi = conv(profile.comfort.maxC);
  const all = [...series.plan, ...series.nothing, ...series.closed, ...series.out, lo, hi];
  const min = Math.floor(Math.min(...all) - 1), max = Math.ceil(Math.max(...all) + 1);
  const W = 640, H = 200, padL = 30, padB = 18, padT = 8;
  const x = (i: number) => padL + (i / (n - 1)) * (W - padL - 4);
  const y = (v: number) => padT + (1 - (v - min) / (max - min)) * (H - padT - padB);
  const path = (arr: number[]) => arr.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const ticks = [];
  for (let v = Math.ceil(min / 5) * 5; v <= max; v += 5) ticks.push(v);

  return (
    <div className="panel p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="font-medium">Indoor temperature, projected</h3>
        <span className="muted text-xs">°{profile.units}</span>
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 420 }} role="img" aria-label="Projected indoor temperature">
          <rect x={padL} y={y(hi)} width={W - padL - 4} height={Math.max(0, y(lo) - y(hi))} fill="var(--good)" opacity={0.12} />
          {ticks.map((v) => (
            <g key={v}>
              <line x1={padL} x2={W - 4} y1={y(v)} y2={y(v)} stroke="var(--line)" />
              <text x={padL - 4} y={y(v) + 4} fontSize={10} textAnchor="end" fill="var(--muted)">{v}</text>
            </g>
          ))}
          {plan.hours.slice(0, n).map((h, i) => (i % 6 === 0 ? <text key={h.time} x={x(i)} y={H - 4} fontSize={10} textAnchor="middle" fill="var(--muted)">{hourLabel(h.time)}</text> : null))}
          <path d={path(series.out)} fill="none" stroke="var(--muted)" strokeWidth={1.2} strokeDasharray="3 3" />
          <path d={path(series.nothing)} fill="none" stroke="var(--warm)" strokeWidth={1.5} opacity={0.6} />
          <path d={path(series.closed)} fill="none" stroke="var(--cool)" strokeWidth={1.5} opacity={0.6} />
          <path d={path(series.plan)} fill="none" stroke="var(--ink)" strokeWidth={2.2} />
        </svg>
      </div>
      <div className="flex flex-wrap gap-3 text-xs muted mt-1">
        <Legend color="var(--ink)" label="Follow the plan" />
        <Legend color="var(--warm)" label="Do nothing" />
        <Legend color="var(--cool)" label="Closed up on the thermostat" />
        <Legend color="var(--muted)" label="Outside" dashed />
        <Legend color="var(--good)" label="Comfort band" />
      </div>
    </div>
  );
}
function Legend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span style={{ width: 16, borderTop: `2px ${dashed ? 'dashed' : 'solid'} ${color}` }} />
      {label}
    </span>
  );
}
