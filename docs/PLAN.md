# Project Plan — Home Comfort Advisor (working title: **Homeostat**)

> Status: **DRAFT v0.1 — awaiting Steve's revisions before heavy build starts.**
> Competition constraint: 2 days, publicly usable at a purchased domain.
> Companion docs: `docs/DECISIONS.md` (decision log + open questions).

---

## 1. One-line pitch

Tell it about your house and where it is; it pulls the live local weather and tells you, hour by hour, whether to open the windows, run the fan, or run the HVAC, and shows it all on an animated 3D model of your house.

## 2. Name candidates

DNS-checked 2026-09-11. "TAKEN" = resolves. "free?" = does not resolve, so *probably* registrable, but verify at the registrar before buying.

| Candidate | Why it works | Best available domains |
|---|---|---|
| **Homeostat** (recommended) | Home + thermostat + homeostasis. Says exactly what it does, memorable, one word. | `homeostat.house` (fits the product perfectly), `homeostat.io`, `homeostat.co` |
| **Hometune** | "Tune your home like an instrument." Friendly, verb-able ("go tune your house"). | `hometune.app`, `hometune.io`, `hometune.house` |
| **Envelo** | Plays on "building envelope" (the actual engineering term). Sounds like a startup. Weaker at explaining itself. | `envelo.app`, `envelo.house` |
| **Draftwise** | Draft as in air leak. Clear but a bit negative. | `draftwise.house` only |
| **Openwindow** | Literal to the #1 user question. Generic, hard to own. | `openwindow.io`, `openwindow.house` |

Recommendation: **Homeostat** at `homeostat.house`. The `.house` TLD reads as a sentence and reinforces the product. Buy `homeostat.io` as well if it's cheap so the name isn't split. Registrar: Cloudflare Registrar or Porkbun (at-cost pricing, no upsell games). DNS points at Vercel.

## 3. What it does (product scope)

### Two-panel layout, always
- **Desktop:** side by side. Left = inputs and advice. Right = 3D house.
- **Mobile:** stacked. 3D house on top in a sticky panel (~40% of viewport), inputs and advice scroll underneath.

### Panel A — Inputs & advice (structural pass first)
1. **Location.** Address or ZIP or "use my location." We geocode to lat/lon, round it, and only keep the rounded coordinate plus timezone. We never store the raw address.
2. **House basics** (keep it short, every field drives the model):
   - Year built (drives baseline air-tightness and insulation)
   - Construction: wood frame, brick, concrete block, stone, steel/SIP, straw bale
   - Floors, finished square footage, basement/crawlspace/slab
   - Roof: attic (vented/unvented), flat, cathedral
   - Windows: single / double / triple pane, and "which side has the most glass" (N/E/S/W)
   - Retrofit flags: added insulation, air-sealed, new windows (each tightens the estimate)
   - Shading: trees / awnings / none
3. **HVAC & ventilation:**
   - Heating: furnace (gas/oil/electric), boiler + radiators, heat pump, mini-split, baseboard, wood stove, none
   - Cooling: central AC, heat pump, mini-split, window units, evaporative, none
   - Extras: **whole-house fan**, ceiling fans, ERV/HRV, bath/kitchen exhaust, dehumidifier
4. **Comfort envelope:** desired indoor min/max temp, humidity comfort range, plus a "prefer fresh air" vs "prefer efficiency" slider.
5. **Indoor readings (optional, manual first):** current indoor temp, humidity, CO2, PM2.5. Sensor integrations come later (see §7).
6. **Advice output:**
   - A **24–48h timeline**: per hour, one of *Open windows / Close up / Whole-house fan / Run AC / Run heat / Ventilate for air quality / Do nothing*, with a one-line reason.
   - A **"right now" card** with the top action and why.
   - A **projected indoor temp curve** for "follow the advice" vs "do nothing" vs "windows closed + HVAC."
   - Air-quality guard: never says "open windows" when outdoor AQI is bad (wildfire smoke, ozone) and never says "close up" when indoor CO2 is high and outdoor air is clean.
   - Humidity guard: won't recommend night-flush cooling when the outdoor dew point is above the comfort range.

