'use client';
import { useHouse } from '@/store/house';
import { fmtTemp } from '@/lib/units';
import { ACTION_META } from './actionMeta';

export default function AdviceNow() {
  const { profile, plan, weather, weatherLoading, weatherError } = useHouse();
  if (!profile.location) {
    return (
      <div className="panel p-4">
        <p className="font-medium">Start with your location.</p>
        <p className="muted text-sm">Breeze Vibe needs it for the local forecast, sun position and cloud cover. Then describe the house below.</p>
      </div>
    );
  }
  if (weatherLoading && !weather) return <div className="panel p-4 muted text-sm">Fetching the forecast for {profile.location.label}…</div>;
  if (weatherError) return <div className="panel p-4 text-sm">Could not load weather ({weatherError}). Try again in a minute.</div>;
  if (!plan?.now) return null;

  const now = plan.now;
  const meta = ACTION_META[now.action];
  const wx = weather!.hourly[plan.startIndex];
  const savings = plan.totals.closedHvacCoolingWh + plan.totals.closedHvacHeatingWh - (plan.totals.coolingWh + plan.totals.heatingWh);
  const pct = plan.totals.closedHvacCoolingWh + plan.totals.closedHvacHeatingWh > 0 ? Math.round((100 * savings) / (plan.totals.closedHvacCoolingWh + plan.totals.closedHvacHeatingWh)) : 0;

  return (
    <div className="panel p-4" style={{ borderLeft: `6px solid ${meta.color}` }}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold">Right now: {meta.label}</h2>
        <span className="muted text-xs">{profile.location.label}</span>
      </div>
      <p className="text-sm mt-1">{now.reason}</p>
      <div className="grid grid-cols-3 gap-2 mt-3 text-sm">
        <Stat label="Outside" value={fmtTemp(wx.tempC, profile.units)} sub={`${wx.rh}% RH · dew ${fmtTemp(wx.dewPointC, profile.units)}`} />
        <Stat label="Inside (est.)" value={fmtTemp(now.indoorC, profile.units)} sub={profile.readings.indoorTempC !== undefined ? 'from your reading' : 'modelled'} />
        <Stat label="Air quality" value={wx.usAqi !== undefined ? `AQI ${Math.round(wx.usAqi)}` : 'n/a'} sub={wx.cloudCover >= 70 ? 'overcast' : wx.cloudCover >= 30 ? 'partly cloudy' : wx.isDay ? 'sunny' : 'clear night'} />
      </div>
      {pct > 0 && (
        <p className="muted text-xs mt-3">Following this plan uses about {pct}% less HVAC energy over the forecast than just leaving the house closed up on the thermostat.</p>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="muted text-xs">{label}</div>
      <div className="font-medium">{value}</div>
      {sub && <div className="muted text-xs">{sub}</div>}
    </div>
  );
}
