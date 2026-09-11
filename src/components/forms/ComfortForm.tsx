'use client';
import { useHouse } from '@/store/house';
import { displayTemp, parseTemp } from '@/lib/units';
import { Field, Num, Section } from '../ui';

export default function ComfortForm() {
  const { profile, update } = useHouse();
  const c = profile.comfort;
  const u = profile.units;
  return (
    <Section title="4. Your comfort envelope" subtitle={`${displayTemp(c.minC, u)}–${displayTemp(c.maxC, u)}°${u}`}>
      <Field label={`Coolest you want it (°${u})`}>
        <Num value={displayTemp(c.minC, u)} step={u === 'F' ? 1 : 0.5} onChange={(v) => v !== undefined && update((p) => ({ ...p, comfort: { ...p.comfort, minC: Math.min(parseTemp(v, u), p.comfort.maxC - 1) } }))} />
      </Field>
      <Field label={`Warmest you want it (°${u})`}>
        <Num value={displayTemp(c.maxC, u)} step={u === 'F' ? 1 : 0.5} onChange={(v) => v !== undefined && update((p) => ({ ...p, comfort: { ...p.comfort, maxC: Math.max(parseTemp(v, u), p.comfort.minC + 1) } }))} />
      </Field>
      <Field label="Max indoor humidity (%)" hint="Above this, we won't pull in outside air even if it is cooler.">
        <Num value={c.rhMax} min={20} max={90} onChange={(v) => v !== undefined && update((p) => ({ ...p, comfort: { ...p.comfort, rhMax: v } }))} />
      </Field>
      <Field label="Preference" hint={c.freshAirPreference >= 0.6 ? 'Open up whenever outside is pleasant.' : c.freshAirPreference <= 0.4 ? 'Only open when it actually helps.' : 'Balanced.'}>
        <div className="flex items-center gap-2 text-xs muted">
          <span>Efficiency</span>
          <input type="range" min={0} max={1} step={0.1} value={c.freshAirPreference} onChange={(e) => update((p) => ({ ...p, comfort: { ...p.comfort, freshAirPreference: Number(e.target.value) } }))} />
          <span>Fresh air</span>
        </div>
      </Field>
    </Section>
  );
}
