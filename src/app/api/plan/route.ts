import { NextRequest, NextResponse } from "next/server";
import { planBetween, VERTIPORTS, type ScenarioName } from "@/lib/la";

/**
 * Deterministic corridor planning. No AI, no external calls; safe to expose
 * unthrottled. GET /api/plan?from=lax&to=bur&scenario=night
 */
export function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const scenarioRaw = params.get("scenario") ?? "night";
  if (scenarioRaw !== "night" && scenarioRaw !== "day") {
    return NextResponse.json({ error: "unknown scenario" }, { status: 400 });
  }
  const ids = new Set(VERTIPORTS.map((v) => v.id));
  if (!ids.has(from) || !ids.has(to) || from === to) {
    return NextResponse.json(
      { error: "pick two different vertiports from the curated set" },
      { status: 400 },
    );
  }
  try {
    const cmp = planBetween(from, to, scenarioRaw as ScenarioName);
    // Slim the payload: the client needs lines + metrics, not cell paths.
    const { direct, quiet, ...rest } = cmp;
    return NextResponse.json({
      ...rest,
      direct: { ...direct, path: undefined },
      quiet: { ...quiet, path: undefined },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "planning failed" },
      { status: 500 },
    );
  }
}
