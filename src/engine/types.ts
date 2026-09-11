/**
 * Breeze Vibe engine types. The engine is pure TypeScript with no React or
 * browser dependencies. Internal units are SI: °C, W, J, m, m². The UI
 * converts to the user's display units.
 */

export type Construction =
  | 'wood_frame'
  | 'brick'
  | 'concrete_block'
  | 'stone'
  | 'steel_sip'
  | 'straw_bale';
export type Foundation = 'basement' | 'crawlspace' | 'slab';
export type RoofType = 'attic_vented' | 'attic_unvented' | 'flat' | 'cathedral';
export type WindowType = 'single' | 'double' | 'triple';
export type Orientation = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';
export type Shading = 'none' | 'partial' | 'heavy';
export type HeatingType =
  | 'furnace'
  | 'boiler'
  | 'heat_pump'
  | 'mini_split'
  | 'baseboard'
  | 'wood_stove'
  | 'none';
export type HeatingFuel = 'natural_gas' | 'propane' | 'oil' | 'electric' | 'wood_pellet';
export type CoolingType =
  | 'central_ac'
  | 'heat_pump'
  | 'mini_split'
  | 'window_units'
  | 'evaporative'
  | 'none';
export type Units = 'F' | 'C';

export interface Location {
  lat: number; // rounded to ~1 km before storage
  lon: number;
  timezone: string; // IANA
  countryCode: string; // ISO-3166 alpha-2, lower case
  label: string; // display label, e.g. "Pittsburgh, PA" (never the street address)
}

export interface HouseProfile {
  version: 1;
  units: Units;
  location: Location | null;
  house: {
    yearBuilt: number;
    construction: Construction;
    floors: number;
    sqft: number; // finished conditioned area, all floors
    foundation: Foundation;
    roof: RoofType;
    windows: WindowType;
    /** Which face of the house carries the most glass. */
    glassSide: Orientation;
    retrofits: { insulation: boolean; airSealed: boolean; newWindows: boolean };
    shading: Shading;
    occupants: number;
  };
  hvac: {
    heating: HeatingType;
    fuel: HeatingFuel;
    cooling: CoolingType;
    /** null = no whole-house fan */
    wholeHouseFanCfm: number | null;
    atticFan: boolean;
    ceilingFans: boolean;
    erv: boolean;
    dehumidifier: boolean;
  };
  comfort: {
    minC: number;
    maxC: number;
    /** Highest acceptable indoor relative humidity, % */
    rhMax: number;
    /** 0 = prefer efficiency, 1 = prefer fresh air */
    freshAirPreference: number;
  };
  readings: {
    indoorTempC?: number;
    indoorRh?: number;
    co2Ppm?: number;
    pm25?: number;
    takenAt?: string; // ISO
  };
  /** User edits from the assumptions panel. Anything set here beats the derived value. */
  overrides: Partial<DerivedParams>;
}

/** Everything the simulator needs, derived from the profile (and editable by the user). */
export interface DerivedParams {
  /** Blower-door air changes per hour at 50 Pa. */
  ach50: number;
  /** Natural infiltration ACH under typical conditions. */
  naturalAch: number;
  /** Imperial R-values, because that is what homeowners know. */
  wallR: number;
  atticR: number;
  /** Window U in W/m²K and solar heat gain coefficient. */
  windowU: number;
  shgc: number;
  /** Glazing as a fraction of gross wall area. */
  glazingFraction: number;
  /** Effective thermal capacity per m² of floor area, kJ/m²K (ISO 13790 classes). */
  massKJPerM2K: number;
  /** ACH with windows open in a light breeze; scaled by wind at runtime. */
  openWindowAch: number;
  /** Whole-house fan ACH at rated CFM (0 if none). */
  wholeHouseFanAch: number;
  /** Baseline internal gains in W (occupants + appliances). */
  internalGainsW: number;
}

export interface Geometry {
  floorAreaM2: number;
  footprintM2: number;
  volumeM3: number;
  ceilingHeightM: number;
  /** Gross exterior wall area, all floors, m². */
  wallAreaM2: number;
  glazingAreaM2: number;
  opaqueWallAreaM2: number;
  roofAreaM2: number;
  /** Glazing area per compass face, m². */
  glazingByFace: Record<Orientation, number>;
}

export interface HourlyWeather {
  /** ISO local time string as returned by the weather API, e.g. "2026-09-11T14:00" */
  time: string;
  tempC: number;
  rh: number;
  dewPointC: number;
  /** 0–100 */
  cloudCover: number;
  /** Global horizontal shortwave radiation, W/m² */
  shortwaveWm2: number;
  /** m/s at 10 m */
  windMs: number;
  isDay: boolean;
  /** Outdoor PM2.5 µg/m³ and US AQI, when available. */
  pm25?: number;
  usAqi?: number;
}

export interface WeatherSeries {
  timezone: string;
  utcOffsetSeconds: number;
  hourly: HourlyWeather[];
  fetchedAt: string;
}

export type Action =
  | 'closed' // windows shut, no HVAC
  | 'windows' // windows open for cooling or comfort
  | 'whf' // whole-house fan running, windows cracked
  | 'ac'
  | 'heat'
  | 'ventilate'; // brief opening for air quality only

export interface HourResult {
  time: string;
  action: Action;
  reason: string;
  /** Indoor temperature at the end of the hour. */
  indoorC: number;
  outdoorC: number;
  /** Heating (+) or cooling (−) delivered by HVAC, Wh thermal. */
  hvacWh: number;
  /** True when the guards blocked the passive option that would otherwise have won. */
  guarded?: 'aqi' | 'humidity' | 'cold';
  solarGainW: number;
  atticC: number;
}

export interface PlanResult {
  /** One entry per forecast hour from "now" onward. hours[0] is the current hour. */
  hours: HourResult[];
  /** Index into the weather series where hours[0] sits. */
  startIndex: number;
  /** Comparison trajectories aligned with `hours`. */
  doNothingC: number[];
  closedHvacC: number[];
  /** Totals over the horizon, Wh thermal. */
  totals: { heatingWh: number; coolingWh: number; closedHvacHeatingWh: number; closedHvacCoolingWh: number };
  /** Season the planner inferred from the forecast. */
  season: 'heating' | 'cooling' | 'shoulder';
  now: HourResult | null;
}

export interface SimInput {
  profile: HouseProfile;
  params: DerivedParams;
  geometry: Geometry;
  weather: WeatherSeries;
  /** Indoor start temp; falls back to a reasonable guess. */
  startIndoorC?: number;
  /** Index into weather.hourly at which "now" sits. */
  nowIndex: number;
}
