'use client';
import { useHouse } from '@/store/house';
import { Check, Field, Num, Section, Select } from '../ui';
import type { HouseProfile } from '@/engine/types';

type H = HouseProfile['house'];

export default function HouseForm() {
  const { profile, update } = useHouse();
  const h = profile.house;
  const set = <K extends keyof H>(k: K, v: H[K]) => update((p) => ({ ...p, house: { ...p.house, [k]: v } }));
  return (
    <Section title="2. The house" subtitle={`${h.yearBuilt} · ${h.sqft.toLocaleString()} sq ft · ${h.floors} floor${h.floors > 1 ? 's' : ''}`}>
      <Field label="Year built" hint="Sets the baseline for insulation and air-tightness.">
        <Num value={h.yearBuilt} min={1600} max={2100} onChange={(v) => v !== undefined && set('yearBuilt', v)} />
      </Field>
      <Field label="Construction">
        <Select value={h.construction} onChange={(v) => set('construction', v)} options={[['wood_frame', 'Wood frame'], ['brick', 'Brick'], ['concrete_block', 'Concrete / cinder block'], ['stone', 'Stone'], ['steel_sip', 'Steel / SIP panels'], ['straw_bale', 'Straw bale']]} />
      </Field>
      <Field label="Finished square feet" hint="All floors together.">
        <Num value={h.sqft} min={100} max={30000} step={50} onChange={(v) => v !== undefined && set('sqft', v)} />
      </Field>
      <Field label="Floors">
        <Num value={h.floors} min={1} max={6} onChange={(v) => v !== undefined && set('floors', v)} />
      </Field>
      <Field label="Foundation">
        <Select value={h.foundation} onChange={(v) => set('foundation', v)} options={[['basement', 'Basement'], ['crawlspace', 'Crawlspace'], ['slab', 'Slab on grade']]} />
      </Field>
      <Field label="Roof">
        <Select value={h.roof} onChange={(v) => set('roof', v)} options={[['attic_vented', 'Attic, vented'], ['attic_unvented', 'Attic, unvented'], ['cathedral', 'Cathedral ceiling'], ['flat', 'Flat roof']]} />
      </Field>
      <Field label="Windows">
        <Select value={h.windows} onChange={(v) => set('windows', v)} options={[['single', 'Single pane'], ['double', 'Double pane'], ['triple', 'Triple pane']]} />
      </Field>
      <Field label="Side with the most glass" hint="Which way the biggest windows face.">
        <Select value={h.glassSide} onChange={(v) => set('glassSide', v)} options={[['N', 'North'], ['NE', 'Northeast'], ['E', 'East'], ['SE', 'Southeast'], ['S', 'South'], ['SW', 'Southwest'], ['W', 'West'], ['NW', 'Northwest']]} />
      </Field>
      <Field label="Shade on the sunny side">
        <Select value={h.shading} onChange={(v) => set('shading', v)} options={[['none', 'None'], ['partial', 'Some trees or awnings'], ['heavy', 'Heavily shaded']]} />
      </Field>
      <Field label="People at home">
        <Num value={h.occupants} min={0} max={30} onChange={(v) => v !== undefined && set('occupants', v)} />
      </Field>
      <div className="sm:col-span-2 flex flex-wrap gap-4">
        <Check label="Insulation added since built" checked={h.retrofits.insulation} onChange={(v) => set('retrofits', { ...h.retrofits, insulation: v })} />
        <Check label="Air-sealed" checked={h.retrofits.airSealed} onChange={(v) => set('retrofits', { ...h.retrofits, airSealed: v })} />
        <Check label="Windows replaced" checked={h.retrofits.newWindows} onChange={(v) => set('retrofits', { ...h.retrofits, newWindows: v })} />
      </div>
    </Section>
  );
}
