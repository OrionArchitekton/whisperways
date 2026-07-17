/**
 * Los Angeles study area: georeferenced census grid + curated vertiport set
 * + scenario presets. This is the app-facing wrapper around the pure engine.
 */

import gridJson from "../data/la-grid.json";
import { cellToLonLat, lonLatToCell, type Grid } from "./grid";
import { planCorridors, type ComparisonResult, type Scenario } from "./route";

export interface Vertiport {
  id: string;
  name: string;
  lon: number;
  lat: number;
  note: string;
}

/**
 * Curated candidate vertiport sites: existing airports/heliport-friendly
 * locations and major transit hubs inside the study area. Illustrative
 * planning sites, not proposed facilities.
 */
export const VERTIPORTS: Vertiport[] = [
  { id: "lax", name: "LAX Gateway", lon: -118.417, lat: 33.9455, note: "96th St transit center area" },
  { id: "dtla", name: "Union Station DTLA", lon: -118.2365, lat: 34.056, note: "regional rail hub" },
  { id: "smo", name: "Santa Monica Airport", lon: -118.4513, lat: 34.0158, note: "existing airfield" },
  { id: "vny", name: "Van Nuys Airport", lon: -118.4899, lat: 34.2098, note: "existing GA airport" },
  { id: "bur", name: "Hollywood Burbank", lon: -118.3585, lat: 34.1983, note: "existing airport" },
  { id: "usc", name: "Expo Park / USC", lon: -118.2851, lat: 34.0141, note: "events + campus hub" },
];

/** Joby S4 overflight, ~45.2 dBA at 500 m (NASA/Joby 2022 flyover campaign). */
export const EVTOL_PROFILE = { sourceDb: 45.2, refDistanceM: 500 };

export const SCENARIOS = {
  night: {
    profile: EVTOL_PROFILE,
    altitudeM: 300,
    ambientDb: 40,
    cruiseSpeedMps: 60,
  },
  day: {
    profile: EVTOL_PROFILE,
    altitudeM: 300,
    ambientDb: 50,
    cruiseSpeedMps: 60,
  },
} satisfies Record<string, Scenario>;

export type ScenarioName = keyof typeof SCENARIOS;

let cached: Grid | null = null;

export function laGrid(): Grid {
  if (!cached) {
    const m = gridJson.meta;
    cached = {
      cols: m.cols,
      rows: m.rows,
      cellSizeM: m.cellSizeM,
      originLon: m.bbox.west,
      originLat: m.bbox.south,
      dLon: m.dLon,
      dLat: m.dLat,
      pop: Float64Array.from(gridJson.pop),
    };
  }
  return cached;
}

export interface LaComparison extends ComparisonResult {
  directLine: [number, number][];
  quietLine: [number, number][];
  from: Vertiport;
  to: Vertiport;
  scenario: ScenarioName;
}

export function planBetween(
  fromId: string,
  toId: string,
  scenario: ScenarioName = "night",
): LaComparison {
  const from = VERTIPORTS.find((v) => v.id === fromId);
  const to = VERTIPORTS.find((v) => v.id === toId);
  if (!from || !to) throw new Error(`unknown vertiport: ${fromId} or ${toId}`);
  if (from.id === to.id) throw new Error("origin and destination are the same");
  const g = laGrid();
  const start = lonLatToCell(g, from.lon, from.lat);
  const end = lonLatToCell(g, to.lon, to.lat);
  if (!start || !end) throw new Error("vertiport outside study grid");
  const res = planCorridors(g, { start, end, scenario: SCENARIOS[scenario] });
  const toLine = (path: { col: number; row: number }[]) =>
    path.map((c) => cellToLonLat(g, c)!) as [number, number][];
  return {
    ...res,
    directLine: toLine(res.direct.path),
    quietLine: toLine(res.quiet.path),
    from,
    to,
    scenario,
  };
}
