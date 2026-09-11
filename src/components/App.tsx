'use client';
import dynamic from 'next/dynamic';
import { useEffect, useMemo } from 'react';
import { useHouse } from '@/store/house';
import { deriveGeometry, deriveParams, plan } from '@/engine';
import { nowIndex } from '@/lib/weather';
import SaveBar from './SaveBar';
import AdviceNow from './AdviceNow';
import Timeline from './Timeline';
import TempChart from './TempChart';
import Assumptions from './Assumptions';
import LocationForm from './forms/LocationForm';
import HouseForm from './forms/HouseForm';
import HvacForm from './forms/HvacForm';
import ComfortForm from './forms/ComfortForm';
import ReadingsForm from './forms/ReadingsForm';

const HouseScene = dynamic(() => import('@/scene/HouseScene'), { ssr: false, loading: () => <div className="h-full w-full grid place-items-center muted text-sm">Loading 3D…</div> });

export default function App({ loadCode }: { loadCode?: string }) {
  const { profile, weather, hydrate, hydrated, loadCode: load, setPlan } = useHouse();

  useEffect(() => {
    (async () => {
      await hydrate();
      if (loadCode) {
        const ok = await load(loadCode);
        if (ok) window.history.replaceState(null, '', '/');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const params = useMemo(() => deriveParams(profile), [profile]);
  const geometry = useMemo(() => deriveGeometry(profile, params.glazingFraction), [profile, params.glazingFraction]);
  const result = useMemo(() => {
    if (!weather || !profile.location) return null;
    const idx = nowIndex(weather);
    return plan({ profile, params, geometry, weather, nowIndex: idx });
  }, [profile, params, geometry, weather]);
  useEffect(() => setPlan(result), [result, setPlan]);

  return (
    <main className="min-h-dvh md:h-dvh md:grid md:grid-cols-2">
      {/* Panel B: the house. Sticky on mobile, full-height on desktop. */}
      <section className="sticky top-0 z-10 h-[40dvh] md:static md:h-full md:order-last border-b md:border-b-0 md:border-l" style={{ borderColor: 'var(--line)', background: 'var(--bg)' }}>
        <HouseScene profile={profile} geometry={geometry} weather={weather} plan={result} />
      </section>

      {/* Panel A: inputs and advice. */}
      <section className="md:h-full md:overflow-y-auto p-4 md:p-6 space-y-5" style={{ paddingBlock: '1rem' }}>
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Breeze Vibe</h1>
            <p className="muted text-sm">When to open up, when to seal up, and when to let the HVAC do the work.</p>
          </div>
          <SaveBar />
        </header>

        {!hydrated ? (
          <p className="muted text-sm">Loading your house…</p>
        ) : (
          <>
            <AdviceNow />
            <Timeline />
            <TempChart />
            <LocationForm />
            <HouseForm />
            <HvacForm />
            <ComfortForm />
            <ReadingsForm />
            <Assumptions params={params} geometry={geometry} />
            <footer className="muted text-xs pt-4 pb-8">
              Breeze Vibe is an advisor, not an energy audit. It estimates your house from a few facts and public weather data. Check the assumptions panel and correct anything you know better. Location is rounded to about a kilometre and the address is never stored.
            </footer>
          </>
        )}
      </section>
    </main>
  );
}
