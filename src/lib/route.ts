/**
 * Corridor planning: a precomputed population-noise cost raster + Dijkstra.
 *
 * Flying over cell C ensonifies C's neighborhood. The raster therefore holds,
 * for each overflight cell, the population-weighted sum of excess-over-ambient
 * dB across every ground cell inside the audible footprint. Routing then
 * trades meters against person-dB via a single bias weight.
 */

import { cellIndex, inBounds, type Cell, type Grid } from "./grid";
import {
  audibleHorizontalRadiusM,
  excessOverAmbientDb,
  slantDistanceM,
  soundLevelAtDb,
  type AircraftNoiseProfile,
} from "./noise";

export interface Scenario {
  profile: AircraftNoiseProfile;
  /** Cruise altitude AGL in meters. */
  altitudeM: number;
  /** Ambient soundscape in dBA (e.g. ~40 residential night, ~50 urban day). */
  ambientDb: number;
  /** Cruise speed in m/s (used for flight-time estimates). */
  cruiseSpeedMps: number;
}

export interface PlanRequest {
  start: Cell;
  end: Cell;
  scenario: Scenario;
  /**
   * Meters of detour the quiet route will accept to avoid one person-dB of
   * exposure. 0 reproduces the direct route.
   */
  quietBias?: number;
}

export interface RouteResult {
  path: Cell[];
  distanceM: number;
  flightTimeMin: number;
  /** Sum over ensonified cells of population * max excess dB (person-dB). */
  exposureIndex: number;
  /** People living in cells where the overflight is audible above ambient. */
  peopleAudible: number;
}

export interface ComparisonResult {
  direct: RouteResult;
  quiet: RouteResult;
  exposureReductionPct: number;
  addedTimePct: number;
}

const DEFAULT_QUIET_BIAS = 0.05;

interface KernelOffset {
  dc: number;
  dr: number;
  /** Excess dB heard by one person at this horizontal offset. */
  excessDb: number;
}

/** Audible-footprint kernel for one overflight position. */
export function footprintKernel(g: Grid, s: Scenario): KernelOffset[] {
  const radiusM = audibleHorizontalRadiusM(s.profile, s.altitudeM, s.ambientDb);
  const radiusCells = Math.ceil(radiusM / g.cellSizeM);
  const offsets: KernelOffset[] = [];
  for (let dr = -radiusCells; dr <= radiusCells; dr++) {
    for (let dc = -radiusCells; dc <= radiusCells; dc++) {
      const horizM = Math.hypot(dc, dr) * g.cellSizeM;
      if (horizM > radiusM) continue;
      const level = soundLevelAtDb(s.profile, slantDistanceM(s.altitudeM, horizM));
      const excessDb = excessOverAmbientDb(level, s.ambientDb);
      if (excessDb > 0) offsets.push({ dc, dr, excessDb });
    }
  }
  return offsets;
}

/** Person-dB cost of overflying each cell (population convolved with kernel). */
export function noiseCostRaster(g: Grid, s: Scenario): Float64Array {
  const kernel = footprintKernel(g, s);
  const cost = new Float64Array(g.cols * g.rows);
  for (let row = 0; row < g.rows; row++) {
    for (let col = 0; col < g.cols; col++) {
      let sum = 0;
      for (const k of kernel) {
        const n = { col: col + k.dc, row: row + k.dr };
        if (!inBounds(g, n)) continue;
        const pop = g.pop[cellIndex(g, n)];
        if (pop > 0) sum += pop * k.excessDb;
      }
      cost[row * g.cols + col] = sum;
    }
  }
  return cost;
}

/** Binary min-heap keyed on cost, holding cell indices. */
class MinHeap {
  private keys: number[] = [];
  private vals: number[] = [];
  get size() {
    return this.vals.length;
  }
  push(key: number, val: number) {
    this.keys.push(key);
    this.vals.push(val);
    let i = this.vals.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.keys[p] <= this.keys[i]) break;
      this.swap(i, p);
      i = p;
    }
  }
  pop(): number {
    const top = this.vals[0];
    const lastKey = this.keys.pop()!;
    const lastVal = this.vals.pop()!;
    if (this.vals.length > 0) {
      this.keys[0] = lastKey;
      this.vals[0] = lastVal;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < this.keys.length && this.keys[l] < this.keys[m]) m = l;
        if (r < this.keys.length && this.keys[r] < this.keys[m]) m = r;
        if (m === i) break;
        this.swap(i, m);
        i = m;
      }
    }
    return top;
  }
  private swap(a: number, b: number) {
    [this.keys[a], this.keys[b]] = [this.keys[b], this.keys[a]];
    [this.vals[a], this.vals[b]] = [this.vals[b], this.vals[a]];
  }
}

