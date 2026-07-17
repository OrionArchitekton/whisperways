import { describe, expect, it } from "vitest";
import { laGrid, planBetween, VERTIPORTS } from "../la";

describe("laGrid", () => {
  it("loads the census raster with a real population", () => {
    const g = laGrid();
    expect(g.cols).toBeGreaterThan(100);
    const total = g.pop.reduce((a, b) => a + b, 0);
    // ~5.3M people in the study bbox (LA County subset)
    expect(total).toBeGreaterThan(4_000_000);
  });

  it("contains every curated vertiport inside the grid", () => {
    const g = laGrid();
    for (const v of VERTIPORTS) {
      expect(
        v.lon > g.originLon! && v.lat > g.originLat!,
        `${v.id} inside bbox`,
      ).toBe(true);
    }
  });
});

describe("planBetween (spec S1 acceptance)", () => {
  it("LAX to Burbank: quiet route measurably reduces exposure at bounded cost", () => {
    const res = planBetween("lax", "bur", "night");
    expect(res.direct.exposureIndex).toBeGreaterThan(0);
    expect(res.exposureReductionPct).toBeGreaterThan(10);
    expect(res.addedTimePct).toBeLessThan(60);
    expect(res.directLine.length).toBeGreaterThan(10);
    expect(res.quietLine.length).toBeGreaterThan(10);
  });

  it("Union Station to Santa Monica: quiet never worse than direct", () => {
    const res = planBetween("dtla", "smo", "night");
    expect(res.quiet.exposureIndex).toBeLessThanOrEqual(
      res.direct.exposureIndex,
    );
    expect(res.quiet.peopleAudible).toBeLessThanOrEqual(
      res.direct.peopleAudible * 1.0 + 1e-9,
    );
  });

  it("rejects unknown or identical vertiports", () => {
    expect(() => planBetween("lax", "lax")).toThrow();
    expect(() => planBetween("nope", "lax")).toThrow();
  });
});
