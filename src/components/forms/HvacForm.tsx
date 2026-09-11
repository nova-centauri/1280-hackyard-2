'use client';
import { useHouse } from '@/store/house';
import { Check, Field, Num, Section, Select } from '../ui';
import type { HouseProfile } from '@/engine/types';

type V = HouseProfile['hvac'];

export default function HvacForm() {
  const { profile, update } = useHouse();
  const v = profile.hvac;
  const set = <K extends keyof V>(k: K, val: V[K]) => update((p) => ({ ...p, hvac: { ...p.hvac, [k]: val } }));
  const hasFan = v.wholeHouseFanCfm !== null;
  return (
    <Section title="3. Heating, cooling, fans">
      <Field label="Heating">
        <Select value={v.heating} onChange={(x) => set('heating', x)} options={[['furnace', 'Forced-air furnace'], ['boiler', 'Boiler + radiators'], ['heat_pump', 'Heat pump'], ['mini_split', 'Mini-split'], ['baseboard', 'Electric baseboard'], ['wood_stove', 'Wood stove'], ['none', 'None']]} />
      </Field>
      <Field label="Heating fuel">
        <Select value={v.fuel} onChange={(x) => set('fuel', x)} options={[['natural_gas', 'Natural gas'], ['propane', 'Propane'], ['oil', 'Oil'], ['electric', 'Electric'], ['wood_pellet', 'Wood / pellet']]} />
      </Field>
      <Field label="Cooling">
        <Select value={v.cooling} onChange={(x) => set('cooling', x)} options={[['central_ac', 'Central AC'], ['heat_pump', 'Heat pump'], ['mini_split', 'Mini-split'], ['window_units', 'Window units'], ['evaporative', 'Evaporative cooler'], ['none', 'None']]} />
      </Field>
      <Field label="Whole-house fan" hint="Pulls house air out through the attic. Enter its CFM; ~1 CFM per sq ft is small, 3 is big.">
        <div className="flex gap-2 items-center">
          <input type="checkbox" checked={hasFan} onChange={(e) => set('wholeHouseFanCfm', e.target.checked ? Math.round(profile.house.sqft * 1.5) : null)} />
          <Num value={v.wholeHouseFanCfm ?? ''} min={0} max={30000} step={100} placeholder="CFM" onChange={(x) => set('wholeHouseFanCfm', x ?? null)} />
        </div>
      </Field>
      <div className="sm:col-span-2 flex flex-wrap gap-4">
        <Check label="Attic fan (attic ventilator)" checked={v.atticFan} onChange={(x) => set('atticFan', x)} />
        <Check label="Ceiling fans" checked={v.ceilingFans} onChange={(x) => set('ceilingFans', x)} />
        <Check label="ERV / HRV" checked={v.erv} onChange={(x) => set('erv', x)} />
        <Check label="Dehumidifier" checked={v.dehumidifier} onChange={(x) => set('dehumidifier', x)} />
      </div>
    </Section>
  );
}