const STEPS: Array<{ dc: number; dr: number; lenCells: number }> = [
  { dc: 1, dr: 0, lenCells: 1 },
  { dc: -1, dr: 0, lenCells: 1 },
  { dc: 0, dr: 1, lenCells: 1 },
  { dc: 0, dr: -1, lenCells: 1 },
  { dc: 1, dr: 1, lenCells: Math.SQRT2 },
  { dc: 1, dr: -1, lenCells: Math.SQRT2 },
  { dc: -1, dr: 1, lenCells: Math.SQRT2 },
  { dc: -1, dr: -1, lenCells: Math.SQRT2 },
];

function dijkstra(
  g: Grid,
  cost: Float64Array,
  start: Cell,
  end: Cell,
  noiseWeight: number,
): Cell[] {
  const n = g.cols * g.rows;
  const dist = new Float64Array(n).fill(Infinity);
  const prev = new Int32Array(n).fill(-1);
  const done = new Uint8Array(n);
  const startIdx = cellIndex(g, start);
  const endIdx = cellIndex(g, end);
  dist[startIdx] = 0;
  const heap = new MinHeap();
  heap.push(0, startIdx);
  while (heap.size > 0) {
    const u = heap.pop();
    if (done[u]) continue;
    done[u] = 1;
    if (u === endIdx) break;
    const uCol = u % g.cols;
    const uRow = (u / g.cols) | 0;
    for (const s of STEPS) {
      const v = { col: uCol + s.dc, row: uRow + s.dr };
      if (!inBounds(g, v)) continue;
      const vIdx = cellIndex(g, v);
      if (done[vIdx]) continue;
      const stepM = s.lenCells * g.cellSizeM;
      const edge = stepM + noiseWeight * cost[vIdx] * s.lenCells;
      const alt = dist[u] + edge;
      if (alt < dist[vIdx]) {
        dist[vIdx] = alt;
        prev[vIdx] = u;
        heap.push(alt, vIdx);
      }
    }
  }
  const path: Cell[] = [];
  for (let i = endIdx; i !== -1; i = prev[i]) {
    path.push({ col: i % g.cols, row: (i / g.cols) | 0 });
    if (i === startIdx) break;
  }
  return path.reverse();
}

function pathDistanceM(g: Grid, path: Cell[]): number {
  let m = 0;
  for (let i = 1; i < path.length; i++) {
    const dc = path[i].col - path[i - 1].col;
    const dr = path[i].row - path[i - 1].row;
    m += Math.hypot(dc, dr) * g.cellSizeM;
  }
  return m;
}

/** Footprint accounting: each ground cell hears its loudest pass only. */
function exposureForPath(
  g: Grid,
  s: Scenario,
  kernel: KernelOffset[],
  path: Cell[],
): { exposureIndex: number; peopleAudible: number } {
  const maxExcess = new Map<number, number>();
  for (const cell of path) {
    for (const k of kernel) {
      const ground = { col: cell.col + k.dc, row: cell.row + k.dr };
      if (!inBounds(g, ground)) continue;
      const idx = cellIndex(g, ground);
      const cur = maxExcess.get(idx);
      if (cur === undefined || k.excessDb > cur) maxExcess.set(idx, k.excessDb);
    }
  }
  let exposureIndex = 0;
  let peopleAudible = 0;
  for (const [idx, excess] of maxExcess) {
    const pop = g.pop[idx];
    if (pop <= 0) continue;
    exposureIndex += pop * excess;
    peopleAudible += pop;
  }
  return { exposureIndex, peopleAudible };
}

function routeResult(
  g: Grid,
  s: Scenario,
  kernel: KernelOffset[],
  path: Cell[],
): RouteResult {
  const distanceM = pathDistanceM(g, path);
  return {
    path,
    distanceM,
    flightTimeMin: distanceM / s.cruiseSpeedMps / 60,
    ...exposureForPath(g, s, kernel, path),
  };
}

export function planCorridors(g: Grid, req: PlanRequest): ComparisonResult {
  const s = req.scenario;
  const kernel = footprintKernel(g, s);
  const cost = noiseCostRaster(g, s);
  const bias = req.quietBias ?? DEFAULT_QUIET_BIAS;
  const direct = routeResult(g, s, kernel, dijkstra(g, cost, req.start, req.end, 0));
  const quiet = routeResult(
    g,
    s,
    kernel,
    dijkstra(g, cost, req.start, req.end, bias),
  );
  const exposureReductionPct =
    direct.exposureIndex > 0
      ? (1 - quiet.exposureIndex / direct.exposureIndex) * 100
      : 0;
  const addedTimePct =
    direct.flightTimeMin > 0
      ? (quiet.flightTimeMin / direct.flightTimeMin - 1) * 100
      : 0;
  return { direct, quiet, exposureReductionPct, addedTimePct };
}
