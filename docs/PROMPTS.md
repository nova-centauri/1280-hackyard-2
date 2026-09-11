# Prompt Log

Every prompt from Steve, verbatim, in order. Do not edit or summarize. Append only.

---

## Prompt 1 — 2026-09-11

OK, I’m starting a whole new project and it’s for a competition and the rules are the competition are that I have to finish it in two days and that the final product has to be open for anybody to just try out and use so my plan is to make a website that is to help figure out how to best manage a home in regards to temperature settings in Windows in relation to the weather outside and the conditions inside and as much info as we can get about the house, including what the house is made of the house is size what year it was built, which would give us an indication Of how tight the air Envelope is in the house and any other important parameters about the house that we would want to know and the final product is going to be a website with the domain name I have to buy a domain name so we’ll keep that in mind when we’re shopping for a name for the site and I want it to be a very highly visual site, but let’s start with just the structural components and come back to do the visual pass later so that we can make sure that it works for a intended purpose before we stack the visuals on what my vision is is for it to always be a two panel view on the website whether it’s mobile or desktop on mobile, the two panels would be stacked in on desktop. The two panels would be side-by-side and one panel would be the current view of the house in 3-D using 3JS and some very cool animations as the user inputs information about the structure. They’re trying to understand then I want the house to sort of animate into existence if they say it’s Wood I want timbers to come together as they tell you how many floors and what square footage if they say that it’s a cinderblock structure that have cinderblocks come together or Brick or whatever type of material house could be made of and they’ll need to tell you how many floors there are how many rooms maybe you need to have some control over the room layout. I don’t want to gather too much information on the house, but we need to have enough information to make a good determination of what the air situation is and some people like myself have air quality sensors so it would be cool if I could input air quality data into it and also my address so that it knows the exact local weather the exact local sunshine situation if it’s partly cloudy or White weather whatever and that animated panel of the side house I would like it to show the weather so if the sun‘s beating down, it should show radiating heat you know growing on the house as it gets hotter, and if the air inside of the house is stale, then we should give a visual indication like the room air quality being low would be like yellow, and if the air, if the desired air temperature is low, then it would be on the blue side or if it’s hot it would be on the Red side and people should be able to input the exact type of desired temperature Envelope that they want and maybe some information about their furnace or their boiler or their radiator or whatever type of HVAC system they have including cooling and we know the seasons already so we can basically determine if they should be using cooling or eating or ventilation and I’d like to consider some edge cases too like my house for example has a whole house fan in the attic that helps to pull heat out and that’s basically my idea I would like you to start from here. Maybe you can help me come with a good idea for a name and then start mocking up a little bit of the plan. It’s basically just gonna be a website that I’ll work on mobile or desktop and if people wanna save their work I would like them to be able to save it somehow like maybe they can store it on the server with like a unique code that they can paste back in to load it back up or just really good strong session control so if they leave and come back or if they want to sign up, they can do that too. That way people can actually input some good data and I don’t know how it’s gonna work to input air quality
sensor but maybe we need to figure that out later I hope that’s a good starting point for this project for you to at least mock it up with a plan before you start work and revise it with me before we start heavy work

---

## Prompt 2 — 2026-09-11

1. lock in breezevibe.site and Breeze Vibe as the name. 
2. Put it as a stretch, include strong sessions as primary plan
3. cloudflare, I have a VPS and will take care of setting up CI/CD from main branch to the URL breezevibe.site
4. Built in 2001, 2100 sq ft, colonial timber house with an asphalt roof. cinder basement, 2 stories, with 3 bedrooms and a loft upstairs. The main floor has a side room under the loft that's slab on grade. It has an attic fan. Forced air furnace in the basement thats original to the house. An original AC unit outside. The whole house fan is the Mr Cool blue one, whatever CFM that is.
5. My air quality sensor is a tasmota esp32 that plugs into an ikea air quality sensor and plugs into home assistant. We could link at the home-assistant level to be universal. Maybe allow lan discover? Idk
6. No rule against paid services but the app must be open. There can be a login but anyone must be able to load it and play with it without logging in. Thats why I laid out the model of building in a session and saving to an account later.
7. Default based on the address the person inputs. We need the address to gather weather data, sun position, cloudiness, etc.


