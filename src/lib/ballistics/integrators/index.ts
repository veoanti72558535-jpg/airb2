/**
 * Integrator dispatcher — P2.
 *
 * Centralises the Euler ↔ trapezoidal selection so both `engine.ts` and
 * `zero-solver.ts` use the same step function for a given config and
 * stay numerically consistent (otherwise the solver would converge to an
 * angle that the flight loop disagrees with by O(dt²)).
 */

import type { Integrator } from '../types';
import { eulerStep, type DecelFn, type IntegratorState } from './euler';
import { trapezoidalStep } from './trapezoidal';
import { heunStep } from './heun';

export type StepFn = (s: IntegratorState, dt: number, decelFn: DecelFn) => void;
export type { DecelFn, IntegratorState };

export function getIntegrator(kind: Integrator): StepFn {
  if (kind === 'trapezoidal') return trapezoidalStep;
  if (kind === 'heun') return heunStep;
  return eulerStep;
}
