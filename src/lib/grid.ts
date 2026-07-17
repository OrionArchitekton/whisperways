/**
 * Uniform planning grid. Population lives in a flat Float64Array indexed
 * row-major (index = row * cols + col). Optional georeferencing maps cells
 * to lon/lat for the LA dataset; the engine itself is geo-agnostic.
 */

export interface Cell {
  col: number;
  row: number;
}

export interface Grid {
  cols: number;
  rows: number;
  /** Edge length of a (square) cell in meters. */
  cellSizeM: number;
  /** Population per cell, row-major. */
  pop: Float64Array;
  /** Longitude of the west edge of column 0 (optional georeferencing). */
  originLon?: number;
  /** Latitude of the south edge of row 0 (optional georeferencing). */
  originLat?: number;
  /** Degrees of longitude per column. */
  dLon?: number;
  /** Degrees of latitude per row. */
  dLat?: number;
}

export function makeGrid(init: {
  cols: number;
  rows: number;
  cellSizeM: number;
  originLon?: number;
  originLat?: number;
  dLon?: number;
  dLat?: number;
}): Grid {
  return { ...init, pop: new Float64Array(init.cols * init.rows) };
}

export function cellIndex(g: Grid, cell: Cell): number {
  return cell.row * g.cols + cell.col;
}

export function inBounds(g: Grid, cell: Cell): boolean {
  return cell.col >= 0 && cell.col < g.cols && cell.row >= 0 && cell.row < g.rows;
}

/** Nearest cell for a lon/lat point; null when outside the grid. */
export function lonLatToCell(g: Grid, lon: number, lat: number): Cell | null {
  if (
    g.originLon === undefined ||
    g.originLat === undefined ||
    g.dLon === undefined ||
    g.dLat === undefined
  ) {
    return null;
  }
  const cell = {
    col: Math.floor((lon - g.originLon) / g.dLon),
    row: Math.floor((lat - g.originLat) / g.dLat),
  };
  return inBounds(g, cell) ? cell : null;
}

/** Center lon/lat of a cell; null when the grid is not georeferenced. */
export function cellToLonLat(g: Grid, cell: Cell): [number, number] | null {
  if (
    g.originLon === undefined ||
    g.originLat === undefined ||
    g.dLon === undefined ||
    g.dLat === undefined
  ) {
    return null;
  }
  return [
    g.originLon + (cell.col + 0.5) * g.dLon,
    g.originLat + (cell.row + 0.5) * g.dLat,
  ];
}
