import { NextResponse } from 'next/server';
import { geocode, reverseGeocode } from '@/lib/geocode';
import { roundCoord } from '@/lib/weather';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const u = new URL(req.url);
  const q = u.searchParams.get('q');
  const lat = u.searchParams.get('lat');
  const lon = u.searchParams.get('lon');
  if (lat && lon) {
    const hit = await reverseGeocode(Number(lat), Number(lon));
    return NextResponse.json({ results: hit ? [{ ...hit, lat: roundCoord(hit.lat), lon: roundCoord(hit.lon) }] : [] });
  }
  if (!q || q.length < 2) return NextResponse.json({ results: [] });
  const results = (await geocode(q)).map((h) => ({ ...h, lat: roundCoord(h.lat), lon: roundCoord(h.lon) }));
  return NextResponse.json({ results }, { headers: { 'Cache-Control': 'public, max-age=3600' } });
}
