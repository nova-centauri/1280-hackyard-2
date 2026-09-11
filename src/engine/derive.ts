import type {
  Construction,
  DerivedParams,
  Geometry,
  HouseProfile,
  Orientation,
} from './types';

export const ORIENTATIONS: Orientation[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
export const FACE_AZIMUTH: Record<Orientation, number> = {
  N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315,
};

const SQFT_TO_M2 = 0.09290304;
const CEILING_M = 2.5;
/** W/m²K per imperial R-value unit: U = 5.678 / R */
export const rToU = (r: number) => 5.678263 / Math.max(r, 0.5);

function era(year: number): 0 | 1 | 2 | 3 | 4 {
  if (year < 1950) return 0;
  if (year < 1980) return 1;
  if (year < 2000) return 2;
  if (year < 2010) return 3;
  return 4;
}

/** Blower-door ACH50 by era, for a typical un-retrofitted house. */
const ACH50_BY_ERA = [17, 11, 7, 5, 3];
/** Wall / attic R by era for wood frame. */
const WALL_R_BY_ERA = [3, 7, 11, 13, 20];
const ATTIC_R_BY_ERA = [5, 11, 19, 30, 38];

/** ISO 13790 effective thermal capacity classes, kJ/m²K of floor area. */
const MASS_BY_CONSTRUCTION: Record<Construction, number> = {
  wood_frame: 110,
  steel_sip: 110,
  straw_bale: 165,
  brick: 260,
  concrete_block: 260,
  stone: 370,
};

const WINDOW_U = { single: 5.8, double: 2.8, triple: 1.6 } as const;
const WINDOW_SHGC = { single: 0.7, double: 0.4, triple: 0.3 } as const;

export function deriveParams(p: HouseProfile): DerivedParams {
  const { house, hvac } = p;
  const e = era(house.yearBuilt);

  let ach50 = ACH50_BY_ERA[e];
  // Masonry of any age is usually leakier at joints but has no stud cavities; older masonry is very leaky.
  if ((house.construction === 'brick' || house.construction === 'stone') && e <= 1) ach50 *= 1.15;
  if (house.construction === 'steel_sip') ach50 *= 0.6;
  if (house.construction === 'straw_bale') ach50 *= 0.7;
  if (house.retrofits.airSealed) ach50 *= 0.6;
  if (house.retrofits.newWindows) ach50 *= 0.85;

  // LBL "N" factor: taller houses and windier sites leak more per ACH50.
  const nFactor = house.floors >= 3 ? 15 : house.floors === 2 ? 18 : 21;
  const naturalAch = ach50 / nFactor;

  let wallR = WALL_R_BY_ERA[e];
  if (house.construction === 'brick' || house.construction === 'stone' || house.construction === 'concrete_block') {
    // Uninsulated masonry walls are poor insulators regardless of era until they get furred and insulated.
    wallR = e <= 1 ? 4 : Math.min(wallR, 11);
  }
  if (house.construction === 'steel_sip') wallR = Math.max(wallR, 24);
  if (house.construction === 'straw_bale') wallR = Math.max(wallR, 30);
  if (house.retrofits.insulation) wallR = Math.max(wallR, 13);

  let atticR = ATTIC_R_BY_ERA[e];
  if (house.roof === 'cathedral' || house.roof === 'flat') atticR = Math.min(atticR, 19);
  if (house.retrofits.insulation) atticR = Math.max(atticR, 38);

  const win = house.retrofits.newWindows && house.windows === 'single' ? 'double' : house.windows;
  const windowU = WINDOW_U[win];
  const shgc = WINDOW_SHGC[win];

  const massKJPerM2K = MASS_BY_CONSTRUCTION[house.construction];

  const geometry = deriveGeometry(p);
  const wholeHouseFanAch = hvac.wholeHouseFanCfm
    ? (hvac.wholeHouseFanCfm * 60 * 0.0283168) / geometry.volumeM3
    : 0;

  const internalGainsW = house.occupants * 100 + 300;

  const derived: DerivedParams = {
    ach50: round(ach50, 1),
    naturalAch: round(naturalAch, 2),
    wallR,
    atticR,
    windowU,
    shgc,
    glazingFraction: 0.15,
    massKJPerM2K,
    openWindowAch: 4,
    wholeHouseFanAch: round(wholeHouseFanAch, 2),
    internalGainsW,
  };
  return { ...derived, ...stripUndefined(p.overrides) };
}

export function deriveGeometry(p: HouseProfile, glazingFraction = p.overrides.glazingFraction ?? 0.15): Geometry {
  const { house } = p;
  const floorAreaM2 = house.sqft * SQFT_TO_M2;
  const footprintM2 = floorAreaM2 / Math.max(1, house.floors);
  // Treat the footprint as a 1.3:1 rectangle, long side facing the "glass side".
  const short = Math.sqrt(footprintM2 / 1.3);
  const long = short * 1.3;
  const perimeter = 2 * (short + long);
  const wallAreaM2 = perimeter * CEILING_M * house.floors;
  const glazingAreaM2 = wallAreaM2 * glazingFraction;
  const volumeM3 = floorAreaM2 * CEILING_M;

  // Glass split: 40% on the glass side, 30% opposite, 15% on each remaining side of the rectangle.
  const glazingByFace = Object.fromEntries(ORIENTATIONS.map((o) => [o, 0])) as Record<Orientation, number>;
  const gi = ORIENTATIONS.indexOf(house.glassSide);
  glazingByFace[ORIENTATIONS[gi]] += glazingAreaM2 * 0.4;
  glazingByFace[ORIENTATIONS[(gi + 4) % 8]] += glazingAreaM2 * 0.3;
  glazingByFace[ORIENTATIONS[(gi + 2) % 8]] += glazingAreaM2 * 0.15;
  glazingByFace[ORIENTATIONS[(gi + 6) % 8]] += glazingAreaM2 * 0.15;

  return {
    floorAreaM2,
    footprintM2,
    volumeM3,
    ceilingHeightM: CEILING_M,
    wallAreaM2,
    glazingAreaM2,
    opaqueWallAreaM2: wallAreaM2 - glazingAreaM2,
    roofAreaM2: footprintM2,
    glazingByFace,
  };
}

/** Envelope conductances in W/K. */
export function conductances(params: DerivedParams, geo: Geometry, p: HouseProfile) {
  const uaWalls = geo.opaqueWallAreaM2 * rToU(params.wallR);
  const uaWindows = geo.glazingAreaM2 * params.windowU;
  const uaCeiling = geo.roofAreaM2 * rToU(params.atticR);
  // Floor to ground: slab is a direct path; basement and crawlspace are buffered.
  const floorU = p.house.foundation === 'slab' ? 0.5 : p.house.foundation === 'crawlspace' ? 0.35 : 0.2;
  const uaFloor = geo.footprintM2 * floorU;
  // 1200 J/m³K air → 0.333 W/K per (m³·ACH)
  const uaInfiltration = 0.333 * params.naturalAch * geo.volumeM3;
  return { uaWalls, uaWindows, uaCeiling, uaFloor, uaInfiltration, uaAboveGround: uaWalls + uaWindows + uaInfiltration };
}

/** Thermal capacity of the conditioned space, J/K. */
export function thermalCapacityJPerK(params: DerivedParams, geo: Geometry) {
  return params.massKJPerM2K * 1000 * geo.floorAreaM2;
}

function stripUndefined<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null)) as Partial<T>;
}
const round = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d;
