# Breeze Vibe

Tell it about your house and where it is. It pulls the live local weather and forecast, models how your house holds and sheds heat, and tells you hour by hour whether to open the windows, run the whole-house fan, or run the HVAC, all shown on an animated 3D model of your house.

Built for a two-day competition. Live at **breezevibe.site**. Fully usable without an account.

## Docs
- `docs/PLAN.md` — product scope, architecture, engine, build status, schedule, risks
- `docs/DECISIONS.md` — decision log and open questions
- `docs/PROMPTS.md` — every prompt from Steve, verbatim, in order
- `docs/TEST-HOUSE.md` — the first end-to-end test house
- `CLAUDE.md` — firm documentation rules for this repo

## Run it

```bash
pnpm install
pnpm dev          # http://localhost:3000, embedded PGlite database under ./data
pnpm test         # engine tests (Vitest)
pnpm build && pnpm start
```

No environment variables are required for local use. Weather, air quality and geocoding come from Open-Meteo and Nominatim with no API keys.

## Deploy (Steve's VPS behind Cloudflare)

The repo ships a multi-stage `Dockerfile` (Next.js standalone, port 3000) and a `docker-compose.yml` with a Postgres service for anyone who doesn't already run one.

| Env var | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string. **Set this in production.** Unset = embedded PGlite under `./data` (fine for dev, not for a multi-instance deploy). |
| `PGLITE_DIR` | Optional override for the PGlite directory. |
| `PORT` / `HOSTNAME` | Default `3000` / `0.0.0.0`. |

Health check: `GET /api/health` returns `{ ok: true, db: "postgres" | "pglite" }`.

Tables are created on first boot (`CREATE TABLE IF NOT EXISTS`), so no migration step is needed.

### CI/CD (webhook-pull)

- `.github/workflows/ci.yml` runs `pnpm install --frozen-lockfile` + `pnpm test` on every push and PR; on `main` it also builds the Docker image and checks `GET /api/health` returns 200.
- After green on `main`, the `notify-vps` job POSTs a GitHub-push-shaped payload (`after` = SHA, HMAC `X-Hub-Signature-256`) to the `breezevibe-deploy` hook on VPS-01, which runs `/opt/breezevibe/deploy.sh`. Nothing is rsynced or SSHed from CI.
- Requires repo secrets `DEPLOY_WEBHOOK_URL` and `DEPLOY_WEBHOOK_SECRET`; if either is missing the notify job skips with a warning and CI still passes.
- Production container listens on host `127.0.0.1:3060`; `DATABASE_URL` comes from `/opt/breezevibe/.env` (host Postgres role+db `breezevibe`). The compose `db` service is local-only.
- The VPS gates nginx on `GET /api/health` 200 before switching off the static placeholder.

**Cloudflare:** proxying is fine, but add a cache rule that **bypasses cache for `/api/*` and `/h/*`**. Responses there are per-session; edge-caching them would serve one visitor's house to another.

## How it works

1. **Location** is geocoded and rounded to about 1 km. The address string is never stored.
2. **The engine** (`src/engine`) derives air-tightness, insulation, thermal mass and glazing from year built, construction and retrofits, computes solar gain per wall from the real sun position, and models the attic, attic fan and whole-house fan separately.
3. **The planner** steps hour by hour through the forecast with a lumped-capacitance model and picks, per hour, one of: keep closed, open windows, run the whole-house fan, run the AC, run the heat, or ventilate briefly. Air-quality and humidity guards are hard constraints.
4. **Every assumption is editable** in the "What we assumed" panel.
5. **Saving:** a long-lived session cookie autosaves the house server-side; localStorage mirrors it; a `BV-XXX-XXX` share code moves it between devices.
