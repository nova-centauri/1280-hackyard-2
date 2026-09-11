# Breeze Vibe — Project Plan

> Status: **v0.3 — all open questions answered (Prompt 3). Day 1 build in progress.**
> Competition constraint: 2 days, publicly usable at **breezevibe.site** with no login required.
> Companion docs: `docs/DECISIONS.md`, `docs/PROMPTS.md`, `docs/TEST-HOUSE.md`. Rules in root `CLAUDE.md`.

---

## 1. One-line pitch

Tell Breeze Vibe about your house and where it is. It pulls the live local weather and forecast, models how your house holds and sheds heat, and tells you hour by hour whether to open the windows, run the whole-house fan, or run the HVAC, all shown on an animated 3D model of your house.

## 2. Name and domain (locked)

**Breeze Vibe** at **breezevibe.site**. DNS-checked 2026-09-11: `breezevibe.site` does not resolve, so it should be registrable; `breezevibe.com` is taken. Steve owns registration and DNS on Cloudflare.

## 3. What it does (product scope)

### Two-panel layout, always
- **Desktop:** side by side. Left = inputs and advice. Right = 3D house.
- **Mobile:** stacked. 3D house on top in a sticky panel (~40% of viewport), inputs and advice scroll underneath.

### Panel A — Inputs & advice (structural pass first)
1. **Location.** Full address, ZIP/postcode, or "use my location." We geocode to lat/lon and keep only the rounded coordinate (~1 km), timezone, and country code. The raw address string is never stored. The country code sets the **default units** (°F for US, °C elsewhere) with a manual toggle; before an address is entered the browser locale decides.
2. **House basics** (short; every field drives the model):
   - Year built (baseline air-tightness and insulation)
   - Construction: wood frame, brick, concrete block, stone, steel/SIP, straw bale
   - Floors, finished square footage
   - Foundation: basement / crawlspace / slab (a house can have a mix; v1 takes the dominant one and flags the rest)
   - Roof: attic (vented/unvented), flat, cathedral
   - Windows: single / double / triple pane, and "which side has the most glass" (N/E/S/W)
   - Retrofit flags: added insulation, air-sealed, new windows
   - Shading: trees / awnings / none
3. **HVAC & ventilation:**
   - Heating: furnace (natural gas / propane / oil / electric), boiler + radiators, heat pump, mini-split, baseboard, wood stove, none
   - Cooling: central AC, heat pump, mini-split, window units, evaporative, none
   - Extras: **whole-house fan** (with CFM, defaulted from sq ft), **attic fan** (separate device, separate effect), ceiling fans, ERV/HRV, bath/kitchen exhaust, dehumidifier
4. **Comfort envelope:** desired indoor min/max temp, humidity comfort range, and a "prefer fresh air" ↔ "prefer efficiency" slider.
5. **Indoor readings (optional, manual first):** current indoor temp, humidity, CO2, PM2.5. Home Assistant push integration comes after the competition (§7).
6. **Advice output:**
   - **24–48h timeline**: per hour, one of *Open windows / Close up / Whole-house fan / Run AC / Run heat / Ventilate for air quality / Do nothing*, with a one-line reason.
   - **"Right now" card** with the top action and why.
   - **Projected indoor temp curve** for "follow the advice" vs "do nothing" vs "closed up + HVAC."
   - **Assumptions panel**: every derived number (ACH50, R-values, fan CFM, thermal mass class) shown and editable. This is the credibility feature.
   - Air-quality guard: never "open windows" when outdoor AQI is bad; never "close up" when indoor CO2 is high and outdoor air is clean.
   - Humidity guard: no night-flush advice when the outdoor dew point is above the comfort range.

### Panel B — 3D house (structural pass now, visual pass later)
- **v1 (day 1):** procedural house from the inputs. Footprint from sq ft ÷ floors, stacked floors, roof type, window strips on the "most glass" side, material tint. Sky dome and sun position from real time + lat/lon. Cloud cover dims the sun. Wind arrows when windows are open.
- **v2 (day 2 visual pass):** construction animation as inputs change (timbers for wood, courses of brick/block for masonry), heat-radiation glow on sun-facing surfaces scaled to solar gain, interior air tinted by state (blue = below comfort band, red = above, yellow = stale/poor air, green = good), whole-house fan pulling a visible air stream through the attic, attic fan exhausting the attic.

