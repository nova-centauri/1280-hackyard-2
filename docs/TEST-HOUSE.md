# Test House — Steve's (first end-to-end fixture)

Source: Prompt 2. This is the house every feature gets checked against before it ships. It will also be the seed for `src/engine/fixtures/steve-house.ts`.

## As stated
| Field | Value |
|---|---|
| Year built | 2001 |
| Finished area | 2,100 sq ft |
| Style / construction | Colonial, timber (wood) frame, asphalt shingle roof |
| Stories | 2 |
| Foundation | Cinder-block basement; one main-floor side room (under the loft) is slab on grade |
| Rooms | 3 bedrooms + loft upstairs |
| Attic | Has an **attic fan** (powered attic ventilator) |
| Whole-house fan | **QuietCool Classic, 1,472 CFM** (Prompt 3) |
| Heating | Forced-air **natural gas** furnace in basement, original to the house (2001) |
| Cooling | Central AC, outdoor condenser original to the house (2001) |
| Orientation | Front of house faces **NE**; back faces SW (Prompt 3) |
| Indoor sensor | Tasmota ESP32 reading an IKEA air-quality sensor (Vindriktning, PM2.5), reporting to Home Assistant |

## How the engine will interpret it (initial assumptions, all editable in the UI)
- **Air-tightness:** 2001 wood frame, no stated retrofits → estimate ≈ 5–6 ACH50. Natural infiltration ≈ 0.3 ACH.
- **Insulation:** 2001 IECC-era: walls ≈ R-13, attic ≈ R-30, double-pane windows, SHGC ≈ 0.4.
- **Thermal mass:** light (wood frame + drywall). Basement block walls add some mass but are below grade; treat basement as a buffered zone, not conditioned space in v1.
- **Orientation:** NE-facing front means the back of the house faces SW. Colonials carry most glass front and back, so the SW face takes the full afternoon sun. Summer cooling load peaks late afternoon; that is the hour the advice must get right for this house.
- **Mixed foundation:** the slab-on-grade side room is a cold spot in winter and a heat sink in summer. v1 flags it in the assumptions; v2 could split it as a zone.
- **Attic fan vs whole-house fan:** these are two different devices and both are modeled.
  - *Attic fan* lowers attic temperature, reducing ceiling heat gain on sunny afternoons. Does not ventilate living space.
  - *Whole-house fan* pulls house air out through the attic; only useful when outdoor air is cooler and drier than indoor and outdoor AQI is acceptable. Confirmed 1,472 CFM. With ≈ 16,800 ft³ of conditioned volume (2,100 sq ft × 8 ft) that is ≈ 5.3 ACH: a low-flow, run-it-all-night fan rather than a fast flush. The planner should schedule it for long overnight runs.
- **Furnace:** 2001-original natural-gas forced air, most likely 80% AFUE. Age is a talking point, not a model input for v1. Fuel options offered to everyone: natural gas, propane, oil, electric, wood/pellet.
- **AC:** 2001-original, roughly SEER 10 nominal and degraded by age. Makes "avoid running the AC when a night flush would do" advice worth real money. Good demo story.

## Open items on this house
- Is there tree shade on the SW (back) side? Default: none.
- Rough glass split front vs back? Default: even.