### Panel B — 3D house (structural pass now, visual pass later)
- **v1 (day 1):** procedural house from the inputs. Footprint from sq ft ÷ floors, stacked floors, roof type, window strips on the "most glass" side, material tint. Sky dome and sun position from real time + lat/lon. Cloud cover dims the sun. Wind arrows when windows are open.
- **v2 (day 2 visual pass):** construction animation as inputs change (timbers for wood, courses of brick/block for masonry), heat-radiation glow on sun-facing surfaces scaled to solar gain, interior air tinted by state (blue = below comfort band, red = above, yellow = stale/poor air, green = good), whole-house fan pulling a visible air stream through the attic.

### Saving
- **Autosave** to localStorage on every change so refresh/return just works.
- **Save code:** "Save" posts the profile to the server and returns a short code (e.g. `BRICK-7Q2M`). Paste it back on any device to load. Also a shareable URL `/h/BRICK-7Q2M`.
- **Accounts (stretch, day 2 if time):** magic-link email sign-in that links save codes to an account. Not required to use the site.

## 4. Architecture

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript** | One repo for UI + API routes, deploys to Vercel in minutes. |
| Styling | Tailwind CSS | Fast, responsive two-panel grid is trivial. |
| 3D | **three.js via React Three Fiber + drei** | Declarative scene tied to React state; house rebuilds when inputs change. |
| State | Zustand store holding one `HouseProfile` JSON | Single serializable object = trivial save/load/share. |
| Weather | **Open-Meteo** forecast API (free, no key): hourly temp, humidity, dew point, cloud cover, shortwave radiation, wind, `timezone=auto` | Everything the model needs, no signup, 10k req/day. Server-side cache per rounded lat/lon for 15 min. |
| Outdoor air | **Open-Meteo Air Quality** API (PM2.5, ozone, US AQI) | Same provider, same cache. |
| Geocoding | Open-Meteo geocoding for city/ZIP; Nominatim (OSM) for full street addresses; browser geolocation button | Free. Nominatim asks for 1 req/s, fine at hackathon volume. |
| Persistence | **Supabase** (Postgres + row-level security + magic-link auth) | One service gives us save codes today and accounts tomorrow. Table: `profiles(code text pk, data jsonb, owner uuid null, created_at, updated_at)`. |
| Hosting | **Vercel** | Free tier, custom domain, HTTPS, edge caching. |
| Tests | Vitest on the physics engine | The engine is the one thing that must be right; the UI can be eyeballed. |

Repo layout (planned):
```
docs/            planning docs (this file, decisions, later: physics notes)
src/app/         Next.js routes: / (app), /h/[code] (load a saved house), /api/weather, /api/save, /api/load
src/components/  panels, forms, timeline, charts
src/scene/       R3F house scene, materials, weather sky, animations
src/engine/      pure TS physics model + recommendation planner (no React, fully unit-tested)
src/lib/         weather client, geocoding, supabase client, units
```

## 5. The engine (what makes the advice real)

A lumped-capacitance thermal model, run hourly over the forecast. It's an *advisor*, not an energy audit, and the UI will say so.

**Derived from inputs:**
- **Air-tightness (ACH50)** from year built × construction, tightened by retrofit flags. Rough table: pre-1950 ≈ 15–20, 1950–79 ≈ 10–12, 1980–99 ≈ 7, 2000–09 ≈ 5, 2010+ ≈ 3, air-sealed ≈ ×0.6, new windows ≈ ×0.85. Natural infiltration ACH ≈ ACH50 / N, with N ≈ 15–25 depending on stories, wind shielding and climate (LBL method).
- **Envelope conductance UA (W/K)** from wall/roof/window areas × R-values by construction and era, plus infiltration conductance ≈ 0.33 × ACH × volume.
- **Thermal mass C (J/K)** from construction (masonry ≫ wood frame). This is what tells us whether a night flush will actually carry through the next afternoon.
- **Solar gain** = glazed area on each face × hourly shortwave radiation × orientation factor × SHGC × (1 − shading) × cloud adjustment.
- **Internal gains** from occupants (a default of 2, editable) and a baseline appliance load.

**Per hour, for each candidate action:**
`dT/dt = (Q_solar + Q_internal + Q_hvac + UA·(T_out − T_in) + Q_vent·(T_out − T_in)) / C`
where `Q_vent` depends on the action: closed = infiltration only; windows open = wind- and stack-driven ACH (≈ 3–8); whole-house fan = fan CFM converted to ACH (default 2–3 CFM per sq ft).

