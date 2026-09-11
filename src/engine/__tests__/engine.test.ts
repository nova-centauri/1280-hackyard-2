import { describe, expect, it } from 'vitest';
import { STEVE_HOUSE, DEFAULT_PROFILE, deriveParams, deriveGeometry, conductances, plan, sunPosition, stepHour, dewPointC } from '..';
import { summerDay, winterDay } from './fixtures';
import type { HouseProfile } from '../types';

const steve: HouseProfile = {
  ...STEVE_HOUSE,
  location: { lat: 40.44, lon: -79.99, timezone: 'America/New_York', countryCode: 'us', label: 'Test' },
};

describe('derive', () => {
  it('estimates a 2001 wood-frame house around 5 ACH50 and ~0.3 natural ACH', () => {
    const p = deriveParams(steve);
    expect(p.ach50).toBeCloseTo(5, 0);
    expect(p.naturalAch).toBeGreaterThan(0.2);
    expect(p.naturalAch).toBeLessThan(0.4);
    expect(p.wallR).toBe(13);
    expect(p.atticR).toBe(30);
  });
  it('converts the QuietCool 1472 CFM to roughly 5 ACH on a 2100 sq ft house', () => {
    const p = deriveParams(steve);
    expect(p.wholeHouseFanAch).toBeGreaterThan(4.5);
    expect(p.wholeHouseFanAch).toBeLessThan(6);
  });
  it('tightens the estimate with retrofits', () => {
    const sealed = deriveParams({ ...steve, house: { ...steve.house, retrofits: { insulation: true, airSealed: true, newWindows: true } } });
    const base = deriveParams(steve);
    expect(sealed.ach50).toBeLessThan(base.ach50);
    expect(sealed.atticR).toBeGreaterThan(base.atticR);
  });
  it('lets overrides win', () => {
    const p = deriveParams({ ...steve, overrides: { ach50: 2.2 } });
    expect(p.ach50).toBe(2.2);
  });
  it('puts most glass on the glass side', () => {
    const g = deriveGeometry(steve);
    expect(g.glazingByFace.SW).toBeGreaterThan(g.glazingByFace.NE);
    expect(g.glazingByFace.NE).toBeGreaterThan(g.glazingByFace.SE);
    const total = Object.values(g.glazingByFace).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(g.glazingAreaM2, 5);
  });
  it('gives masonry more thermal mass than wood frame', () => {
    const brick = deriveParams({ ...steve, house: { ...steve.house, construction: 'brick' } });
    expect(brick.massKJPerM2K).toBeGreaterThan(deriveParams(steve).massKJPerM2K);
  });
  it('produces a plausible UA for a 2001 house', () => {
    const p = deriveParams(steve);
    const c = conductances(p, deriveGeometry(steve), steve);
    // A 2100 sq ft 2001 house lands somewhere around 250–450 W/K all-in.
    const total = c.uaAboveGround + c.uaCeiling + c.uaFloor;
    expect(total).toBeGreaterThan(200);
    expect(total).toBeLessThan(500);
  });
});

describe('solar', () => {
  it('puts the sun high and to the south at solar noon in Pittsburgh in June', () => {
    // Solar noon in Pittsburgh (79.99° W) on the solstice is about 13:20 EDT.
    const s = sunPosition(40.44, -79.99, '2026-06-21T13:20', -4 * 3600);
    expect(s.elevationDeg).toBeGreaterThan(70);
    expect(Math.abs(s.azimuthDeg - 180)).toBeLessThan(5);
    const morning = sunPosition(40.44, -79.99, '2026-06-21T09:00', -4 * 3600);
    expect(morning.azimuthDeg).toBeLessThan(120);
  });
  it('has the sun below the horizon at midnight', () => {
    const s = sunPosition(40.44, -79.99, '2026-06-21T00:00', -4 * 3600);
    expect(s.elevationDeg).toBeLessThan(0);
  });
});

