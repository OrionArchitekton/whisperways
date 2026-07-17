# Devpost submission copy (paste-ready)

## Project name

Whisperways

## Tagline (under 60 chars)

Noise-aware eVTOL corridors: route flight by who hears it

## Elevator pitch (short)

Whisperways plans eVTOL corridors over Los Angeles by the people underneath
them: real census population, published eVTOL acoustics, and a quiet-route
optimizer, plus an AI community impact brief a vertiport operator could hand a
neighborhood council.

## Project story (main description)

### The problem

Advanced air mobility will not be decided by range or battery chemistry. It
will be decided by community acceptance, and the gating complaint is noise.
Vertiport approvals, certification limits, and neighborhood opposition all
hinge on one question: who hears these aircraft, and how loudly? Yet route
planning today optimizes distance and airspace, not the people below.

### What Whisperways does

Pick two vertiports in Los Angeles and Whisperways returns two corridors. The
direct route is distance-optimal. The quiet route is optimized against population noise
exposure. For each you see distance, flight time, how many people the model predicts
can hear the aircraft above the ambient soundscape, and a population-weighted exposure
index. The headline result: LAX to Hollywood Burbank at night, the direct
route is audible to about 221,000 people; the quiet corridor cuts that to
about 51,000 people (77 percent fewer), and cuts the population-weighted
exposure index by 89 percent, for 4.3 extra minutes.

Then Claude drafts the Community Impact Brief: a neighborhood-by-neighborhood
account (Fairfax District, West Hollywood, Toluca Lake on the demo route) of
what each place hears under each corridor, the honest tradeoff, and mitigation
topics for discussion. The model receives only engine-computed numbers and is
forbidden from inventing anything beyond them.

### How we built it

- US Census Bureau 2020 tract centers of population (LA County, public
  domain), rasterized to a 250 m grid covering 5.3 million people.
- A first-order acoustic model: published eVTOL overflight level (Joby S4,
  about 45.2 dBA at 500 m, NASA/Joby acoustic flight campaign, results published 2022) with geometric
  spreading against day/night ambient baselines.
- A routing engine that convolves population with the audible footprint kernel
  and runs Dijkstra, trading meters of detour against person-decibels.
- One server route calls claude-opus-4-8 with a schema-constrained output for
  the brief. Next.js App Router, MapLibre GL, Vercel; the API key stays
  server-side and the endpoint is rate-limited (burst-verified 429s).
- 28 unit and acceptance tests over the acoustics, routing, real-city
  results, and brief prompt/parsing. Built end-to-end with Claude (Claude Fable 5 in Claude Code); the
  Co-Authored-By trailers in the git history record it.

### Honesty notes

The acoustic model is first-order (no atmospheric absorption, terrain, or
directivity) and the UI labels it a planning heuristic, not certification
acoustics. The vertiport set is curated and illustrative. The demo mode serves
a frozen result for deterministic capture; it is a genuine captured output of
the same engine and the same live Claude call path, disclosed in the README.

### What's next

Noise budgets as infrastructure: multi-city grids, time-of-day corridor
schedules, cumulative exposure accounting across a whole network, and briefs
that cite the exact model assumptions per paragraph.

## Built with

nextjs, typescript, maplibre-gl, anthropic-claude, vercel, upstash, census-data

## Links

- Live app: https://whisperways.vercel.app (demo mode: https://whisperways.vercel.app/?demo=1)
- Repo: https://github.com/OrionArchitekton/whisperways
- Video: YOUTUBE_URL_PLACEHOLDER

## Team

Dan Mercede (solo) building with Claude Code.
