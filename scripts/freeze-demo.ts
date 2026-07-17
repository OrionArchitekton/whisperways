/**
 * Captures the REAL demo-mode payload: runs the corridor engine and one live
 * Claude call (same model, prompt, and schema as /api/brief), then writes
 * src/data/demo-result.json. The demo page serves this frozen-but-genuine
 * result so video capture is deterministic; provenance is disclosed in the
 * README and the file's meta block.
 *
 * Usage: doppler run -p claude-code-use -c prd -- pnpm dlx tsx scripts/freeze-demo.ts
 */
import Anthropic from "@anthropic-ai/sdk";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BRIEF_SCHEMA,
  buildBriefPayload,
  buildBriefPrompt,
  parseBrief,
} from "../src/lib/brief";
import { planBetween } from "../src/lib/la";

async function main() {
  const SELECTION = { from: "lax", to: "bur", scenario: "night" as const };

  const cmp = planBetween(SELECTION.from, SELECTION.to, SELECTION.scenario);
  const payload = buildBriefPayload(cmp);

  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 2048,
    output_config: {
      format: { type: "json_schema", schema: BRIEF_SCHEMA },
    },
    messages: [{ role: "user", content: buildBriefPrompt(payload) }],
  });
  const text = response.content.find((b) => b.type === "text")?.text ?? "";
  const parsed = parseBrief(text);
  if (!parsed.ok) {
    throw new Error(`live brief capture failed: ${parsed.error}`);
  }

  const out = {
    meta: {
      note: "Genuine captured output: real engine run + one live claude-opus-4-8 call via the same prompt/schema as /api/brief. Frozen for demo-mode determinism; disclosed in README.",
      capturedAt: new Date().toISOString(),
      model: "claude-opus-4-8",
    },
    selection: SELECTION,
    plan: {
      directLine: cmp.directLine,
      quietLine: cmp.quietLine,
      from: cmp.from,
      to: cmp.to,
      scenario: cmp.scenario,
      exposureReductionPct: cmp.exposureReductionPct,
      addedTimePct: cmp.addedTimePct,
      direct: { ...cmp.direct, path: undefined },
      quiet: { ...cmp.quiet, path: undefined },
    },
    brief: parsed.brief,
  };

  const here = dirname(fileURLToPath(import.meta.url));
  const dest = join(here, "..", "src", "data", "demo-result.json");
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, JSON.stringify(out, null, 2));
  console.log(
    `wrote ${dest}: -${cmp.exposureReductionPct.toFixed(1)}% exposure, brief neighborhoods: ${parsed.brief.neighborhoods.map((n) => n.name).join(", ")}`,
  );
}

void main();