describe('simulate', () => {
  const params = deriveParams(steve);
  const geo = deriveGeometry(steve);
  const env = { profile: steve, params, geo, utcOffsetSeconds: -4 * 3600, groundC: 14 };
  const wx = summerDay(1).hourly;

  it('drifts toward outdoor when closed at night', () => {
    const out = stepHour(env, wx[3], 'closed', 26);
    expect(out.indoorC).toBeLessThan(26);
    expect(out.indoorC).toBeGreaterThan(wx[3].tempC);
  });
  it('cools faster with the whole-house fan than closed', () => {
    const closed = stepHour(env, wx[3], 'closed', 26).indoorC;
    const whf = stepHour(env, wx[3], 'whf', 26).indoorC;
    const win = stepHour(env, wx[3], 'windows', 26).indoorC;
    expect(whf).toBeLessThan(closed);
    expect(win).toBeLessThan(closed);
  });
  it('heats up in the afternoon sun', () => {
    const out = stepHour(env, wx[15], 'closed', 24);
    expect(out.solarGainW).toBeGreaterThan(500);
    expect(out.indoorC).toBeGreaterThan(24);
  });
  it('attic runs much hotter than ambient under sun and the attic fan halves the rise', () => {
    const withFan = stepHour(env, wx[14], 'closed', 24).atticC;
    const noFanEnv = { ...env, profile: { ...steve, hvac: { ...steve.hvac, atticFan: false } } };
    const noFan = stepHour(noFanEnv, wx[14], 'closed', 24).atticC;
    expect(noFan).toBeGreaterThan(wx[14].tempC + 10);
    expect(withFan).toBeLessThan(noFan);
  });
  it('AC holds the ceiling of the band and reports cooling energy', () => {
    const out = stepHour(env, wx[15], 'ac', 27);
    expect(out.indoorC).toBeCloseTo(steve.comfort.maxC - 0.5, 5);
    expect(out.hvacWh).toBeLessThan(0);
  });
  it('dew point formula is sane', () => {
    expect(dewPointC(24.5, 60)).toBeGreaterThan(15);
    expect(dewPointC(24.5, 60)).toBeLessThan(17.5);
  });
});

describe('planner on Steve\'s house', () => {
  const params = deriveParams(steve);
  const geometry = deriveGeometry(steve);

  it('uses the whole-house fan at night and AC in the afternoon on a hot clear day', () => {
    const weather = summerDay(2);
    const res = plan({ profile: steve, params, geometry, weather, nowIndex: 20, startIndoorC: 26 });
    const actions = res.hours.map((h) => h.action);
    expect(actions).toContain('whf');
    expect(actions).toContain('ac');
    // Never opens up during the hottest hours.
    const hot = res.hours.filter((h) => h.outdoorC > 28);
    expect(hot.every((h) => h.action === 'closed' || h.action === 'ac')).toBe(true);
    // Stays in band (with tolerance) once it is in control.
    for (const h of res.hours.slice(2)) {
      expect(h.indoorC).toBeLessThanOrEqual(steve.comfort.maxC + 0.35);
    }
  });
  it('never opens windows when outdoor air quality is bad', () => {
    const weather = summerDay(2, { aqi: 160 });
    const res = plan({ profile: steve, params, geometry, weather, nowIndex: 20, startIndoorC: 26 });
    const future = res.hours;
    expect(future.some((h) => h.action === 'windows' || h.action === 'whf' || h.action === 'ventilate')).toBe(false);
    expect(future.some((h) => h.guarded === 'aqi')).toBe(true);
  });
  it('refuses a night flush when the outside air is too humid', () => {
    const weather = summerDay(2, { dew: 21 });
    const res = plan({ profile: steve, params, geometry, weather, nowIndex: 20, startIndoorC: 26 });
    const future = res.hours;
    expect(future.some((h) => h.action === 'windows' || h.action === 'whf')).toBe(false);
    expect(future.some((h) => h.guarded === 'humidity')).toBe(true);
  });
  it('runs the heat and keeps windows shut in winter', () => {
    const weather = winterDay(2);
    const res = plan({ profile: steve, params, geometry, weather, nowIndex: 6, startIndoorC: 20 });
    const future = res.hours;
    expect(future.some((h) => h.action === 'heat')).toBe(true);
    expect(future.some((h) => h.action === 'windows' || h.action === 'whf')).toBe(false);
    expect(res.season).toBe('heating');
    for (const h of future) expect(h.indoorC).toBeGreaterThanOrEqual(steve.comfort.minC - 0.35);
  });
  it('uses less cooling energy than closed-up-with-AC on a summer day', () => {
    const weather = summerDay(2);
    const res = plan({ profile: steve, params, geometry, weather, nowIndex: 20, startIndoorC: 26 });
    expect(res.totals.coolingWh).toBeLessThan(res.totals.closedHvacCoolingWh);
  });
  it('a house with no fan still gets window advice', () => {
    const p: HouseProfile = { ...DEFAULT_PROFILE, location: steve.location };
    const weather = summerDay(2);
    const res = plan({ profile: p, params: deriveParams(p), geometry: deriveGeometry(p), weather, nowIndex: 20, startIndoorC: 26 });
    const future = res.hours;
    expect(future.some((h) => h.action === 'windows')).toBe(true);
    expect(future.some((h) => h.action === 'whf')).toBe(false);
  });
});