### Saving — sessions first (locked)
Anyone can load the site and use everything without logging in. Persistence layers, in priority order:

1. **Server session (primary, day 1).** First visit sets a long-lived (1 year) httpOnly, Secure, SameSite=Lax cookie holding a random 256-bit session id. Every change to the house profile debounces and PUTs to `/api/house`, keyed by that session. Come back on the same browser next week and the house is there. No UI, no friction.
2. **localStorage mirror (day 1).** Instant restore on reload and a fallback if the network is down; reconciled against the server copy by `updated_at`.
3. **Share / transfer code (day 1, cheap).** "Save & share" mints a short code (e.g. `BREEZE-7Q2M`) pointing at a snapshot of the same row. Paste it on another device or share `/h/BREEZE-7Q2M`. This is what gets a phone session onto a desktop.
4. **Accounts (stretch, day 2 if on schedule).** Magic-link email sign-in. Signing in **claims** the current session's houses onto the account, so nothing is lost and nobody is forced to sign up first.

## 4. Architecture

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript** | UI + API routes in one deployable. |
| Styling | Tailwind CSS | Fast responsive two-panel grid. |
| 3D | **three.js via React Three Fiber + drei** | Declarative scene bound to React state. |
| State | Zustand store holding one `HouseProfile` JSON | Single serializable object = trivial save/load/share. |
| Database | **Postgres via Drizzle ORM** in production (VPS already runs it). **PGlite** (embedded Postgres, WASM) whenever `DATABASE_URL` is unset, so local dev and tests need no service. | Same pg schema both ways; no SQLite dialect drift. |
| Weather | **Open-Meteo** forecast API (free, no key): hourly temp, humidity, dew point, cloud cover, shortwave radiation, wind, `timezone=auto` | Everything the model needs. Server-side cache per rounded lat/lon, 15 min. |
| Outdoor air | **Open-Meteo Air Quality** API (PM2.5, ozone, US AQI) | Same provider, same cache. |
| Geocoding | Open-Meteo geocoding for city/ZIP; Nominatim (OSM) for street addresses; browser geolocation button | Free. Returns country code for units. |
| Auth (stretch) | Auth.js with an email provider, or a hand-rolled magic link | Needs SMTP; deferred. |
| Hosting | **Steve's VPS behind Cloudflare.** Repo ships a `Dockerfile` (Next.js standalone) + `docker-compose.yml` (app + Postgres, for anyone without one). Steve wires CI/CD from `main`. | Steve's call. |
| Tests | Vitest on the engine | The engine is the one thing that must be right. |

**Cloudflare notes for Steve:** proxy on (orange cloud) is fine, but add a cache rule to **bypass cache on `/api/*`** and on `/h/*`, otherwise one user's house can be served to another. Weather caching is in-process on the VPS, not at the edge.

Repo layout (planned):
```
docs/            planning docs, decision log, prompt log, test house
src/app/         Next.js routes: / (app), /h/[code] (shared house), /api/house, /api/share, /api/weather, /api/geocode
src/components/  panels, forms, timeline, charts, assumptions panel
src/scene/       R3F house scene, materials, weather sky, animations
src/engine/      pure TS physics model + planner (no React, fully unit-tested), fixtures/
src/db/          Drizzle pg schema + migrations (sessions, houses, share_codes, users*); PGlite or Postgres by env
src/lib/         weather client, geocoding, units, session cookie helpers
Dockerfile, docker-compose.yml
```

Data model (v1):
```
sessions     id (pk, random 256-bit) · created_at · last_seen_at · user_id (null until claimed)
houses       id · session_id · data (json HouseProfile) · updated_at
share_codes  code (pk, e.g. BREEZE-7Q2M) · house_snapshot (json) · created_at
users*       id · email · created_at            (*stretch)
```

## 5. The engine

