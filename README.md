# Whisperways

**Noise-aware flight corridors for the second century of flight.**

Whisperways plans eVTOL routes over Los Angeles by who hears them, not just how
far they fly. Pick two vertiports and it returns two corridors: the direct route
and the quiet route, with the human cost of each. Then Claude drafts the
community impact brief a vertiport operator could hand a neighborhood council.

Built for the HTCJ Aviation Futures Innovation Challenge (Advanced Air Mobility
track), July 2026.

## Who this is for

AAM operators and vertiport planners preparing community and regulatory
approval. The decision it improves: which corridor to fly, and how to show a
neighborhood the noise tradeoff honestly. Community acceptance, and noise above
all, is the gate on advanced air mobility; the corridor that gets approved is
the one the community can live under.

## The headline number

LAX to Burbank, night operations: the direct route is audible to about 221,000
people. The quiet corridor cuts that to about 51,000 people (77% fewer), and
cuts the population-weighted noise exposure index by 89%, for 4.3 extra minutes
of flight time. Every number comes from the
engine, computed over real census population data.

## Try it in 60 seconds

1. Open the live app and press **Plan corridors** (LAX to Hollywood Burbank is
   preselected). Watch the amber direct route and the teal quiet corridor land
   on the map.
2. Read the metric cards: people audible under each route, exposure reduction,
   added minutes.
3. Press **Generate community impact brief**: Claude writes the
   neighborhood-by-neighborhood brief live, grounded only in the engine's
   numbers.

## How it works

- **Population**: US Census Bureau 2020 tract centers of population (LA County,
  public domain), rasterized to a 250 m grid over the central-LA study area,
  covering 5.3M people
  (`scripts/build-la-grid.mjs`, provenance in `src/data/la-grid.json` meta).
- **Acoustics**: first-order model. Published eVTOL overflight level (Joby S4,
  about 45.2 dBA at 500 m, NASA/Joby acoustic flight campaign, results published 2022) with geometric
  spreading, against a day/night ambient baseline. This is a planning
  heuristic, not certification acoustics, and the UI says so.
- **Routing**: a population-noise cost raster (population convolved with the
  audible footprint kernel) plus Dijkstra. The quiet corridor trades meters
  against person-dB via a single bias weight.
- **AI brief**: one server route calls `claude-opus-4-8` with a
  schema-constrained output. The prompt receives ONLY engine-computed numbers
  and place names, and forbids inventing anything beyond them. Output is
  shape-validated and scrubbed defensively.
- **Stack**: Next.js App Router, MapLibre GL, Vercel. The API key stays
  server-side; the brief endpoint is rate-limited.

## Honesty notes

- The acoustic model is first-order (geometric spreading only: no atmospheric
  absorption, terrain shielding, or directivity). Numbers are planning-grade
  comparisons between routes, not absolute noise certifications.
- The vertiport set is curated and illustrative (existing airports and transit
  hubs), not proposed facilities.
- The demo mode (`/?demo=1`) serves a frozen result so video capture is
  deterministic. It is a genuine captured output: a real engine run plus one
  live `claude-opus-4-8` call using the same model, prompt, schema, and parser
  as the live endpoint (see `scripts/freeze-demo.ts` and the meta block in
  `src/data/demo-result.json`).
- Landmark exposure uses nearest-pass geometry against curated neighborhood
  centroids; only places actually inside the audible footprint reach the model.
- This project was built end-to-end with Claude (Claude Fable 5 in Claude
  Code); the `Co-Authored-By` trailers in the git history record it.

## Development

```bash
pnpm install
pnpm test        # 28 vitest tests: acoustics, routing, real-city acceptance, parsing
pnpm dev         # needs ANTHROPIC_API_KEY for /api/brief
pnpm build
```

Rebuild the census grid: `node scripts/build-la-grid.mjs`. Recapture the demo
result: `pnpm dlx tsx scripts/freeze-demo.ts` (needs `ANTHROPIC_API_KEY`).

## Spec

The behavior contract lives in `specs/whisperways-spec.md`.
