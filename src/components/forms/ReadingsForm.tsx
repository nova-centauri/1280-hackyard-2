'use client';
import { useHouse } from '@/store/house';
import { displayTemp, parseTemp } from '@/lib/units';
import { Field, Num, Section } from '../ui';

export default function ReadingsForm() {
  const { profile, update } = useHouse();
  const r = profile.readings;
  const u = profile.units;
  const set = (patch: Partial<typeof r>) => update((p) => ({ ...p, readings: { ...p.readings, ...patch, takenAt: new Date().toISOString() } }));
  return (
    <Section title="5. What your sensors say (optional)" subtitle="tightens the estimate" open={false}>
      <Field label={`Indoor temperature (°${u})`}>
        <Num value={r.indoorTempC !== undefined ? displayTemp(r.indoorTempC, u) : ''} onChange={(v) => set({ indoorTempC: v === undefined ? undefined : parseTemp(v, u) })} />
      </Field>
      <Field label="Indoor humidity (%)">
        <Num value={r.indoorRh ?? ''} min={0} max={100} onChange={(v) => set({ indoorRh: v })} />
      </Field>
      <Field label="CO₂ (ppm)" hint="Above 1000 we will suggest ventilating when outside air is clean.">
        <Num value={r.co2Ppm ?? ''} min={0} max={10000} step={50} onChange={(v) => set({ co2Ppm: v })} />
      </Field>
      <Field label="Indoor PM2.5 (µg/m³)">
        <Num value={r.pm25 ?? ''} min={0} max={1000} onChange={(v) => set({ pm25: v })} />
      </Field>
      <p className="sm:col-span-2 muted text-xs">Home Assistant push integration is coming: your sensors will post here automatically.</p>
    </Section>
  );
}