A lumped-capacitance thermal model run hourly over the forecast. It's an *advisor*, not an energy audit, and the UI says so.

**Derived from inputs:**
- **Air-tightness (ACH50)** from year built × construction, tightened by retrofit flags. Table: pre-1950 ≈ 15–20, 1950–79 ≈ 10–12, 1980–99 ≈ 7, 2000–09 ≈ 5, 2010+ ≈ 3; air-sealed ×0.6, new windows ×0.85. Natural ACH ≈ ACH50 / N with N ≈ 15–25 by stories, shielding, climate (LBL method).
- **Envelope conductance UA (W/K)** from wall/roof/window areas × era/construction R-values, plus infiltration ≈ 0.33 × ACH × volume.
- **Thermal mass C (J/K)** by construction (masonry ≫ wood frame). Decides whether a night flush carries through the next afternoon.
- **Solar gain** = glazed area per face × hourly shortwave radiation × orientation factor × SHGC × (1 − shading) × cloud adjustment.
- **Attic model:** attic temperature rises with roof solar gain; ceiling heat gain ∝ (T_attic − T_in) / R_ceiling. An **attic fan** pulls T_attic toward T_out. A **whole-house fan** is a ventilation term on the living space (fan CFM → ACH) and also flushes the attic.
- **Internal gains** from occupants (default 2, editable) and baseline appliances.

**Per hour, per candidate action:**
`dT/dt = (Q_solar + Q_internal + Q_ceiling + Q_hvac + UA·(T_out − T_in) + Q_vent·(T_out − T_in)) / C`
where `Q_vent` depends on the action: closed = infiltration only; windows open = wind/stack-driven ACH ≈ 3–8; whole-house fan = rated CFM as ACH.

**Planner:** greedy hour-by-hour search keeping `T_in` inside the comfort band at minimum energy, with the air-quality and humidity guards as hard constraints. Season is inferred from the forecast, not the calendar.

**Calibration (stretch):** with indoor readings, compare predicted vs observed drift and nudge UA and C. This is what makes the Home Assistant feed valuable.

## 6. Build status (updated every commit)

| Piece | Status |
|---|---|
| Next.js scaffold, Tailwind, deps | done |
| Engine: derive, solar, simulate, planner | done, 21 Vitest tests green, validated on Steve's house |
| Weather / air quality / geocoding clients | done, live against Open-Meteo and Nominatim |
| DB (Drizzle, PGlite/Postgres) + session cookie | done, smoke-tested (cookie, autosave, share code) |
| API routes | done: health, house, share, share/[code], weather, geocode |
| Two-panel UI + forms + timeline + chart + assumptions | done (structural pass), verified in headless Chromium on desktop and mobile |
| 3D house v1 | done: procedural floors/roof/windows, real sun, cloud dimming, air-tinted windows, heat glow on sun-facing walls, breeze particles, grow-in animation |
| Dockerfile / compose | written; Docker not available in the build sandbox, so the image is untested until Steve's VPS builds it |
| CI/CD (`.github/workflows/ci.yml`) | done: `pnpm test` on push + PR; on `main` docker build + `/api/health` smoke, then `breezevibe-deploy` webhook POST to VPS-01 (skips with a warning until `DEPLOY_WEBHOOK_URL`/`DEPLOY_WEBHOOK_SECRET` are set) |
| Accounts (stretch) | not started |
| Home Assistant push | post-competition |
| Visual pass (v2) | day 2 |

## 7. Two-day schedule

**Day 1 — make it work**
- AM: scaffold Next.js + Tailwind + R3F + Drizzle (PGlite locally, Postgres in prod). Two-panel responsive layout. `HouseProfile` type + Zustand + localStorage mirror. Session cookie + `/api/house` autosave. Input wizard (location → house → HVAC → comfort → readings).
- AM: engine v1 with Vitest tests (ACH table, UA, solar gain, attic, one-hour step, planner on a canned forecast) using `docs/TEST-HOUSE.md` as the first fixture.
- PM: Open-Meteo weather + air quality + geocoding with server cache. Units from country code. Timeline + "right now" card + projected temperature chart + assumptions panel.
- PM: 3D house v1 (procedural box house, materials, floors, roof, windows, real sun position, cloud dimming).
- Evening: share codes + `/h/[code]`. `Dockerfile` + `docker-compose.yml`. Hand Steve a runnable image so he can wire CI/CD overnight. First end-to-end run on Steve's house.

