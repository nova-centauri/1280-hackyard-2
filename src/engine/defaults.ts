import type { HouseProfile } from './types';

export const DEFAULT_PROFILE: HouseProfile = {
  version: 1,
  units: 'F',
  location: null,
  house: {
    yearBuilt: 1995,
    construction: 'wood_frame',
    floors: 2,
    sqft: 1800,
    foundation: 'basement',
    roof: 'attic_vented',
    windows: 'double',
    glassSide: 'S',
    retrofits: { insulation: false, airSealed: false, newWindows: false },
    shading: 'none',
    occupants: 2,
  },
  hvac: {
    heating: 'furnace',
    fuel: 'natural_gas',
    cooling: 'central_ac',
    wholeHouseFanCfm: null,
    atticFan: false,
    ceilingFans: false,
    erv: false,
    dehumidifier: false,
  },
  comfort: {
    minC: 19.5, // ~67 °F
    maxC: 24.5, // ~76 °F
    rhMax: 60,
    freshAirPreference: 0.5,
  },
  readings: {},
  overrides: {},
};

/** Steve's house — see docs/TEST-HOUSE.md. First end-to-end fixture. */
export const STEVE_HOUSE: HouseProfile = {
  ...DEFAULT_PROFILE,
  house: {
    yearBuilt: 2001,
    construction: 'wood_frame',
    floors: 2,
    sqft: 2100,
    foundation: 'basement',
    roof: 'attic_vented',
    windows: 'double',
    // Front faces NE; a colonial carries glass front and back, and the SW back takes the afternoon sun.
    glassSide: 'SW',
    retrofits: { insulation: false, airSealed: false, newWindows: false },
    shading: 'none',
    occupants: 2,
  },
  hvac: {
    heating: 'furnace',
    fuel: 'natural_gas',
    cooling: 'central_ac',
    wholeHouseFanCfm: 1472, // QuietCool Classic
    atticFan: true,
    ceilingFans: false,
    erv: false,
    dehumidifier: false,
  },
};
