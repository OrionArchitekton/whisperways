import { describe, expect, it } from "vitest";
import { makeGrid, type Grid } from "../grid";
import { noiseCostRaster, planCorridors } from "../route";

const PROFILE = { sourceDb: 45.2, refDistanceM: 500 };
const SCENARIO = {
  profile: PROFILE,
  altitudeM: 300,
  ambientDb: 40,
  cruiseSpeedMps: 60,
};

/** 30x30 grid, 250 m cells, empty population. */
function emptyGrid(): Grid {
  return makeGrid({ cols: 30, rows: 30, cellSizeM: 250 });
}

/**
 * Grid with a dense population wall down column 15, except a gap at row 25.
 * Start (2,2) -> end (28,2): the straight line crosses the wall; the quiet
 * detour goes down to the gap.
 */
function walledGrid(): Grid {
  const g = emptyGrid();
  for (let row = 0; row < g.rows; row++) {
    if (row >= 24 && row <= 26) continue; // the quiet gap
    for (let col = 13; col <= 17; col++) {
      g.pop[row * g.cols + col] = 5000;
    }
  }
  return g;
}

describe("noiseCostRaster", () => {
  it("is zero everywhere on an unpopulated grid", () => {
    const cost = noiseCostRaster(emptyGrid(), SCENARIO);
    expect(Math.max(...cost)).toBe(0);
  });

  it("peaks over the populated cells and spreads to neighbors", () => {
    const g = walledGrid();
    const cost = noiseCostRaster(g, SCENARIO);
    const overWall = cost[2 * g.cols + 15];
    const farAway = cost[2 * g.cols + 2];
    expect(overWall).toBeGreaterThan(0);
    expect(farAway).toBe(0);
    // a cell adjacent to the wall is ensonified too (footprint radius > cell)
    const nextToWall = cost[2 * g.cols + 12];
    expect(nextToWall).toBeGreaterThan(0);
    expect(nextToWall).toBeLessThan(overWall);
  });
});

describe("planCorridors", () => {
  it("returns a near-straight direct route on an empty grid", () => {
    const g = emptyGrid();
    const res = planCorridors(g, {
      start: { col: 2, row: 2 },
      end: { col: 28, row: 2 },
      scenario: SCENARIO,
    });
    // 26 cells * 250 m = 6500 m straight-line
    expect(res.direct.distanceM).toBeCloseTo(6500, 0);
    // no population -> both routes identical cost; quiet should not detour
    expect(res.quiet.distanceM).toBeCloseTo(res.direct.distanceM, 0);
    expect(res.direct.exposureIndex).toBe(0);
  });

  it("routes the quiet corridor around a population wall", () => {
    const g = walledGrid();
    const res = planCorridors(g, {
      start: { col: 2, row: 2 },
      end: { col: 28, row: 2 },
      scenario: SCENARIO,
    });
    // direct flies through the wall and ensonifies people
    expect(res.direct.exposureIndex).toBeGreaterThan(0);
    expect(res.direct.peopleAudible).toBeGreaterThan(0);
    // quiet takes a longer path but reduces exposure
    expect(res.quiet.distanceM).toBeGreaterThan(res.direct.distanceM);
    expect(res.quiet.exposureIndex).toBeLessThan(res.direct.exposureIndex);
    // quiet route passes near the gap rows
    const quietRows = res.quiet.path.map((p) => p.row);
    expect(Math.max(...quietRows)).toBeGreaterThanOrEqual(20);
  });

  it("computes comparison stats and flight times", () => {
    const g = walledGrid();
    const res = planCorridors(g, {
      start: { col: 2, row: 2 },
      end: { col: 28, row: 2 },
      scenario: SCENARIO,
    });
    expect(res.exposureReductionPct).toBeGreaterThan(0);
    expect(res.exposureReductionPct).toBeLessThanOrEqual(100);
    expect(res.addedTimePct).toBeGreaterThan(0);
    expect(res.direct.flightTimeMin).toBeCloseTo(
      res.direct.distanceM / 60 / 60,
      3,
    );
  });

  it("never reports quiet exposure above direct exposure", () => {
    // property-style check across several start/end pairs
    const g = walledGrid();
    const pairs = [
      [{ col: 1, row: 1 }, { col: 28, row: 28 }],
      [{ col: 1, row: 15 }, { col: 28, row: 15 }],
      [{ col: 15, row: 1 }, { col: 15, row: 28 }],
    ] as const;
    for (const [start, end] of pairs) {
      const res = planCorridors(g, { start, end, scenario: SCENARIO });
      expect(res.quiet.exposureIndex).toBeLessThanOrEqual(
        res.direct.exposureIndex + 1e-9,
      );
    }
  });
});
