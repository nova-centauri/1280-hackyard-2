# Breeze Vibe — repo rules for Claude

## Firm documentation rules (set by Steve, 2026-09-11)

1. **All planning documents live in this repo, under `docs/`.** Never keep plans, decisions, schedules, or research anywhere else. If it informs the build, it goes in `docs/`.
2. **Every prompt Steve sends is appended verbatim, in order, to `docs/PROMPTS.md`** at the start of the turn that handles it. Number it, date it, do not edit or summarize the text.
3. **Docs are updated in the same commit as the work they describe.** A feature is not done until `docs/PLAN.md` (scope/status) and `docs/DECISIONS.md` (any decision made) reflect it.
4. **Decisions are logged, not implied.** Anything Steve locks in goes in `docs/DECISIONS.md` § Decided with the date and reason. Open questions go in § Pending until answered.
5. **Flag contradictions, don't silently override.** If a new instruction conflicts with something in `docs/`, say so and ask before changing the doc.

## Doc map
- `docs/PLAN.md` — product scope, architecture, engine, schedule, risks (living doc)
- `docs/DECISIONS.md` — decision log + pending questions
- `docs/PROMPTS.md` — Steve's prompts, verbatim, in order
- `docs/TEST-HOUSE.md` — Steve's house, the first end-to-end test fixture

## Project facts
- Product: **Breeze Vibe**, domain **breezevibe.site**
- Competition: 2 days, must be publicly usable without login
- Branch: `claude/home-temp-management-site-jnz8cn`; Steve deploys `main` → breezevibe.site via his own VPS + Cloudflare CI/CD
- Stack: Next.js (App Router) + TypeScript + Tailwind + React Three Fiber; SQLite via Drizzle on the VPS; Open-Meteo for weather/air/geocoding
