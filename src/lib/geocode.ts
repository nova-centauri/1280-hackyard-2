export interface GeocodeHit {
  label: string;
  lat: number;
  lon: number;
  countryCode: string;
}

const UA = 'BreezeVibe/0.1 (breezevibe.site)';

/** Street addresses, ZIPs, and place names via Nominatim; place names fall back to Open-Meteo. */
export async function geocode(q: string): Promise<GeocodeHit[]> {
  const query = q.trim();
  if (!query) return [];
  const hits: GeocodeHit[] = [];
  try {
    const u = new URL('https://nominatim.openstreetmap.org/search');
    u.search = new URLSearchParams({ q: query, format: 'jsonv2', limit: '5', addressdetails: '1' }).toString();
    const r = await fetch(u, { headers: { 'User-Agent': UA, 'Accept-Language': 'en' } });
    if (r.ok) {
      const j = await r.json();
      for (const x of j) {
        const a = x.address ?? {};
        const town = a.city || a.town || a.village || a.hamlet || a.county || '';
        const region = a.state || a.region || '';
        const label = [town, region, (a.country_code ?? '').toUpperCase()].filter(Boolean).join(', ') || x.display_name;
        hits.push({ label, lat: Number(x.lat), lon: Number(x.lon), countryCode: (a.country_code ?? '').toLowerCase() });
      }
    }
  } catch { /* fall through */ }
  if (hits.length) return hits;
  try {
    const u = new URL('https://geocoding-api.open-meteo.com/v1/search');
    u.search = new URLSearchParams({ name: query, count: '5', language: 'en', format: 'json' }).toString();
    const r = await fetch(u);
    if (r.ok) {
      const j = await r.json();
      for (const x of j.results ?? []) {
        hits.push({ label: [x.name, x.admin1, x.country_code].filter(Boolean).join(', '), lat: x.latitude, lon: x.longitude, countryCode: (x.country_code ?? '').toLowerCase() });
      }
    }
  } catch { /* ignore */ }
  return hits;
}

export async function reverseGeocode(lat: number, lon: number): Promise<GeocodeHit | null> {
  try {
    const u = new URL('https://nominatim.openstreetmap.org/reverse');
    u.search = new URLSearchParams({ lat: String(lat), lon: String(lon), format: 'jsonv2', zoom: '10' }).toString();
    const r = await fetch(u, { headers: { 'User-Agent': UA, 'Accept-Language': 'en' } });
    if (!r.ok) return null;
    const x = await r.json();
    const a = x.address ?? {};
    const town = a.city || a.town || a.village || a.county || '';
    const label = [town, a.state, (a.country_code ?? '').toUpperCase()].filter(Boolean).join(', ') || 'Your location';
    return { label, lat, lon, countryCode: (a.country_code ?? '').toLowerCase() };
  } catch {
    return null;
  }
}
