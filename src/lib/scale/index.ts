import type { ScaleCalibration, Point2D } from '@/types';

/** Euclidean distance between two 2D points (in screen/canvas pixels). */
export function distance2D(a: Point2D, b: Point2D): number {
  return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
}

/**
 * Compute how many world units correspond to one foot, given a calibration.
 * If the calibration unit is meters, the real-world length is first converted
 * to feet so all internal calculations stay in feet.
 */
export function computeWorldUnitsPerFoot(cal: ScaleCalibration): number {
  const pixelLength = distance2D(
    cal.calibrationLine[0],
    cal.calibrationLine[1],
  );
  const realFt =
    cal.unit === 'meters'
      ? cal.realWorldLength * 3.28084
      : cal.realWorldLength;
  return pixelLength / realFt;
}

/** Convert a world-unit distance to feet. */
export function worldUnitsToFeet(
  units: number,
  worldUnitsPerFoot: number,
): number {
  return units / worldUnitsPerFoot;
}

/** Convert a foot distance to world units. */
export function feetToWorldUnits(
  ft: number,
  worldUnitsPerFoot: number,
): number {
  return ft * worldUnitsPerFoot;
}
