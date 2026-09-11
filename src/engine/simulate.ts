import type { Action, DerivedParams, Geometry, HourlyWeather, HouseProfile } from './types';
import { conductances, thermalCapacityJPerK } from './derive';
import { faceIrradiance, solarGainW, sunPosition } from './solar';

export interface StepEnv {
  profile: HouseProfile;
  params: DerivedParams;
  geo: Geometry;
  utcOffsetSeconds: number;
  /** Below-grade / ground temperature used for floor losses. */
  groundC: number;
}

export interface StepOut {
  indoorC: number;
  atticC: number;
  hvacWh: number;
  solarGainW: number;
  ventAch: number;
}

const SHADE_FACTOR = { none: 0, partial: 0.3, heavy: 0.6 } as const;

/** Ventilation ACH for a given action and wind. */
export function ventilationAch(action: Action, params: DerivedParams, windMs: number) {
  switch (action) {
    case 'windows': {
      const windScale = Math.min(2.5, Math.max(0.5, 0.5 + windMs / 4));
      return Math.min(10, params.openWindowAch * windScale);
    }
    case 'whf':
      return Math.max(params.wholeHouseFanAch, 1);
    case 'ventilate':
      return params.openWindowAch / 3; // ~20 minutes of the hour
    default:
      return 0;
  }
}

/** Attic air temperature for the hour. */
export function atticTemp(env: StepEnv, wx: HourlyWeather, action: Action, indoorC: number) {
  const { profile } = env;
  const roof = profile.house.roof;
  // Sol-air style rise: dark asphalt under 1000 W/m² runs ~25 °C over ambient in a vented attic.
  let rise = 0.025 * wx.shortwaveWm2;
  if (roof === 'attic_vented' || roof === 'attic_unvented') {
    if (roof === 'attic_unvented') rise *= 0.7;
    if (profile.hvac.atticFan && wx.shortwaveWm2 > 50) rise *= 0.5;
    if (action === 'whf') {
      // House air is being pushed through the attic; the attic tracks the house.
      return indoorC + 0.3 * (wx.tempC + rise - indoorC);
    }
    return wx.tempC + rise;
  }
  // Flat or cathedral: the ceiling sees the roof deck directly.
  return wx.tempC + rise * 0.8;
}

/**
 * Advance one hour with a lumped-capacitance model. Inputs are held constant
 * across the hour so the exact solution is an exponential approach to the
 * equilibrium temperature.
 */
export function stepHour(
  env: StepEnv,
  wx: HourlyWeather,
  action: Action,
  indoorC: number,
): StepOut {
  const { profile, params, geo } = env;
  const c = conductances(params, geo, profile);
  const C = thermalCapacityJPerK(params, geo);
  const loc = profile.location;
  const sun = loc ? sunPosition(loc.lat, loc.lon, wx.time, env.utcOffsetSeconds) : { elevationDeg: 30, azimuthDeg: 180 };
  const irr = faceIrradiance(wx, sun);
  const qSolar = solarGainW(geo, irr, params.shgc, SHADE_FACTOR[profile.house.shading]);
  const attic = atticTemp(env, wx, action, indoorC);
  const ventAch = ventilationAch(action, params, wx.windMs);
  const uaVent = 0.333 * ventAch * geo.volumeM3;

  const uaOut = c.uaWalls + c.uaWindows + c.uaInfiltration + uaVent;
  const uaTotal = uaOut + c.uaCeiling + c.uaFloor;
  const tEq =
    (uaOut * wx.tempC + c.uaCeiling * attic + c.uaFloor * env.groundC + qSolar + params.internalGainsW) / uaTotal;
  const k = Math.exp((-uaTotal * 3600) / C);
  const passive = tEq + (indoorC - tEq) * k;

  let next = passive;
  let hvacWh = 0;
  if (action === 'ac') {
    const target = profile.comfort.maxC - 0.5;
    if (passive > target) {
      next = target;
      // Energy to hold the target for the hour ≈ steady-state load, plus pulling stored heat down.
      const steady = Math.max(0, uaTotal * target - (uaOut * wx.tempC + c.uaCeiling * attic + c.uaFloor * env.groundC + qSolar + params.internalGainsW));
      hvacWh = -(steady + Math.max(0, (indoorC - target) * C) / 3600);
    }
  } else if (action === 'heat') {
    const target = profile.comfort.minC + 0.5;
    if (passive < target) {
      next = target;
      const steady = Math.max(0, uaOut * (target - wx.tempC) + c.uaCeiling * (target - attic) + c.uaFloor * (target - env.groundC) - qSolar - params.internalGainsW);
      hvacWh = steady + Math.max(0, (target - indoorC) * C) / 3600;
    }
  }
  return { indoorC: next, atticC: attic, hvacWh, solarGainW: qSolar, ventAch };
}

/** Magnus formula dew point, °C. */
export function dewPointC(tempC: number, rh: number) {
  const a = 17.62, b = 243.12;
  const g = (a * tempC) / (b + tempC) + Math.log(Math.max(1, rh) / 100);
  return (b * g) / (a - g);
}