Make a firm rule to store all planning documents in the repo itself. You should also store all of my prompts in order in the same planning folder.

---

## Prompt 3 — 2026-09-11

1. it was a quietcool classic 1472 cfm
2. Furnace is natural gas, include options for people
3. My house front is facing NE
4. Yes it does
5. I will find out about that later

---

## Prompt 4 — 2026-09-11

Push to main

---

## Prompt 5 — 2026-09-11

Add GitHub Actions CI/CD to nova-centauri/1280-hackyard-2 so pushes to main continuously deploy BreezeVibe to VPS-1 (breezevibe.site).

Context:
- This branch (claude/home-temp-management-site-jnz8cn, PR #1) is a Next.js 16 app with pnpm, Dockerfile (standalone on 3000), docker-compose (local postgres only), Drizzle, GET /api/health.
- Production should use existing VPS Postgres via DATABASE_URL, NOT the compose db service.
- Live site today is a static placeholder at /opt/breezevibe/site on 187.77.195.139 (nginx + LE). VPS-01 is upgrading deploy.sh/nginx to run this Docker app; do not assume that is done yet.
- Sister pattern: nova-centauri/amail-saas-site .github/workflows/deploy.yml uses secrets VPS_HOST, VPS_USER, VPS_SSH_KEY, DEPLOY_PATH. Hypestar uses a GitHub webhook to /opt/hypestar/deploy.sh.
- Prefer: on pull_request and push: pnpm install --frozen-lockfile + pnpm test (vitest). On push to main: also docker build (to prove the image) AND a deploy job that SSHes like amail if VPS_SSH_KEY is set, otherwise skip deploy with a warning (do not fail the workflow when secrets are missing).
- Deploy job should rsync/copy the repo or image context to /opt/breezevibe (DEPLOY_PATH default /opt/breezevibe) and run `/opt/breezevibe/deploy.sh` with the SHA if that script exists; if deploy.sh is still the placeholder installer, still call it but document that VPS-01 must replace it.
- Do NOT put real secrets, passwords, or DATABASE_URL values in the repo. Keep .env.example as-is.
- Do NOT expand product scope (no new thermal features).
- Open a PR (or push on this branch if that is the PR already) with the workflow files. Keep it small.

Success: .github/workflows exist; CI runs tests on PR; main has a deploy job gated on secrets; README has a 5-line CI/CD note.

---

## Prompt 6 — 2026-09-11

Change of deploy contract from VPS-01 — do NOT rsync and do NOT SSH a static tree.

Pattern is webhook-pull, same as hypestar:
- GHA: on PR + push, pnpm test (and docker build on main if cheap). That is the CI.
- After green on main, you MAY POST the GitHub webhook that VPS-01 registers (`breezevibe-deploy` → /opt/breezevibe/deploy.sh with payload `after` = SHA). If the webhook secret is not in repo secrets yet, skip the notify job with a warning; do not fail CI.
- Do not use VPS_SSH_KEY / rsync / DEPLOY_PATH promote.
- Production: container listens on host 127.0.0.1:3060. DATABASE_URL comes from /opt/breezevibe/.env on the box (host Postgres role+db breezevibe). Compose `db` service is local-only.
- Health gate on the VPS is GET /api/health 200 before nginx flips off the placeholder.

Keep the PR small: workflows + a short README CI/CD note reflecting webhook-pull, port 3060, host Postgres.

---

## Prompt 7 — 2026-09-11

PR #1 is merged to main (2c2480d). PR #2 is now CONFLICTING because it still bases on claude/home-temp-management-site-jnz8cn.

Rebase your CI/webhook-pull workflow onto current main and retarget PR #2 at main so it can merge. Do not change product code. Keep GHA as: test on PR/push; docker build on main; notify-vps webhook POST after green on main (secrets DEPLOY_WEBHOOK_URL + DEPLOY_WEBHOOK_SECRET already set on the repo). No rsync.
