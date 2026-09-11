'use client';
import { useState } from 'react';
import { useHouse } from '@/store/house';
import { unitsForCountry } from '@/lib/units';
import { Section } from '../ui';
import type { GeocodeHit } from '@/lib/geocode';

export default function LocationForm() {
  const { profile, update, fetchWeather } = useHouse();
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<GeocodeHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function search() {
    if (q.trim().length < 2) return;
    setBusy(true); setErr(null);
    try {
      const r = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      const j = await r.json();
      setHits(j.results ?? []);
      if (!j.results?.length) setErr('Nothing found. Try a city, ZIP, or full address.');
    } catch { setErr('Lookup failed.'); }
    setBusy(false);
  }
  function choose(h: GeocodeHit) {
    update((p) => ({ ...p, units: unitsForCountry(h.countryCode), location: { lat: h.lat, lon: h.lon, timezone: 'auto', countryCode: h.countryCode, label: h.label } }));
    setHits([]); setQ('');
    void fetchWeather();
  }
  function locate() {
    if (!navigator.geolocation) { setErr('Geolocation not available.'); return; }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const r = await fetch(`/api/geocode?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
      const j = await r.json();
      const h: GeocodeHit | undefined = j.results?.[0];
      if (h) choose(h); else setErr('Could not resolve your location.');
      setBusy(false);
    }, () => { setErr('Location permission denied.'); setBusy(false); });
  }

  return (
    <Section title="1. Where is the house?" subtitle={profile.location ? profile.location.label : 'needed for weather and sun'}>
      <div className="sm:col-span-2 flex gap-2">
        <input placeholder="Address, ZIP, or city" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} />
        <button className="btn" onClick={search} disabled={busy}>Find</button>
        <button className="btn" onClick={locate} disabled={busy} title="Use my location">📍</button>
      </div>
      {hits.length > 0 && (
        <ul className="sm:col-span-2 panel divide-y" style={{ borderColor: 'var(--line)' }}>
          {hits.map((h, i) => (
            <li key={i}><button className="w-full text-left px-3 py-2 text-sm hover:opacity-80" onClick={() => choose(h)}>{h.label}</button></li>
          ))}
        </ul>
      )}
      {err && <p className="sm:col-span-2 text-sm muted">{err}</p>}
      <div className="sm:col-span-2 flex items-center gap-3 text-sm">
        <span className="muted">Units:</span>
        <button className={`btn ${profile.units === 'F' ? 'btn-primary' : ''}`} onClick={() => update((p) => ({ ...p, units: 'F' }))}>°F</button>
        <button className={`btn ${profile.units === 'C' ? 'btn-primary' : ''}`} onClick={() => update((p) => ({ ...p, units: 'C' }))}>°C</button>
        <span className="muted text-xs">We keep only a rounded coordinate, never the address.</span>
      </div>
    </Section>
  );
}
