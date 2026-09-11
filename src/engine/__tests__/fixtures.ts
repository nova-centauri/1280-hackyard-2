import type { HourlyWeather, WeatherSeries } from '../types';

/** A clear late-summer day in the US Northeast: cool nights, hot afternoons. */
export function summerDay(days = 2, opts: { aqi?: number; dew?: number; cloud?: number } = {}): WeatherSeries {
  const hourly: HourlyWeather[] = [];
  for (let d = 0; d < days; d++) {
    for (let h = 0; h < 24; h++) {
      const tempC = 22 + 8 * Math.sin(((h - 9) / 24) * 2 * Math.PI); // ~14 at 3am, ~30 at 3pm
      const sunUp = h >= 6 && h <= 19;
      const sw = sunUp ? Math.max(0, 900 * Math.sin(((h - 6) / 13) * Math.PI)) : 0;
      hourly.push({
        time: `2026-08-${String(10 + d).padStart(2, '0')}T${String(h).padStart(2, '0')}:00`,
        tempC,
        rh: 55,
        dewPointC: opts.dew ?? 12,
        cloudCover: opts.cloud ?? 10,
        shortwaveWm2: sw * (1 - (opts.cloud ?? 10) / 150),
        windMs: 2,
        isDay: sunUp,
        usAqi: opts.aqi ?? 30,
        pm25: opts.aqi && opts.aqi > 100 ? 60 : 5,
      });
    }
  }
  return { timezone: 'America/New_York', utcOffsetSeconds: -4 * 3600, hourly, fetchedAt: '2026-08-10T00:00:00Z' };
}

export function winterDay(days = 2): WeatherSeries {
  const hourly: HourlyWeather[] = [];
  for (let d = 0; d < days; d++) {
    for (let h = 0; h < 24; h++) {
      const tempC = -4 + 5 * Math.sin(((h - 9) / 24) * 2 * Math.PI);
      const sunUp = h >= 7 && h <= 17;
      const sw = sunUp ? Math.max(0, 450 * Math.sin(((h - 7) / 10) * Math.PI)) : 0;
      hourly.push({
        time: `2026-01-${String(10 + d).padStart(2, '0')}T${String(h).padStart(2, '0')}:00`,
        tempC, rh: 70, dewPointC: -8, cloudCover: 40, shortwaveWm2: sw, windMs: 4, isDay: sunUp, usAqi: 20, pm25: 4,
      });
    }
  }
  return { timezone: 'America/New_York', utcOffsetSeconds: -5 * 3600, hourly, fetchedAt: '2026-01-10T00:00:00Z' };
}
