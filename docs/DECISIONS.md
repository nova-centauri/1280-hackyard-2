# Decision Log

Format: date, decision, why, status. Newest first. Pending items at the bottom need Steve's answer.

## Decided

| Date | Decision | Why | Status |
|---|---|---|---|
| 2026-09-11 | Structural build first, visual pass second | Steve's call: prove the advice works before stacking visuals. | Confirmed by Steve |
| 2026-09-11 | Two-panel layout everywhere; side-by-side desktop, stacked mobile | Steve's core UX vision. | Confirmed by Steve |
| 2026-09-11 | 3D via three.js (React Three Fiber) | Steve specified three.js. R3F keeps it in React. | Proposed |
| 2026-09-11 | Next.js + TypeScript + Tailwind on Vercel | Fastest path to a public URL with API routes in one repo. | Proposed |
| 2026-09-11 | Open-Meteo for weather, air quality, and city/ZIP geocoding | Free, keyless, hourly, has solar radiation and dew point. | Proposed |
| 2026-09-11 | Supabase for save codes now, accounts later | One service covers both requirements; Postgres JSONB for profiles. | Proposed |
| 2026-09-11 | Round stored coordinates to ~1 km; never store the address string | Public site, privacy. | Proposed |
| 2026-09-11 | No room-layout editor for the competition | Low impact on advice, high time cost. | Proposed |
| 2026-09-11 | Manual indoor readings first; sensor APIs after the competition | Unknown sensor brand; two-day budget. | Proposed |

## Pending (need Steve)

| # | Question | Recommendation | Answer |
|---|---|---|---|
| 1 | Product name and domain | Homeostat at `homeostat.house` (+ `homeostat.io` if cheap) | |
| 2 | Save codes only vs accounts required | Save codes; accounts as day-2 stretch | |
| 3 | Hosting/services: Vercel + Supabase acceptable? Existing accounts? | Yes; assume fresh free tiers | |
| 4 | Steve's house specs for the first test case | Needed on day 1 evening | |
| 5 | Air-quality sensor brand owned | Decides first integration post-competition | |
| 6 | Judging criteria / rules on paid services or accounts | Unknown | |
| 7 | Default units | °F with °C toggle | |
