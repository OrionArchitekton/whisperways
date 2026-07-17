import { describe, expect, it } from "vitest";
import {
  audibleHorizontalRadiusM,
  excessOverAmbientDb,
  slantDistanceM,
  soundLevelAtDb,
} from "../noise";

const JOBY_CRUISE = { sourceDb: 45.2, refDistanceM: 500 };

describe("soundLevelAtDb", () => {
  it("returns the source level at the reference distance", () => {
    expect(soundLevelAtDb(JOBY_CRUISE, 500)).toBeCloseTo(45.2, 5);
  });

  it("drops ~6.02 dB per doubling of distance (spherical spreading)", () => {
    const at500 = soundLevelAtDb(JOBY_CRUISE, 500);
    const at1000 = soundLevelAtDb(JOBY_CRUISE, 1000);
    expect(at500 - at1000).toBeCloseTo(6.0206, 3);
  });

  it("is strictly monotonically decreasing with distance", () => {
    const levels = [100, 250, 500, 1000, 2000].map((d) =>
      soundLevelAtDb(JOBY_CRUISE, d),
    );
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i]).toBeLessThan(levels[i - 1]);
    }
  });
});

describe("slantDistanceM", () => {
  it("is the altitude directly overhead", () => {
    expect(slantDistanceM(300, 0)).toBe(300);
  });

  it("is the hypotenuse of altitude and horizontal offset", () => {
    expect(slantDistanceM(300, 400)).toBeCloseTo(500, 5);
  });
});

describe("excessOverAmbientDb", () => {
  it("is positive when the aircraft is louder than ambient", () => {
    // 45.2 dBA source at 500 m ref, 300 m overhead -> ~49.6 dBA vs 40 ambient
    const level = soundLevelAtDb(JOBY_CRUISE, 300);
    expect(excessOverAmbientDb(level, 40)).toBeCloseTo(level - 40, 5);
    expect(excessOverAmbientDb(level, 40)).toBeGreaterThan(9);
  });

  it("clamps to zero when below ambient (inaudible over city noise)", () => {
    const level = soundLevelAtDb(JOBY_CRUISE, 2000);
    expect(excessOverAmbientDb(level, 60)).toBe(0);
  });
});

describe("audibleHorizontalRadiusM", () => {
  it("returns 0 when inaudible even directly overhead", () => {
    expect(audibleHorizontalRadiusM(JOBY_CRUISE, 300, 60)).toBe(0);
  });

  it("returns the horizontal offset where the level falls to ambient", () => {
    const r = audibleHorizontalRadiusM(JOBY_CRUISE, 300, 40);
    // level at that horizontal offset should equal ambient
    const level = soundLevelAtDb(JOBY_CRUISE, slantDistanceM(300, r));
    expect(level).toBeCloseTo(40, 3);
    expect(r).toBeGreaterThan(500);
    expect(r).toBeLessThan(1500);
  });
});
