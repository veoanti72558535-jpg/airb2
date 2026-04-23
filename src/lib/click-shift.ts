/**
 * click-shift.ts — Pure turret-click POI shift calculator.
 *
 * Converts a turret click value (MOA, MRAD, cm/100m, inch/100yd)
 * into a linear POI displacement at a given target distance.
 *
 * No React, no Supabase, no side effects.
 */

export type ClickUnit =
  | 'MOA'        // Minutes of Angle
  | 'MRAD'       // Milliradians (= MIL)
  | 'CM_100M'    // Centimètres à 100 m (EU manufacturers)
  | 'INCH_100YD' // Inches at 100 yards (US manufacturers)

export interface ClickShiftInput {
  clickValueNative: number;  // Value printed on the turret (e.g. 0.25, 0.1, 1)
  clickUnit: ClickUnit;      // Unit printed on the turret
  numberOfClicks: number;    // Number of clicks turned
  targetDistanceM: number;   // Target distance in metres
}

export interface ClickShiftResult {
  shiftMm: number;           // Shift in millimetres
  shiftCm: number;           // Shift in centimetres
  shiftInch: number;         // Shift in inches
  shiftMrad: number;         // Total angular value in MRAD
  shiftMoa: number;          // Total angular value in MOA
  perClickMm: number;        // Single-click shift in mm at targetDistance
  referenceDistanceM: number; // Native reference distance (100 m or 91.44 m)
}

/** 1 MOA = 0.290888 MRAD (exact: π/10800 × 1000) */
const MOA_TO_MRAD = 0.290888;

/**
 * 1 inch at 100 yards in MRAD.
 * 25.4 mm / 91440 mm × 1000 = 0.277778 MRAD
 */
const INCH_100YD_TO_MRAD = 25.4 / 91440 * 1000; // ≈ 0.277778

/**
 * Convert a native click value to milliradians (angle per click).
 *
 * - MOA       : val × 0.290888
 * - MRAD      : val (already MRAD)
 * - CM_100M   : val / 100  (X cm at 100 m ⇒ X/100 MRAD, because 1 MRAD = 100 mm at 100 m)
 * - INCH_100YD: val × 0.277778
 */
function toMrad(value: number, unit: ClickUnit): number {
  switch (unit) {
    case 'MOA':        return value * MOA_TO_MRAD;
    case 'MRAD':       return value;
    case 'CM_100M':    return value / 100; // 1 cm/100 m = 0.01 MRAD — note: CM_100M ≡ MRAD/10
    case 'INCH_100YD': return value * INCH_100YD_TO_MRAD;
  }
}

function referenceDistance(unit: ClickUnit): number {
  return unit === 'INCH_100YD' ? 91.44 : 100;
}

/**
 * Calculate the POI shift for a given turret configuration and target distance.
 */
export function calculateClickShift(input: ClickShiftInput): ClickShiftResult {
  const { clickValueNative, clickUnit, numberOfClicks, targetDistanceM } = input;

  // Step 1 — angle per click in MRAD
  const angleMrad = toMrad(clickValueNative, clickUnit);

  // Step 2 — linear displacement (1 MRAD at D metres = D mm)
  const shiftMm   = angleMrad * numberOfClicks * targetDistanceM;
  const shiftCm   = shiftMm / 10;
  const shiftInch = shiftMm / 25.4;
  const perClickMm = angleMrad * targetDistanceM;

  // Step 3 — angular totals
  const shiftMrad = angleMrad * numberOfClicks;
  const shiftMoa  = shiftMrad / MOA_TO_MRAD;

  return {
    shiftMm,
    shiftCm,
    shiftInch,
    shiftMrad,
    shiftMoa,
    perClickMm,
    referenceDistanceM: referenceDistance(clickUnit),
  };
}

/**
 * Reverse calculation: how many clicks to achieve a desired shift (mm) at a given distance?
 */
export function reverseClickShift(
  desiredMm: number,
  clickValueNative: number,
  clickUnit: ClickUnit,
  targetDistanceM: number,
): { exact: number; rounded: number; actualMm: number; errorMm: number; errorPct: number } {
  const angleMrad = toMrad(clickValueNative, clickUnit);
  const perClickMm = angleMrad * targetDistanceM;
  if (perClickMm === 0) return { exact: 0, rounded: 0, actualMm: 0, errorMm: 0, errorPct: 0 };

  const exact = desiredMm / perClickMm;
  const rounded = Math.round(exact);
  const actualMm = rounded * perClickMm;
  const errorMm = actualMm - desiredMm;
  const errorPct = desiredMm !== 0 ? (errorMm / desiredMm) * 100 : 0;

  return { exact, rounded, actualMm, errorMm, errorPct };
}