**Day 2 — make it right, then make it pretty**
- AM: edge cases: whole-house fan vs attic fan, wildfire-smoke AQI, high dew point, mixed foundation, heat-pump lockout temps. Mobile QA on a real phone. Cloudflare cache-bypass check on `/api/*`.
- AM (if on schedule): magic-link accounts with session claiming.
- PM: **visual pass.** Construction animation per material, heat glow, air tint by state, fan airflow, page polish, landing copy, favicon/OG image.
- PM: final deploy to breezevibe.site, disclaimer copy, README, smoke test from a phone on cellular.

## 8. After the competition

- **Home Assistant integration (first post-competition feature).** Home Assistant is the universal layer, agreed. Two ways to connect, and only one of them actually works from a public website:
  - *Push (recommended).* Breeze Vibe gives the user a per-house webhook URL + token and a ready-to-paste Home Assistant `rest_command` + automation that POSTs the chosen sensor entities every few minutes. Works from anywhere, no CORS, no exposed HA, no mixed-content problem.
  - *Pull / LAN discovery (not feasible from a browser).* A page served over HTTPS from breezevibe.site cannot scan the LAN, cannot use mDNS, and is blocked by browsers from calling an `http://homeassistant.local` API (mixed content). It could only work if HA is already exposed over HTTPS (Nabu Casa or a reverse proxy) *and* the user adds our origin to HA's CORS allowlist. Too fragile to be the default. **Recommendation: push only.**
- **Room-by-room zones.** v1 uses floors + footprint. Zones per floor (e.g. Steve's slab side room) come later; a full layout editor probably never.
- **Cost estimates** ("this saves ~$1.40 today") once a utility-rate input exists.
- **Smart-thermostat control** is out of scope permanently. Advice only.

## 9. Risks and blunt flags

- **3D construction animations are the biggest schedule risk.** Timbers-and-bricks is day-2-afternoon work. If day 1 slips, the visual pass shrinks to material tint + heat glow + air tint, which still demos well. Engine and advice first.
- **Accounts on day 1 would be a mistake.** Sessions + share codes satisfy every "come back later" requirement without email deliverability, SMTP, or redirect debugging. Accounts are day-2-if-time. (Locked in Prompt 2.)
- **Deploy is now on the critical path and out of my hands.** Steve owns the VPS CI/CD. I will hand over a Dockerfile and compose file on day 1 evening so there is a full day of slack. If the pipeline isn't up by day 2 noon, we need a fallback (a manual `docker compose up` on the VPS is fine).
- **Cloudflare edge caching of API responses** would leak one user's house to another. Cache rule bypass on `/api/*` and `/h/*` is mandatory before going public.
- **Physics credibility.** Heuristic model, judges may know building science. The editable assumptions panel turns the weakness into a feature.
- **Address privacy.** Round coordinates to ~1 km, never persist the address string, say so in the UI.
- **Low-CFM whole-house fan.** Steve's QuietCool Classic is 1,472 CFM, about 5 ACH on his house. That is a run-all-night device, not a 15-minute flush. The planner must handle both regimes: low-CFM fans get long overnight windows, big fans get short bursts.

## 10. Open questions for Steve

All Prompt 2 questions were answered in Prompt 3. Remaining, non-blocking:
1. ~~CI/CD conventions from the VPS side~~ — answered in Prompt 6 (webhook-pull, host `127.0.0.1:3060`, `DATABASE_URL` from `/opt/breezevibe/.env`, `/api/health` gate). See `docs/DECISIONS.md`.
2. Tree shade on the SW side of the test house. Default: none.
3. VPS-01 must register the `breezevibe-deploy` hook and hand over `DEPLOY_WEBHOOK_URL` + `DEPLOY_WEBHOOK_SECRET` as repo secrets before the notify job does anything.
