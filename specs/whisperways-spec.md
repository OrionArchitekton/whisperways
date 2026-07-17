# Whisperways Spec

Noise-aware flight corridor planning for advanced air mobility, demonstrated over
Los Angeles. Built for the HTCJ Aviation Futures Innovation Challenge (deadline
2026-07-21 5:00pm PDT; single prize: Best Advanced Air Mobility Innovation).

## Problem

eVTOL and drone operations will fail or succeed on community acceptance, and noise is
the gating complaint: it drives vertiport approvals, certification limits, and
neighborhood opposition. Route planning today optimizes distance and airspace, not the
people underneath. Nobody at hackathon scale is building noise-equity tooling.

## The product in one line

Given an origin and destination in LA, Whisperways plans two corridors, the direct
route and the quiet route, shows who hears what under each, and writes the community
impact brief a vertiport operator would hand a neighborhood council.

## Users and decision improved

Named audience: AAM operators and vertiport planners preparing community/regulatory
approval. Decision improved: which corridor to fly, and how to show a neighborhood the
noise tradeoff honestly.

## Scenarios (tracer-bullet vertical slices)

### S1. Corridor comparison
A user selects an origin and destination vertiport (from a curated LA set) and an
aircraft profile. The system returns two routes: DIRECT (distance-optimal) and QUIET
(population-noise-optimal), each with metrics: distance, est. flight time,
people overflown above the audibility threshold, and a population-weighted noise
exposure index. The map renders both corridors and the noise footprint.
Acceptance: for at least one vertiport pair, the quiet route reduces
population-weighted exposure by a measurable percentage vs direct, at a bounded
flight-time penalty, and the numbers shown come from the engine, not copy.

### S2. Community impact brief (the AI slice)
For a computed route, the user requests a Community Impact Brief. A server route sends
the engine's computed JSON (neighborhoods overflown, exposure levels, tradeoff
numbers) to Claude, which returns a structured brief: per-neighborhood exposure
summary, tradeoff explanation, and mitigation talking points.
Acceptance: the brief is generated live server-side (key never in client), is
grounded ONLY in the provided JSON (prompt forbids inventing numbers or places),
shape-guaranteed via a JSON-schema-constrained output (no sampling parameters;
current Claude models reject temperature overrides), and contains no long dashes
(style ban in prompt + post-scrub). A real end-to-end call against the deployed
URL is the ALLOW proof. Demo determinism comes from the frozen captured result
(S3), not from sampling settings.

### S3. Demo mode (video-stable)
Visiting `/?demo=1` server-renders the page with a prefilled vertiport pair AND a
frozen-but-real precomputed result (routes + metrics + brief) present in the SSR HTML.
Acceptance: the demo result is a genuine captured engine+AI output (disclosed in the
README), and it renders without client-side async waits.

### S4. Abuse guard
The public brief endpoint is rate-limited.
Acceptance: a concurrent burst yields 429s (verified live, not assumed); normal single
use passes.

## Engine (deterministic core; the primary test seam)

- LA study area as a uniform grid; each cell carries population density derived from
  public census data (preprocessed offline, committed as a data artifact with
  provenance noted).
- First-order noise model: published source level per aircraft profile (cited),
  geometric spreading with distance/altitude attenuation: L(d) = L0 - 20*log10(d/d0).
  Ambient baseline varies day/night. The UI labels this "first-order model" with
  sources. No overclaim: this is a planning heuristic, not certification acoustics.
- Routing: Dijkstra over the grid; edge cost = w_dist * distance +
  w_noise * population-weighted excess-over-ambient in newly-ensonified cells.
  DIRECT = w_noise 0; QUIET = calibrated default weights.
- Pure TypeScript, no I/O, unit-tested (vitest): monotonic attenuation, route
  optimality on synthetic grids, exposure accounting, defensive parse of AI output.

## Test seams (decided at spec time)

1. `planCorridors(grid, request) -> ComparisonResult`: pure function, exhaustive unit
   tests. Highest seam; everything demoable flows through it.
2. `POST /api/brief` (ComparisonResult subset in, brief JSON out): one integration
   test locally + one live ALLOW probe against the deployed URL.
UI consumes both seams; no third seam.

## Constraints

- Smallest stack that yields a public link + clear AI use: Next.js (App Router) +
  MapLibre GL + one Claude server route + Vercel. Key server-side only.
- All commits inside the challenge window (opened 2026-06-25). Fresh repo, public,
  under OrionArchitekton. Co-Authored-By trailer records Claude's role.
- No long dashes in any public-facing artifact.
- Honesty notes in README: first-order noise model, curated vertiport set, frozen demo
  result disclosed.

## Out of scope (v1)

Live weather, real-time traffic deconfliction, multi-aircraft scheduling, terrain
shielding, actual FAA corridor filings, mobile app.

## Narrative (packaging layer)

Spirit of St. Louis framing: 1927 proved the machine could cross the ocean; the
challenge invokes its legacy for the next 100 years. Whisperways' claim: the second
century of flight is won over neighborhoods, not oceans; the corridor that gets
approved is the one the community can live under. Judged 10 months before the
flight's centennial.
