/**
 * Curated LA neighborhoods/landmarks used to ground the AI community brief in
 * real places. For each planned route we compute the nearest pass distance and
 * the received noise level there; only places actually inside the audible
 * footprint are handed to the model. Coordinates are approximate centroids.
 */

import {
  audibleHorizontalRadiusM,
  excessOverAmbientDb,
  slantDistanceM,
  soundLevelAtDb,
} from "./noise";
import type { Scenario } from "./route";

export interface Landmark {
  name: string;
  lon: number;
  lat: number;
}

export const LANDMARKS: Landmark[] = [
  { name: "Inglewood", lon: -118.3531, lat: 33.9617 },
  { name: "Culver City", lon: -118.3965, lat: 34.0211 },
  { name: "Baldwin Hills", lon: -118.37, lat: 34.01 },
  { name: "Koreatown", lon: -118.3009, lat: 34.0577 },
  { name: "Hollywood", lon: -118.3287, lat: 34.0928 },
  { name: "West Hollywood", lon: -118.3617, lat: 34.09 },
  { name: "Beverly Hills", lon: -118.4004, lat: 34.0736 },
  { name: "Westwood", lon: -118.4426, lat: 34.0561 },
  { name: "Santa Monica", lon: -118.4912, lat: 34.0195 },
  { name: "Venice", lon: -118.4695, lat: 33.985 },
  { name: "Mar Vista", lon: -118.4318, lat: 34.0048 },
  { name: "Studio City", lon: -118.387, lat: 34.1395 },
  { name: "Sherman Oaks", lon: -118.4489, lat: 34.1508 },
  { name: "North Hollywood", lon: -118.3769, lat: 34.172 },
  { name: "Echo Park", lon: -118.2606, lat: 34.0782 },
  { name: "Silver Lake", lon: -118.2702, lat: 34.0869 },
  { name: "Boyle Heights", lon: -118.2073, lat: 34.0339 },
  { name: "South Los Angeles", lon: -118.291, lat: 34.006 },
  { name: "Atwater Village", lon: -118.262, lat: 34.1176 },
  { name: "Van Nuys", lon: -118.4487, lat: 34.1867 },
  { name: "Burbank", lon: -118.309, lat: 34.1808 },
  { name: "Hawthorne", lon: -118.3526, lat: 33.9164 },
  { name: "Fairfax District", lon: -118.3614, lat: 34.078 },
  { name: "Miracle Mile", lon: -118.352, lat: 34.062 },
  { name: "Toluca Lake", lon: -118.352, lat: 34.1517 },
  { name: "Westchester", lon: -118.4001, lat: 33.9601 },
  { name: "Ladera Heights", lon: -118.3767, lat: 33.9928 },
  { name: "Mid-City", lon: -118.345, lat: 34.048 },
];

export interface LandmarkExposure {
  name: string;
  /** Horizontal distance in meters from the landmark to the closest pass. */
  nearestPassM: number;
  /** Received level in dBA at the nearest pass. */
  levelDb: number;
  /** Excess over the scenario ambient in dB. */
  excessDb: number;
}

const M_PER_DEG_LAT = 111320;

function horizontalDistanceM(
  a: { lon: number; lat: number },
  b: { lon: number; lat: number },
): number {
  const midLat = ((a.lat + b.lat) / 2) * (Math.PI / 180);
  const dx = (a.lon - b.lon) * M_PER_DEG_LAT * Math.cos(midLat);
  const dy = (a.lat - b.lat) * M_PER_DEG_LAT;
  return Math.hypot(dx, dy);
}

/**
 * Landmarks inside the audible footprint of a route polyline, loudest first.
 * Pure geometry over the route's lon/lat points; no grid access needed.
 */
export function landmarksOnRoute(
  line: [number, number][],
  scenario: Scenario,
  landmarks: Landmark[] = LANDMARKS,
): LandmarkExposure[] {
  const radiusM = audibleHorizontalRadiusM(
    scenario.profile,
    scenario.altitudeM,
    scenario.ambientDb,
  );
  if (radiusM <= 0) return [];
  const out: LandmarkExposure[] = [];
  for (const lm of landmarks) {
    let nearest = Infinity;
    for (const [lon, lat] of line) {
      const d = horizontalDistanceM(lm, { lon, lat });
      if (d < nearest) nearest = d;
    }
    if (nearest > radiusM) continue;
    const levelDb = soundLevelAtDb(
      scenario.profile,
      slantDistanceM(scenario.altitudeM, nearest),
    );
    out.push({
      name: lm.name,
      nearestPassM: Math.round(nearest),
      levelDb: Math.round(levelDb * 10) / 10,
      excessDb: Math.round(excessOverAmbientDb(levelDb, scenario.ambientDb) * 10) / 10,
    });
  }
  return out.sort((a, b) => b.excessDb - a.excessDb);
}
