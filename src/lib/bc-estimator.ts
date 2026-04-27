/**
 * D1 — BC Estimator (inverse calculation).
 * Uses Newton-Raphson iteration over the ballistic engine to find the BC
 * that matches an observed drop at a measured distance.
 * 100% deterministic — the AI agent only formats the result.
 */
import { calculateTrajectory } from '@/lib/ballistics';
import type { BallisticInput, DragModel } from '@/lib/types';

interface BcEstimateInput {
  muzzleVelocity: number; // m/s
  sightHeight: number;    // mm
  zeroRange: number;      // m
  measuredDistance: number; // m
  measuredDropMm: number;  // mm (positive = below line of sight)
  projectileWeight: number; // grains
  dragModel?: DragModel;
  weather?: BallisticInput['weather'];
}

interface BcEstimateResult {
  estimatedBc: number;
  iterations: number;
  residualMm: number;
  converged: boolean;
}

/**
 * Estimate the ballistic coefficient from a measured drop at a given distance.
 * Uses secant method (derivative-free Newton variant) for robustness.
 */
export function estimateBcFromDrop(input: BcEstimateInput): BcEstimateResult {
  const {
    muzzleVelocity,
    sightHeight,
    zeroRange,
    measuredDistance,
    measuredDropMm,
    projectileWeight,
    dragModel = 'G1',
    weather,
  } = input;

  const targetDrop = -Math.abs(measuredDropMm); // drop is negative below LOS

  // Build a base ballistic input template
  const baseInput: BallisticInput = {
    muzzleVelocity,
    bc: 0.03, // placeholder
    projectileWeight,
    sightHeight,
    zeroRange,
    maxRange: measuredDistance + 10,
    rangeStep: Math.max(1, Math.round(measuredDistance / 10)),
    dragModel,
    weather: weather ?? {
      temperature: 15,
      humidity: 50,
      pressure: 1013.25,
      altitude: 0,
      windSpeed: 0,
      windAngle: 0,
      source: 'manual',
      timestamp: new Date().toISOString(),
    },
  };

  function getDropAtBc(bc: number): number {
    const inp = { ...baseInput, bc: Math.max(0.001, bc) };
    try {
      const results = calculateTrajectory(inp);
      // Find the closest range row
      let closest = results[0];
      for (const r of results) {
        if (Math.abs(r.range - measuredDistance) < Math.abs(closest.range - measuredDistance)) {
          closest = r;
        }
      }
      return closest.drop;
    } catch {
      return -9999;
    }
  }

  // Secant method: two initial guesses
  let bc0 = 0.01;
  let bc1 = 0.06;
  let f0 = getDropAtBc(bc0) - targetDrop;
  let f1 = getDropAtBc(bc1) - targetDrop;
  let iterations = 0;
  const maxIter = 30;
  const tolerance = 0.05; // 0.05mm

  for (iterations = 0; iterations < maxIter; iterations++) {
    if (Math.abs(f1) < tolerance) break;
    if (Math.abs(f1 - f0) < 1e-12) break; // prevent division by zero

    const bcNext = bc1 - f1 * (bc1 - bc0) / (f1 - f0);
    bc0 = bc1;
    f0 = f1;
    bc1 = Math.max(0.001, Math.min(0.999, bcNext)); // clamp
    f1 = getDropAtBc(bc1) - targetDrop;
  }

  return {
    estimatedBc: Math.round(bc1 * 10000) / 10000, // 4 decimal places
    iterations,
    residualMm: Math.abs(f1),
    converged: Math.abs(f1) < tolerance,
  };
}
