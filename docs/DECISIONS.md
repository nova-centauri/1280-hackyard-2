# Decision Log

Format: date, decision, why, status. Pending items at the bottom need Steve's answer.

## Decided

| Date | Decision | Why | Status |
|---|---|---|---|
| 2026-09-11 | Name **Breeze Vibe**, domain **breezevibe.site** | Steve's pick (Prompt 2). `.site` did not resolve on 2026-09-11. | **Locked** |
| 2026-09-11 | Sessions are the primary persistence; share codes cheap add-on; accounts are a stretch | Steve (Prompt 2). App must be fully usable without login; sign-in later claims the session's houses. | **Locked** |
| 2026-09-11 | Hosting: Steve's VPS behind Cloudflare; Steve owns CI/CD from `main` to breezevibe.site | Steve (Prompt 2). Repo ships Dockerfile + compose. | **Locked** |
| 2026-09-11 | Database: **Postgres** in production (the VPS already runs it) via Drizzle; **PGlite** (embedded Postgres) when `DATABASE_URL` is unset so local dev and tests need no service | Steve (Prompt 3, Q4). Same schema and queries in both. | **Locked** |
| 2026-09-11 | Units default from the geocoded country code, manual toggle available, browser locale before an address exists | Steve (Prompt 2). | **Locked** |
| 2026-09-11 | Address is required for weather/sun/cloud; only rounded lat/lon + timezone + country are stored | Steve (Prompt 2) + privacy. | **Locked** |
| 2026-09-11 | Home Assistant is the universal sensor layer; integration is push (HA → our webhook), not LAN discovery; post-competition | Browser pages cannot scan a LAN or call plain-HTTP HA (mixed content). | Proposed |
| 2026-09-11 | Attic fan and whole-house fan are modeled as two separate devices | Steve's house has both; they do different things. | Proposed |
| 2026-09-11 | Heating fuel is a user option: natural gas, propane, oil, electric, wood/pellet | Steve (Prompt 3, Q2). | **Locked** |
| 2026-09-11 | Deployment conventions default to port 3000, `DATABASE_URL` env var, `/api/health`; Steve adjusts CI/CD to match later | Steve (Prompt 3, Q5) deferred it. | Proposed |
| 2026-09-11 | Structural build first, visual pass second | Steve (Prompt 1). | **Locked** |
| 2026-09-11 | Two-panel layout everywhere; side-by-side desktop, stacked mobile | Steve (Prompt 1). | **Locked** |
| 2026-09-11 | All planning docs live in `docs/`; every prompt logged verbatim in `docs/PROMPTS.md` | Steve (Prompt 2). Rule recorded in root `CLAUDE.md`. | **Locked** |
| 2026-09-11 | 3D via three.js (React Three Fiber); Next.js + TypeScript + Tailwind | Steve specified three.js; rest is speed. | Proposed |
| 2026-09-11 | Open-Meteo for weather, air quality, and city/ZIP geocoding; Nominatim for street addresses | Free, keyless, hourly, has solar radiation and dew point, returns country code. | Proposed |
| 2026-09-11 | No room-layout editor for the competition | Low impact on advice, high time cost. | Proposed |

Superseded: Vercel + Supabase (v0.1 proposal) → replaced by VPS + SQLite per Prompt 2.

## Pending (need Steve; build proceeds on the default)

| # | Question | Default until answered | Answer |
|---|---|---|---|
| 1 | CI/CD conventions from the VPS side (port, env names, health check path) | Port 3000, `DATABASE_URL`, `/api/health` | Steve will report back |
| 2 | Tree shade on the SW/back side of the test house | None | |

## Answered (Prompt 3)
| Question | Answer |
|---|---|
| Whole-house fan | QuietCool Classic, 1,472 CFM |
| Furnace fuel | Natural gas; fuel is a user option for everyone |
| Orientation | Front faces NE |
| VPS runs Postgres? | Yes → Postgres in prod |
