import { NextResponse } from 'next/server';
import { getWeather } from '@/lib/weather';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const u = new URL(req.url);
  const lat = Number(u.searchParams.get('lat'));
  const lon = Number(u.searchParams.get('lon'));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return NextResponse.json({ error: 'lat/lon required' }, { status: 400 });
  }
  try {
    const data = await getWeather(lat, lon);
    return NextResponse.json(data, { headers: { 'Cache-Control': 'public, max-age=300' } });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
