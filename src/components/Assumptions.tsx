'use client';
import { useHouse } from '@/store/house';
import { conductances, thermalCapacityJPerK, type DerivedParams, type Geometry } from '@/engine';
import { Field, Num, Section } from './ui';

const ROWS: { key: keyof DerivedParams; label: string; hint: string; step: number }[] = [
  { key: 'ach50', label: 'Air leakage (ACH50)', hint: 'Blower-door number. Lower is tighter. New builds ≈ 3, 1970s ≈ 10.', step: 0.5 },
  { key: 'wallR', label: 'Wall insulation (R)', hint: 'Imperial R-value of the walls.', step: 1 },
  { key: 'atticR', label: 'Attic / roof insulation (R)', hint: 'R-30 is typical for 2000s, R-49 for new.', step: 1 },
  { key: 'shgc', label: 'Window solar gain (SHGC)', hint: '0.7 single pane, 0.4 double, 0.3 low-e.', step: 0.05 },
  { key: 'glazingFraction', label: 'Glass fraction of walls', hint: '0.15 is typical.', step: 0.01 },
  { key: 'massKJPerM2K', label: 'Thermal mass (kJ/m²K)', hint: '110 wood frame, 260 masonry, 370 stone.', step: 10 },
  { key: 'openWindowAch', label: 'Open-window airflow (ACH)', hint: 'Air changes per hour with windows open in a light breeze.', step: 0.5 },
  { key: 'internalGainsW', label: 'Internal heat (W)', hint: 'People, cooking, electronics.', step: 50 },
];

export default function Assumptions({ params, geometry }: { params: DerivedParams; geometry: Geometry }) {
  const { profile, update } = useHouse();
  const c = conductances(params, geometry, profile);
  const total = c.uaAboveGround + c.uaCeiling + c.uaFloor;
  const tau = thermalCapacityJPerK(params, geometry) / total / 3600;
  return (
    <Section title="What we assumed about your house" subtitle="edit anything you know better" open={false}>
      <p className="sm:col-span-2 text-sm muted">
        From what you entered: natural air leakage ≈ {params.naturalAch} air changes per hour, whole envelope ≈ {Math.round(total)} W/K, and a thermal time constant of about {tau.toFixed(0)} hours (how long the house takes to drift roughly two-thirds of the way toward outside).
        {profile.hvac.wholeHouseFanCfm ? ` Your whole-house fan moves ≈ ${params.wholeHouseFanAch} air changes per hour.` : ''}
      </p>
      {ROWS.map((r) => (
        <Field key={r.key} label={r.label} hint={r.hint}>
          <div className="flex gap-2 items-center">
            <Num value={params[r.key]} step={r.step} onChange={(v) => update((p) => ({ ...p, overrides: { ...p.overrides, [r.key]: v } }))} />
            {profile.overrides[r.key] !== undefined && (
              <button className="btn text-xs" onClick={() => update((p) => { const o = { ...p.overrides }; delete o[r.key]; return { ...p, overrides: o }; })}>reset</button>
            )}
          </div>
        </Field>
      ))}
    </Section>
  );
}
