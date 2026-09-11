import { z } from 'zod';
import type { HouseProfile } from '@/engine/types';
import { DEFAULT_PROFILE } from '@/engine/defaults';

const num = (min: number, max: number) => z.number().min(min).max(max);

export const profileSchema = z.object({
  version: z.literal(1),
  units: z.enum(['F', 'C']),
  location: z
    .object({
      lat: num(-90, 90),
      lon: num(-180, 180),
      timezone: z.string().max(64),
      countryCode: z.string().max(2),
      label: z.string().max(120),
    })
    .nullable(),
  house: z.object({
    yearBuilt: num(1600, 2100),
    construction: z.enum(['wood_frame', 'brick', 'concrete_block', 'stone', 'steel_sip', 'straw_bale']),
    floors: num(1, 6),
    sqft: num(100, 30000),
    foundation: z.enum(['basement', 'crawlspace', 'slab']),
    roof: z.enum(['attic_vented', 'attic_unvented', 'flat', 'cathedral']),
    windows: z.enum(['single', 'double', 'triple']),
    glassSide: z.enum(['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']),
    retrofits: z.object({ insulation: z.boolean(), airSealed: z.boolean(), newWindows: z.boolean() }),
    shading: z.enum(['none', 'partial', 'heavy']),
    occupants: num(0, 30),
  }),
  hvac: z.object({
    heating: z.enum(['furnace', 'boiler', 'heat_pump', 'mini_split', 'baseboard', 'wood_stove', 'none']),
    fuel: z.enum(['natural_gas', 'propane', 'oil', 'electric', 'wood_pellet']),
    cooling: z.enum(['central_ac', 'heat_pump', 'mini_split', 'window_units', 'evaporative', 'none']),
    wholeHouseFanCfm: num(0, 30000).nullable(),
    atticFan: z.boolean(),
    ceilingFans: z.boolean(),
    erv: z.boolean(),
    dehumidifier: z.boolean(),
  }),
  comfort: z.object({
    minC: num(5, 35),
    maxC: num(5, 40),
    rhMax: num(20, 90),
    freshAirPreference: num(0, 1),
  }),
  readings: z.object({
    indoorTempC: num(-20, 60).optional(),
    indoorRh: num(0, 100).optional(),
    co2Ppm: num(0, 10000).optional(),
    pm25: num(0, 1000).optional(),
    takenAt: z.string().max(40).optional(),
  }),
  overrides: z
    .object({
      ach50: num(0.1, 60).optional(),
      naturalAch: num(0.01, 5).optional(),
      wallR: num(1, 80).optional(),
      atticR: num(1, 100).optional(),
      windowU: num(0.5, 8).optional(),
      shgc: num(0.1, 0.9).optional(),
      glazingFraction: num(0.02, 0.6).optional(),
      massKJPerM2K: num(40, 600).optional(),
      openWindowAch: num(0.5, 20).optional(),
      wholeHouseFanAch: num(0, 40).optional(),
      internalGainsW: num(0, 5000).optional(),
    })
    .partial(),
});

export function validateProfile(input: unknown): { ok: true; value: HouseProfile } | { ok: false; error: string } {
  const r = profileSchema.safeParse(input);
  if (!r.success) return { ok: false, error: r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') };
  const v = r.data as HouseProfile;
  if (v.comfort.minC >= v.comfort.maxC) return { ok: false, error: 'comfort.minC must be below comfort.maxC' };
  return { ok: true, value: v };
}

/** Merge a possibly-partial or older saved object onto the defaults so the app never sees missing keys. */
export function coerceProfile(input: unknown): HouseProfile {
  if (!input || typeof input !== 'object') return DEFAULT_PROFILE;
  const o = input as Partial<HouseProfile>;
  const merged: HouseProfile = {
    ...DEFAULT_PROFILE,
    ...o,
    house: { ...DEFAULT_PROFILE.house, ...(o.house ?? {}), retrofits: { ...DEFAULT_PROFILE.house.retrofits, ...(o.house?.retrofits ?? {}) } },
    hvac: { ...DEFAULT_PROFILE.hvac, ...(o.hvac ?? {}) },
    comfort: { ...DEFAULT_PROFILE.comfort, ...(o.comfort ?? {}) },
    readings: { ...(o.readings ?? {}) },
    overrides: { ...(o.overrides ?? {}) },
    version: 1,
  };
  const r = profileSchema.safeParse(merged);
  return r.success ? (r.data as HouseProfile) : DEFAULT_PROFILE;
}
