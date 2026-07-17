/**
 * First-order acoustic model for AAM overflight noise.
 *
 * Geometric (spherical) spreading only: L(d) = L0 - 20 * log10(d / d0).
 * No atmospheric absorption, terrain shielding, or directivity. This is a
 * planning heuristic, not certification acoustics; the UI labels it as such.
 *
 * Reference source levels come from published flyover measurements
 * (e.g. Joby S4 ~45.2 dBA at 500 m overflight, NASA/Joby 2022 campaign).
 */

export interface AircraftNoiseProfile {
  /** Measured sound level in dBA at the reference distance. */
  sourceDb: number;
  /** Distance in meters at which sourceDb was measured. */
  refDistanceM: number;
}

/** Sound level in dBA at a slant distance from the aircraft. */
export function soundLevelAtDb(
  profile: AircraftNoiseProfile,
  slantM: number,
): number {
  const d = Math.max(slantM, 1);
  return profile.sourceDb - 20 * Math.log10(d / profile.refDistanceM);
}

/** Straight-line distance from an aircraft at altitude to a ground point. */
export function slantDistanceM(altitudeM: number, horizontalM: number): number {
  return Math.hypot(altitudeM, horizontalM);
}

/** How far above the ambient soundscape the received level is, floored at 0. */
export function excessOverAmbientDb(levelDb: number, ambientDb: number): number {
  return Math.max(0, levelDb - ambientDb);
}

/**
 * Horizontal radius (m) inside which the overflight is audible above ambient,
 * for an aircraft at the given altitude. 0 when inaudible even overhead.
 * Solves L(slant) = ambient for the horizontal offset.
 */
export function audibleHorizontalRadiusM(
  profile: AircraftNoiseProfile,
  altitudeM: number,
  ambientDb: number,
): number {
  const overhead = soundLevelAtDb(profile, slantDistanceM(altitudeM, 0));
  if (overhead <= ambientDb) return 0;
  // slant where level == ambient: d = d0 * 10^((L0 - ambient) / 20)
  const slantAtAmbient =
    profile.refDistanceM * Math.pow(10, (profile.sourceDb - ambientDb) / 20);
  const sq = slantAtAmbient * slantAtAmbient - altitudeM * altitudeM;
  return sq <= 0 ? 0 : Math.sqrt(sq);
}
