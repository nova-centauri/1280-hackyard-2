import type { Action, HourResult, HourlyWeather, PlanResult, SimInput } from './types';
import { dewPointC, stepHour, type StepEnv } from './simulate';

const AQI_LIMIT = 100;
const PM25_LIMIT = 35;

export function plan(input: SimInput): PlanResult {
  const { profile, params, geometry, weather, nowIndex } = input;
  const hours = weather.hourly;
  const env: StepEnv = {
    profile,
    params,
    geo: geometry,
    utcOffsetSeconds: weather.utcOffsetSeconds,
    groundC: groundTemp(hours),
  };
  const { minC, maxC } = profile.comfort;
  const center = (minC + maxC) / 2;
  const hasCooling = profile.hvac.cooling !== 'none';
  const hasHeating = profile.hvac.heating !== 'none';
  const hasWhf = (profile.hvac.wholeHouseFanCfm ?? 0) > 0;
  const rhMaxDew = dewPointC(maxC, profile.comfort.rhMax);
  const co2High = (profile.readings.co2Ppm ?? 0) > 1000;
  const fresh = profile.comfort.freshAirPreference;

  const start = startTemp(input, center);
  const results: HourResult[] = [];
  const doNothing: number[] = [];
  const closedHvac: number[] = [];
  let tPlan = start, tNothing = start, tClosed = start;
  let heatingWh = 0, coolingWh = 0, closedH = 0, closedC = 0;

  let prev: Action = 'closed';
  for (let i = nowIndex; i < hours.length; i++) {
    const wx = hours[i];
    // Baselines
    tNothing = stepHour(env, wx, 'closed', tNothing).indoorC;
    doNothing.push(tNothing);
    {
      const passive = stepHour(env, wx, 'closed', tClosed);
      let out = passive;
      if (hasCooling && passive.indoorC > maxC) out = stepHour(env, wx, 'ac', tClosed);
      else if (hasHeating && passive.indoorC < minC) out = stepHour(env, wx, 'heat', tClosed);
      tClosed = out.indoorC;
      if (out.hvacWh > 0) closedH += out.hvacWh; else closedC += -out.hvacWh;
      closedHvac.push(tClosed);
    }

    // Guards on opening up
    const aqiBad = (wx.usAqi ?? 0) > AQI_LIMIT || (wx.pm25 ?? 0) > PM25_LIMIT;
    const humid = wx.dewPointC > rhMaxDew;
    const tooCold = wx.tempC < minC - 6;
    const hotDayAhead = maxOutdoor(hours, i, 24) > maxC + 2;
    const coolTarget = hotDayAhead ? minC + 0.5 : center;

    const candidates: Action[] = ['closed'];
    if (!aqiBad && !tooCold) {
      candidates.push('windows');
      if (hasWhf) candidates.push('whf');
    }
    if (hasCooling) candidates.push('ac');
    if (hasHeating) candidates.push('heat');
    if (co2High && !aqiBad) candidates.push('ventilate');

    const sims = new Map(candidates.map((a) => [a, stepHour(env, wx, a, tPlan)] as const));
    const inBand = (t: number) => t >= minC - 0.3 && t <= maxC + 0.3;

    let choice: Action = 'closed';
    let reason = 'Closed up holds the temperature.';
    let guarded: HourResult['guarded'];
    const closedT = sims.get('closed')!.indoorC;
    const windowsT = sims.get('windows')?.indoorC;
    const whfT = sims.get('whf')?.indoorC;

    const passiveOpts = (['closed', 'windows', 'whf'] as Action[]).filter((a) => sims.has(a));
    const passiveInBand = passiveOpts.filter((a) => inBand(sims.get(a)!.indoorC));

    if (tPlan > coolTarget + 0.3 && wx.tempC < tPlan - 0.5 && !humid) {
      // Warm inside, cooler outside: passive cooling wants to happen.
      const best = pickCoolest(sims, passiveInBand.length ? passiveInBand : passiveOpts);
      if (best === 'whf' && whfT !== undefined && whfT < closedT - 0.15) {
        choice = 'whf';
        reason = hotDayAhead
          ? `Run the whole-house fan: it is ${fmtDelta(tPlan - wx.tempC)} cooler outside and tomorrow is hot, so pre-cool the house tonight.`
          : `Run the whole-house fan: it is ${fmtDelta(tPlan - wx.tempC)} cooler outside than in.`;
      } else if (best === 'windows' && windowsT !== undefined && windowsT < closedT - 0.15) {
        choice = 'windows';
        reason = `Open the windows: outside air is ${fmtDelta(tPlan - wx.tempC)} cooler and dry enough.`;
      }
    } else if (tPlan > coolTarget + 0.3 && wx.tempC < tPlan - 0.5 && humid) {
      guarded = 'humidity';
      reason = `Keep windows shut: outside air is cooler but too humid (dew point ${wx.dewPointC.toFixed(0)} °C).`;
    }

    // Fresh-air preference: open when outdoor air is simply comfortable and clean.
    if (choice === 'closed' && fresh >= 0.6 && !aqiBad && !humid && wx.tempC >= minC && wx.tempC <= maxC && windowsT !== undefined && inBand(windowsT)) {
      choice = 'windows';
      reason = 'Outside is comfortable and clean; open up for fresh air.';
    }

    // Does the chosen passive option keep us in band? If not, HVAC. Thermostat hysteresis: once
    // HVAC is running, keep it running until the house would comfortably coast on its own.
    const chosenT = sims.get(choice)!.indoorC;
    const stayOnAc = prev === 'ac' && choice === 'closed' && chosenT > maxC - 0.3;
    const stayOnHeat = prev === 'heat' && choice === 'closed' && chosenT < minC + 0.3;
    if (chosenT > maxC + 0.3 || stayOnAc) {
      if (hasCooling) {
        choice = 'ac';
        reason = aqiBad && wx.tempC < tPlan
          ? 'Run the AC: outside is cooler but the air quality is poor, so keep the house sealed.'
          : `Run the AC: passive options would leave the house at ${fmtTemp(chosenT, profile.units)}.`;
        if (aqiBad && wx.tempC < tPlan) guarded = 'aqi';
      } else {
        reason += ' No cooling available; this is the best passive option.';
      }
    } else if (chosenT < minC - 0.3 || stayOnHeat) {
      if (hasHeating) {
        choice = 'heat';
        reason = `Run the heat: the house would drift to ${fmtTemp(chosenT, profile.units)}.`;
      } else {
        choice = 'closed';
        reason = 'Keep closed up; no heating available.';
      }
    }

    // Air-quality ventilation overrides a "closed" hour when indoor CO2 is high and outdoor air is clean.
    if (choice === 'closed' && co2High && sims.has('ventilate')) {
      const vT = sims.get('ventilate')!.indoorC;
      if (inBand(vT)) {
        choice = 'ventilate';
        reason = 'Indoor CO₂ is high and outdoor air is clean: crack windows for 20 minutes.';
      }
    }
    if (choice === 'closed' && aqiBad && wx.tempC < tPlan && tPlan > center) guarded = 'aqi';
    if (choice === 'closed' && guarded === 'aqi') reason = `Keep windows shut: outdoor air quality is poor (AQI ${wx.usAqi ?? '?'}).`;
    if (choice === 'closed' && tooCold && tPlan > center && wx.tempC < tPlan) { guarded = 'cold'; reason = 'Keep closed: it is cold outside; the house will coast down on its own.'; }

    const s = sims.get(choice)!;
    prev = choice;
    tPlan = s.indoorC;
    if (s.hvacWh > 0) heatingWh += s.hvacWh; else coolingWh += -s.hvacWh;
    results.push({ time: wx.time, action: choice, reason, indoorC: tPlan, outdoorC: wx.tempC, hvacWh: s.hvacWh, guarded, solarGainW: s.solarGainW, atticC: s.atticC });
  }

  return {
    hours: results,
    doNothingC: doNothing,
    closedHvacC: closedHvac,
    totals: { heatingWh, coolingWh, closedHvacHeatingWh: closedH, closedHvacCoolingWh: closedC },
    season: inferSeason(hours, profile.comfort.minC, profile.comfort.maxC),
    startIndex: nowIndex,
    now: results[0] ?? null,
  };
}

