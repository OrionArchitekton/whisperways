/**
 * Builds src/data/la-grid.json: a ~250 m population raster over central
 * Los Angeles from the US Census Bureau 2020 tract centers of population.
 *
 * Source (public domain): CenPop2020_Mean_TR06.txt, California tract-level
 * centers of population, columns STATEFP,COUNTYFP,TRACTCE,POPULATION,
 * LATITUDE,LONGITUDE. Filtered to Los Angeles County (COUNTYFP 037) and the
 * study bbox. Each tract's population is assigned to the grid cell containing
 * its center of population, then spread over a 3x3 neighborhood to soften the
 * point-mass approximation. First-order rasterization, documented in README.
 *
 * Usage: node scripts/build-la-grid.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE_URL =
  "https://www2.census.gov/geo/docs/reference/cenpop2020/tract/CenPop2020_Mean_TR06.txt";

// Study area: Santa Monica / LAX west edge to downtown, Van Nuys / Burbank north.
const WEST = -118.6;
const EAST = -118.1;
const SOUTH = 33.9;
const NORTH = 34.25;
const CELL_M = 250;

const M_PER_DEG_LAT = 111320;
const midLat = (SOUTH + NORTH) / 2;
const dLat = CELL_M / M_PER_DEG_LAT;
const dLon = CELL_M / (M_PER_DEG_LAT * Math.cos((midLat * Math.PI) / 180));
const cols = Math.ceil((EAST - WEST) / dLon);
const rows = Math.ceil((NORTH - SOUTH) / dLat);

const res = await fetch(SOURCE_URL);
if (!res.ok) throw new Error(`census fetch failed: ${res.status}`);
const text = await res.text();

const lines = text.trim().split("\n");
const header = lines[0].split(",");
const col = (name) => {
  const i = header.indexOf(name);
  if (i < 0) throw new Error(`missing column ${name} in ${header}`);
  return i;
};
const iCounty = col("COUNTYFP");
const iPop = col("POPULATION");
const iLat = col("LATITUDE");
const iLon = col("LONGITUDE");

const pop = new Float64Array(cols * rows);
let tractsUsed = 0;
let popTotal = 0;
for (const line of lines.slice(1)) {
  const f = line.split(",");
  if (f[iCounty] !== "037") continue;
  const lat = parseFloat(f[iLat]);
  const lon = parseFloat(f[iLon]);
  const p = parseInt(f[iPop], 10);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(p)) continue;
  if (lon < WEST || lon >= EAST || lat < SOUTH || lat >= NORTH) continue;
  const c = Math.floor((lon - WEST) / dLon);
  const r = Math.floor((lat - SOUTH) / dLat);
  // 3x3 spread: half the population on the center cell, half on the ring.
  const ring = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const rc = c + dc;
      const rr = r + dr;
      if (rc < 0 || rc >= cols || rr < 0 || rr >= rows) continue;
      ring.push(rr * cols + rc);
    }
  }
  pop[r * cols + c] += p / 2;
  for (const idx of ring) pop[idx] += p / 2 / ring.length;
  tractsUsed += 1;
  popTotal += p;
}

const out = {
  meta: {
    source: SOURCE_URL,
    sourceNote:
      "US Census Bureau 2020 centers of population, tract level, California; LA County (037) filtered to study bbox; tract population spread over a 3x3 cell neighborhood around its center of population.",
    retrieved: new Date().toISOString().slice(0, 10),
    bbox: { west: WEST, east: EAST, south: SOUTH, north: NORTH },
    cellSizeM: CELL_M,
    cols,
    rows,
    dLon,
    dLat,
    tractsUsed,
    popTotal,
  },
  // Row-major, rounded to whole people to keep the artifact small.
  pop: Array.from(pop, (v) => Math.round(v)),
};

const here = dirname(fileURLToPath(import.meta.url));
const dest = join(here, "..", "src", "data", "la-grid.json");
mkdirSync(dirname(dest), { recursive: true });
writeFileSync(dest, JSON.stringify(out));
console.log(
  `wrote ${dest}: ${cols}x${rows} cells, ${tractsUsed} tracts, ${popTotal} people`,
);
