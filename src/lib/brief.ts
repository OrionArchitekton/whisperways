/**
 * Community Impact Brief: prompt construction and defensive parsing.
 *
 * The model receives ONLY numbers the engine computed. The prompt forbids
 * inventing figures or places, and bans long dashes (public-facing copy).
 * Parsing never trusts the model: fenced or bare JSON, shape-validated,
 * length-capped, and dash-scrubbed.
 */

import type { LandmarkExposure } from "./landmarks";
import type { LaComparison } from "./la";
import { landmarksOnRoute } from "./landmarks";
import { SCENARIOS } from "./la";

export interface BriefPayload {
  from: string;
  to: string;
  scenario: string;
  ambientDb: number;
  altitudeM: number;
  aircraftNote: string;
  direct: {
    distanceKm: number;
    flightTimeMin: number;
    peopleAudible: number;
    landmarks: LandmarkExposure[];
  };
  quiet: {
    distanceKm: number;
    flightTimeMin: number;
    peopleAudible: number;
    landmarks: LandmarkExposure[];
  };
  exposureReductionPct: number;
  addedTimeMin: number;
}

export function buildBriefPayload(cmp: LaComparison): BriefPayload {
  const s = SCENARIOS[cmp.scenario];
  const round1 = (v: number) => Math.round(v * 10) / 10;
  return {
    from: cmp.from.name,
    to: cmp.to.name,
    scenario: cmp.scenario,
    ambientDb: s.ambientDb,
    altitudeM: s.altitudeM,
    aircraftNote:
      "eVTOL, published overflight level 45.2 dBA at 500 m (NASA/Joby 2022), first-order spreading model",
    direct: {
      distanceKm: round1(cmp.direct.distanceM / 1000),
      flightTimeMin: round1(cmp.direct.flightTimeMin),
      peopleAudible: Math.round(cmp.direct.peopleAudible),
      landmarks: landmarksOnRoute(cmp.directLine, s),
    },
    quiet: {
      distanceKm: round1(cmp.quiet.distanceM / 1000),
      flightTimeMin: round1(cmp.quiet.flightTimeMin),
      peopleAudible: Math.round(cmp.quiet.peopleAudible),
      landmarks: landmarksOnRoute(cmp.quietLine, s),
    },
    exposureReductionPct: round1(cmp.exposureReductionPct),
    addedTimeMin: round1(cmp.quiet.flightTimeMin - cmp.direct.flightTimeMin),
  };
}

export function buildBriefPrompt(p: BriefPayload): string {
  return [
    "You are drafting a Community Impact Brief for an advanced air mobility operator.",
    "Audience: a neighborhood council reviewing a proposed eVTOL corridor.",
    "Write plainly and honestly, at a high-school reading level.",
    "",
    "HARD RULES:",
    "- Use ONLY the numbers, places, and facts in the DATA block. Never invent numbers, place names, statistics, or regulations.",
    "- If a value is not in the DATA block, do not mention it.",
    "- Never use em dashes, en dashes, or horizontal bars. Use commas, colons, or periods.",
    "- Mitigation commitments must be generic operational practices (altitude, hours, monitoring, reporting) framed as topics to discuss, with no invented specifics.",
    "",
    "Respond with JSON only, no code fences, in exactly this shape:",
    '{"summary": string, "neighborhoods": [{"name": string, "text": string}], "tradeoff": string, "commitments": [string]}',
    "",
    "Field guidance:",
    "- summary: 2-3 sentences comparing the direct and quiet corridors.",
    "- neighborhoods: one entry per place appearing in EITHER route's landmark list, loudest first (use the exact names given); text states what changes for that place between the two corridors using only the provided levels, e.g. audible under the direct route at its stated dBA versus removed from or reduced in the audible footprint under the quiet corridor.",
    "- tradeoff: the honest cost of the quiet corridor in minutes and distance.",
    "- commitments: 3-4 discussion topics.",
    "",
    "DATA:",
    JSON.stringify(p, null, 2),
  ].join("\n");
}

export interface Brief {
  summary: string;
  neighborhoods: { name: string; text: string }[];
  tradeoff: string;
  commitments: string[];
}

/** JSON schema enforced via output_config.format on the Claude call. */
export const BRIEF_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    neighborhoods: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          text: { type: "string" },
        },
        required: ["name", "text"],
        additionalProperties: false,
      },
    },
    tradeoff: { type: "string" },
    commitments: { type: "array", items: { type: "string" } },
  },
  required: ["summary", "neighborhoods", "tradeoff", "commitments"],
  additionalProperties: false,
} as const;

export type ParseResult =
  | { ok: true; brief: Brief }
  | { ok: false; error: string };

const MAX_FIELD = 1200;

function scrub(text: string): string {
  return text
    .replace(/\s*[–—―]\s*/g, ", ")
    .replace(/\s{2,}/g, " ")
    .slice(0, MAX_FIELD)
    .trim();
}

export function parseBrief(raw: string): ParseResult {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1].trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "model output was not valid JSON" };
  }
  if (typeof parsed !== "object" || parsed === null) {
    return { ok: false, error: "model output was not an object" };
  }
  const o = parsed as Record<string, unknown>;
  if (typeof o.summary !== "string" || typeof o.tradeoff !== "string") {
    return { ok: false, error: "missing summary or tradeoff" };
  }
  if (!Array.isArray(o.neighborhoods) || !Array.isArray(o.commitments)) {
    return { ok: false, error: "missing neighborhoods or commitments" };
  }
  const neighborhoods: Brief["neighborhoods"] = [];
  for (const n of o.neighborhoods) {
    if (
      typeof n === "object" &&
      n !== null &&
      typeof (n as Record<string, unknown>).name === "string" &&
      typeof (n as Record<string, unknown>).text === "string"
    ) {
      neighborhoods.push({
        name: scrub((n as Record<string, string>).name),
        text: scrub((n as Record<string, string>).text),
      });
    }
  }
  const commitments = o.commitments
    .filter((c): c is string => typeof c === "string")
    .map(scrub)
    .slice(0, 6);
  return {
    ok: true,
    brief: {
      summary: scrub(o.summary),
      neighborhoods,
      tradeoff: scrub(o.tradeoff),
      commitments,
    },
  };
}
