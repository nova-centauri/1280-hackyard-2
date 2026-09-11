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
| Whole-house fan | Yes. "The Mr Cool blue one" — model unconfirmed, CFM unknown |
| Heating | Forced-air furnace in basement, original to the house (2001) |
| Cooling | Central AC, outdoor condenser original to the house (2001) |
| Indoor sensor | Tasmota ESP32 reading an IKEA air-quality sensor (Vindriktning, PM2.5), reporting to Home Assistant |

## How the engine will interpret it (initial assumptions, all editable in the UI)
- **Air-tightness:** 2001 wood frame, no stated retrofits → estimate ≈ 5–6 ACH50. Natural infiltration ≈ 0.3 ACH.
- **Insulation:** 2001 IECC-era: walls ≈ R-13, attic ≈ R-30, double-pane windows, SHGC ≈ 0.4.
- **Thermal mass:** light (wood frame + drywall). Basement block walls add some mass but are below grade; treat basement as a buffered zone, not conditioned space in v1.
- **Mixed foundation:** the slab-on-grade side room is a cold spot in winter and a heat sink in summer. v1 flags it in the assumptions; v2 could split it as a zone.
- **Attic fan vs whole-house fan:** these are two different devices and both are modeled.
  - *Attic fan* lowers attic temperature, reducing ceiling heat gain on sunny afternoons. Does not ventilate living space.
  - *Whole-house fan* pulls house air out through the attic; only useful when outdoor air is cooler and drier than indoor and outdoor AQI is acceptable. Default CFM until confirmed: 2 CFM/sq ft ≈ 4,200 CFM → ≈ 15 ACH at full speed.
- **Furnace:** 2001-original forced air, most likely 80% AFUE. Age is a talking point, not a model input for v1.
- **AC:** 2001-original, roughly SEER 10 nominal and degraded by age. Makes "avoid running the AC when a night flush would do" advice worth real money. Good demo story.

## Open items on this house
- Confirm the whole-house fan brand and model. **Mr Cool is a mini-split/HVAC brand; as far as I know they do not sell whole-house fans.** The common "blue" one is QuietCool (blue housing on several models). A photo of the label gives us the CFM.
- Is the furnace gas or propane or oil? Affects nothing in v1, useful for the later cost feature.
- Which way does the house face, and which side has the most glass? Drives solar gain.
- Any trees/shading on the south or west side?