function pickCoolest(sims: Map<Action, { indoorC: number }>, opts: Action[]): Action {
  let best = opts[0];
  for (const a of opts) if (sims.get(a)!.indoorC < sims.get(best)!.indoorC) best = a;
  return best;
}

function startTemp(input: SimInput, center: number) {
  if (input.startIndoorC !== undefined) return input.startIndoorC;
  const r = input.profile.readings;
  if (r.indoorTempC !== undefined) return r.indoorTempC;
  const wx = input.weather.hourly[input.nowIndex];
  const { minC, maxC } = input.profile.comfort;
  // Without a reading, assume the house is somewhere between outdoor and the comfort band.
  return wx ? Math.min(maxC + 1, Math.max(minC - 1, (wx.tempC + center) / 2)) : center;
}

function groundTemp(hours: HourlyWeather[]) {
  if (!hours.length) return 12;
  const mean = hours.reduce((s, h) => s + h.tempC, 0) / hours.length;
  // Ground lags air; pull toward an annual-ish mean.
  return 0.5 * mean + 0.5 * 12;
}

function maxOutdoor(hours: HourlyWeather[], from: number, span: number) {
  let m = -Infinity;
  for (let i = from; i < Math.min(hours.length, from + span); i++) m = Math.max(m, hours[i].tempC);
  return m;
}

function inferSeason(hours: HourlyWeather[], minC: number, maxC: number): PlanResult['season'] {
  if (!hours.length) return 'shoulder';
  const mean = hours.reduce((s, h) => s + h.tempC, 0) / hours.length;
  if (mean < minC - 4) return 'heating';
  if (mean > maxC - 2) return 'cooling';
  return 'shoulder';
}

const fmtDelta = (dC: number) => `${Math.abs(dC).toFixed(0)}°`;
const fmtTemp = (c: number, units: 'F' | 'C') => (units === 'F' ? `${Math.round(c * 1.8 + 32)} °F` : `${c.toFixed(1)} °C`);
