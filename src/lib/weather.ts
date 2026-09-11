import type { HourlyWeather, WeatherSeries } from '@/engine/types';

const cache = new Map<string, { at: number; data: WeatherSeries }>();
const TTL_MS = 15 * 60 * 1000;

/** Round to ~1 km so that nearby users share a cache entry and we never store a precise location. */
export function roundCoord(x: number) {
  return Math.round(x * 100) / 100;
}

export async function getWeather(lat: number, lon: number): Promise<WeatherSeries> {
  const la = roundCoord(lat), lo = roundCoord(lon);
  const key = `${la},${lo}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;

  const fc = new URL('https://api.open-meteo.com/v1/forecast');
  fc.search = new URLSearchParams({
    latitude: String(la), longitude: String(lo),
    hourly: 'temperature_2m,relative_humidity_2m,dew_point_2m,cloud_cover,shortwave_radiation,wind_speed_10m,is_day',
    timezone: 'auto', forecast_days: '3', past_hours: '12', wind_speed_unit: 'ms',
  }).toString();
  const aq = new URL('https://air-quality-api.open-meteo.com/v1/air-quality');
  aq.search = new URLSearchParams({
    latitude: String(la), longitude: String(lo), hourly: 'pm2_5,us_aqi', timezone: 'auto', forecast_days: '3', past_hours: '12',
  }).toString();

  const [fr, ar] = await Promise.all([
    fetch(fc, { next: { revalidate: 0 } }),
    fetch(aq, { next: { revalidate: 0 } }).catch(() => null),
  ]);
  if (!fr.ok) throw new Error(`weather ${fr.status}`);
  const f = await fr.json();
  const a = ar && ar.ok ? await ar.json() : null;
  const aqByTime = new Map<string, { pm25: number; usAqi: number }>();
  if (a?.hourly?.time) {
    a.hourly.time.forEach((t: string, i: number) => {
      aqByTime.set(t, { pm25: a.hourly.pm2_5?.[i] ?? undefined, usAqi: a.hourly.us_aqi?.[i] ?? undefined });
    });
  }
  const h = f.hourly;
  const hourly: HourlyWeather[] = h.time.map((t: string, i: number) => ({
    time: t,
    tempC: h.temperature_2m[i],
    rh: h.relative_humidity_2m[i],
    dewPointC: h.dew_point_2m[i],
    cloudCover: h.cloud_cover[i],
    shortwaveWm2: h.shortwave_radiation[i] ?? 0,
    windMs: h.wind_speed_10m[i] ?? 0,
    isDay: h.is_day[i] === 1,
    ...(aqByTime.get(t) ?? {}),
  })).filter((x: HourlyWeather) => x.tempC !== null && x.tempC !== undefined);

  const data: WeatherSeries = {
    timezone: f.timezone,
    utcOffsetSeconds: f.utc_offset_seconds,
    hourly,
    fetchedAt: new Date().toISOString(),
  };
  cache.set(key, { at: Date.now(), data });
  return data;
}

/** Index of the hour containing "now" in the series' local time. */
export function nowIndex(series: WeatherSeries, now = new Date()) {
  const local = new Date(now.getTime() + series.utcOffsetSeconds * 1000);
  const key = local.toISOString().slice(0, 13); // "YYYY-MM-DDTHH"
  const i = series.hourly.findIndex((h) => h.time.slice(0, 13) === key);
  return i >= 0 ? i : 0;
}
