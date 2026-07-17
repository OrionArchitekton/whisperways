# Adversarial review verdict: SAFE TO SUBMIT

Date: 2026-07-17. Scope: README, Devpost copy, YouTube metadata, technical
brief, demo narration and captions, live site, code, git history.

## Engines

1. Internal fleet (Workflow): 5 finder lenses (README, Devpost/YouTube,
   brief+narration, live probe, code audit), every non-trivial finding
   counter-refuted by an independent verifier, plus a cold first-read pass.
   15 agents, 99 claims examined, 0 findings refused adjudication.
2. Codex (bare CLI, read-only sandbox): 31 findings across the same surfaces.

## Outcome

- 1 BLOCKING narration overclaim (day-vs-night "ten times more people") was
  caught on frame inspection and fixed before either engine reported; the
  shipped narration and UI now state the honest zero-exposure result.
- The 89 percent figure is bound to the population-weighted exposure index on
  every surface; the people cut (77 percent) is stated separately. The brief
  payload now carries both metrics with anti-conflation guidance, and the
  frozen demo was recaptured live to prove it.
- Some 15 precision fixes applied from Codex (optimized not optimal, shortest
  grid path, field-capped, spec-backed, committed census grid, could-hand,
  prototypes-one-answer, population-noise not noise-equity, citation
  softening, YouTube frozen-capture disclosure).
- Rate limiting is evidenced by a committed zero-spend probe
  (docs/evidence/rate-limit-burst.txt: 5x400 allowed + 7x429 limited on a
  12-concurrent burst).

## Declined findings (with rationale)

- Narration "about a second of compute" and "plans any pair live": hedged and
  contextually true (the six-site dropdown is on screen); re-recording cost
  outweighs marginal precision.
- Vision-tense closing ("regulators get evidence...") and broad motivation
  claims: clearly aspirational framing, standard for a pitch; honesty notes
  bound the model's actual scope.
- Committed capture receipt for the demo JSON: the meta block, capture script,
  and git history already document provenance at hackathon scale.

## Weakest judged axis (named at pick time)

Technical rigor of the acoustic model. Addressed by explicit first-order
labeling on every surface and the honest day-scenario zero-state; the late
improvement slice was not needed.

## Evidence pointers

- Tests: 28/28 vitest (acoustics, routing, real-city acceptance, parsing).
- Live: whisperways.vercel.app (identity-verified 200; live /api/brief proof
  12.5s; burst evidence committed).
- Video: demo/out/final.mp4, 229s (3:49), frames inspected shot by shot.
- The freeze SHA is the commit that adds this file; origin must equal local.
