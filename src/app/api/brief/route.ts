import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { BRIEF_SCHEMA, buildBriefPayload, buildBriefPrompt, parseBrief } from "@/lib/brief";
import { planBetween, VERTIPORTS, type ScenarioName } from "@/lib/la";
import { checkRateLimit } from "@/lib/ratelimit";

/**
 * Community Impact Brief. The plan is recomputed server-side from vertiport
 * ids (client-sent numbers are never trusted), then Claude writes the brief
 * grounded only in that engine output. Key stays server-side; endpoint is
 * rate-limited because it spends real tokens.
 */

export async function POST(req: NextRequest) {
  const limited = await checkRateLimit(req);
  if (limited) return limited;

  let body: { from?: string; to?: string; scenario?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const from = body.from ?? "";
  const to = body.to ?? "";
  const scenario = body.scenario === "day" ? "day" : "night";
  const ids = new Set(VERTIPORTS.map((v) => v.id));
  if (!ids.has(from) || !ids.has(to) || from === to) {
    return NextResponse.json(
      { error: "pick two different vertiports from the curated set" },
      { status: 400 },
    );
  }

  try {
    const cmp = planBetween(from, to, scenario as ScenarioName);
    const payload = buildBriefPayload(cmp);
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2048,
      output_config: { format: { type: "json_schema", schema: BRIEF_SCHEMA } },
      messages: [{ role: "user", content: buildBriefPrompt(payload) }],
    });
    const text = response.content.find((b) => b.type === "text")?.text ?? "";
    const parsed = parseBrief(text);
    if (!parsed.ok) {
      return NextResponse.json(
        { error: `brief generation failed: ${parsed.error}` },
        { status: 502 },
      );
    }
    return NextResponse.json({ brief: parsed.brief, payload });
  } catch (err) {
    const message = err instanceof Error ? err.message : "brief failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