**Planner:** greedy hour-by-hour search that keeps `T_in` inside the comfort band at minimum energy, with the air-quality and humidity guards as hard constraints. Outputs the timeline. Season is inferred from the forecast, not the calendar, so a warm week in October still gets night-flush advice.

**Calibration (stretch):** if the user has indoor readings, compare predicted vs observed drift and nudge UA and C. This is the hook that makes a sensor feed valuable later.

## 6. Two-day schedule

**Day 1 — make it work**
- AM: scaffold Next.js + Tailwind + R3F. Two-panel responsive layout. `HouseProfile` type + Zustand store + localStorage autosave. Input wizard (location → house → HVAC → comfort → readings).
- AM: engine v1 with Vitest tests (ACH table, UA, solar gain, one-hour step, planner on a canned forecast).
- PM: Open-Meteo weather + air quality client with server cache. Geocoding. Timeline + "right now" card + projected temperature chart.
- PM: 3D house v1 (procedural box house, materials, floors, roof, windows, real sun position, cloud dimming).
- Evening: Supabase save/load by code, `/h/[code]` route. Deploy to Vercel on a temporary URL. First end-to-end test on Steve's house (whole-house fan case).

**Day 2 — make it right, then make it pretty**
- AM: edge cases: whole-house fan, wildfire-smoke AQI, high dew point, heat-pump lockout temps, basement/attic. Mobile QA. Units toggle (°F default, °C available).
- AM (if on schedule): magic-link accounts.
- PM: **visual pass.** Construction animation per material, heat glow, air tint by state, fan airflow, page polish, landing copy, favicon/OG image.
- PM: buy domain, point DNS, final deploy, disclaimer copy, README, smoke test from a phone on cellular.

## 7. Deliberately out of scope for the competition (and why)

- **Room-by-room layout editor.** Big time sink, small effect on the advice. We use floor count + footprint; per-room detail becomes "zones per floor" later.
- **Live sensor integrations.** Manual entry now. Later: PurpleAir and AirGradient have public APIs, Awair has a local API, Airthings has a cloud API. A generic "paste a JSON URL" or webhook is the cheapest universal option. Need to know which sensor Steve owns to pick the first one.
- **Smart-thermostat control.** Advice only; we never touch the HVAC.
- **Utility-rate / cost modelling.** Would be nice ("this saves ~$1.40 today") but needs rate data. Stretch if day 2 goes well.

## 8. Risks and blunt flags

- **The 3D construction animations are the biggest schedule risk.** Timbers-and-bricks assembly is genuinely cool, but it's day-2-afternoon work at best. If day 1 slips, the visual pass shrinks to material tints + heat glow + air tint, which still demos well. Protect the engine and the advice first, exactly as you said.
- **Accounts on day 1 would be a mistake.** Magic-link means email deliverability, redirect URLs, and RLS policies. Save codes cover the "come back later" requirement fully. Accounts are day-2-if-time.
- **Physics credibility.** Judges may include someone who knows building science. The model is heuristic; the copy must say "estimate" and show its assumptions (e.g. "we estimated your house at ~7 ACH50 because it's 1985 wood frame with no air-sealing — adjust if you've had a blower-door test"). Exposing the assumption as an editable field turns a weakness into a feature.
- **Address privacy.** Public site, strangers typing home addresses. Round coordinates to ~1 km, never persist the address string, say so in the UI.
- **Time zones.** Hourly advice is useless if it's in UTC. Everything runs in the house's timezone from the weather API.
- **Free API limits.** Open-Meteo is generous but a viral demo could hit it. Server-side cache keyed on rounded coordinates handles it.

## 9. Open questions for Steve

See `docs/DECISIONS.md` § Pending. The ones that change what gets built first:
1. Name + TLD pick (Homeostat at `homeostat.house` is the recommendation).
2. Save codes only for the competition, with accounts as stretch? (Recommended yes.)
3. Vercel + Supabase OK? Do you already have accounts, or should the build assume fresh free-tier signups?
4. Your house details for the first test case (year, construction, floors, sq ft, HVAC, whole-house fan CFM if known, window type).
5. Which air-quality sensor do you own? (Decides the first integration after the competition.)
6. What are the judging criteria? Any rule against paid services or against requiring accounts?
