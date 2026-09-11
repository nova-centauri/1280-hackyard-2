import type { Geometry, HourlyWeather, Orientation } from './types';
import { FACE_AZIMUTH, ORIENTATIONS } from './derive';

/** Sun elevation and azimuth (degrees, azimuth clockwise from north) for a local wall-clock hour. */
export function sunPosition(lat: number, lon: number, localTime: string, utcOffsetSeconds: number) {
  // localTime like "2026-09-11T14:00" — treat as local wall time, convert to UTC via the offset.
  const [d, t] = localTime.split('T');
  const [Y, M, D] = d.split('-').map(Number);
  const [h, m] = (t ?? '12:00').split(':').map(Number);
  const utcMs = Date.UTC(Y, M - 1, D, h, m ?? 0) - utcOffsetSeconds * 1000;
  const jd = utcMs / 86400000 + 2440587.5;
  const n = jd - 2451545.0;
  const L = norm360(280.46 + 0.9856474 * n);
  const g = rad(norm360(357.528 + 0.9856003 * n));
  const lambda = rad(L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g));
  const eps = rad(23.439 - 0.0000004 * n);
  const alpha = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda));
  const delta = Math.asin(Math.sin(eps) * Math.sin(lambda));
  const gmst = norm360(280.46061837 + 360.98564736629 * n);
  const lst = rad(norm360(gmst + lon));
  const H = lst - alpha; // hour angle
  const phi = rad(lat);
  const elev = Math.asin(Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.cos(H));
  const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(delta) * Math.cos(phi));
  return { elevationDeg: deg(elev), azimuthDeg: norm360(deg(az) + 180) };
}

/**
 * Irradiance on each vertical face from global horizontal irradiance, W/m².
 * Diffuse fraction grows with cloud cover; the direct part is projected onto the face.
 */
export function faceIrradiance(
  wx: HourlyWeather,
  sun: { elevationDeg: number; azimuthDeg: number },
): Record<Orientation, number> {
  const out = Object.fromEntries(ORIENTATIONS.map((o) => [o, 0])) as Record<Orientation, number>;
  const ghi = wx.shortwaveWm2;
  if (ghi <= 0) return out;
  const cloud = Math.min(1, Math.max(0, wx.cloudCover / 100));
  const diffuseFrac = 0.2 + 0.7 * cloud;
  const diffuse = ghi * diffuseFrac;
  const direct = ghi - diffuse;
  const elev = rad(Math.max(sun.elevationDeg, 0));
  const sinE = Math.max(Math.sin(elev), 0.12); // avoid blowing up at sunrise
  for (const o of ORIENTATIONS) {
    const cosTheta = Math.cos(elev) * Math.cos(rad(sun.azimuthDeg - FACE_AZIMUTH[o]));
    const directOnFace = sun.elevationDeg > 0 ? Math.min(1.5, Math.max(0, cosTheta) / sinE) * direct : 0;
    out[o] = 0.5 * diffuse + directOnFace; // a vertical face sees half the sky
  }
  return out;
}

export function solarGainW(
  geo: Geometry,
  irradiance: Record<Orientation, number>,
  shgc: number,
  shadeFactor: number,
) {
  let q = 0;
  for (const o of ORIENTATIONS) q += geo.glazingByFace[o] * irradiance[o];
  return q * shgc * (1 - shadeFactor);
}

const rad = (x: number) => (x * Math.PI) / 180;
const deg = (x: number) => (x * 180) / Math.PI;
const norm360 = (x: number) => ((x % 360) + 360) % 360;
