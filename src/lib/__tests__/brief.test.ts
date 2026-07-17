import { describe, expect, it } from "vitest";
import { buildBriefPayload, buildBriefPrompt, parseBrief } from "../brief";
import { planBetween } from "../la";
import { landmarksOnRoute } from "../landmarks";
import { SCENARIOS } from "../la";

describe("landmarksOnRoute", () => {
  it("finds real neighborhoods under the LAX to Burbank direct route", () => {
    const cmp = planBetween("lax", "bur", "night");
    const hits = landmarksOnRoute(cmp.directLine, SCENARIOS.night);
    expect(hits.length).toBeGreaterThan(0);
    // loudest first, each with a sane received level
    for (const h of hits) {
      expect(h.excessDb).toBeGreaterThan(0);
      expect(h.levelDb).toBeGreaterThan(SCENARIOS.night.ambientDb);
      expect(h.levelDb).toBeLessThan(70);
    }
    const sorted = [...hits].sort((a, b) => b.excessDb - a.excessDb);
    expect(hits).toEqual(sorted);
  });

  it("returns nothing when the aircraft is inaudible over ambient", () => {
    const cmp = planBetween("lax", "bur", "night");
    const loudCity = { ...SCENARIOS.night, ambientDb: 70 };
    expect(landmarksOnRoute(cmp.directLine, loudCity)).toEqual([]);
  });
});

describe("buildBriefPayload / buildBriefPrompt", () => {
  it("grounds the prompt in engine numbers and bans dashes and invention", () => {
    const cmp = planBetween("dtla", "smo", "night");
    const payload = buildBriefPayload(cmp);
    expect(payload.direct.peopleAudible).toBeGreaterThan(0);
    const prompt = buildBriefPrompt(payload);
    expect(prompt).toContain("Never invent numbers");
    expect(prompt).toContain("em dashes");
    expect(prompt).toContain(String(payload.exposureReductionPct));
    expect(prompt).toContain("Union Station DTLA");
  });
});

describe("parseBrief", () => {
  const valid = JSON.stringify({
    summary: "The quiet corridor reduces exposure.",
    neighborhoods: [{ name: "Hollywood", text: "About 45 dBA at closest pass." }],
    tradeoff: "Adds 4.3 minutes.",
    commitments: ["Night curfew discussion", "Noise monitoring"],
  });

  it("accepts bare JSON", () => {
    const r = parseBrief(valid);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.brief.neighborhoods[0].name).toBe("Hollywood");
  });

  it("accepts fenced JSON", () => {
    const r = parseBrief("```json\n" + valid + "\n```");
    expect(r.ok).toBe(true);
  });

  it("rejects non-JSON and wrong shapes", () => {
    expect(parseBrief("I cannot help with that").ok).toBe(false);
    expect(parseBrief('{"summary": "x"}').ok).toBe(false);
    expect(parseBrief('[1,2]').ok).toBe(false);
  });

  it("scrubs long dashes the model sneaks in", () => {
    const sneaky = valid.replace(
      "The quiet corridor reduces exposure.",
      "The quiet corridor — reduces exposure.",
    );
    const r = parseBrief(sneaky);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.brief.summary).not.toMatch(/[–—―]/);
    }
  });

  it("drops malformed neighborhood entries instead of failing", () => {
    const messy = JSON.stringify({
      summary: "s",
      neighborhoods: [{ name: "OK", text: "fine" }, { name: 5 }, "junk"],
      tradeoff: "t",
      commitments: ["a", 7, "b"],
    });
    const r = parseBrief(messy);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.brief.neighborhoods).toHaveLength(1);
      expect(r.brief.commitments).toEqual(["a", "b"]);
    }
  });
});
