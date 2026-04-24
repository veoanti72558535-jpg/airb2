/**
 * Heun (Runge-Kutta ordre 2) — formule ChairGun.
 *
 * Différence avec `trapezoidal.ts` :
 * - Heun met à jour position ET vitesse via la moyenne (k1+k2)/2.
 * - `trapezoidal.ts` met à jour la position via la moyenne des
 *   vitesses « avant/après » update — équivalent algébrique mais
 *   numériquement non bit-exact.
 *
 * On garde les deux pour préserver les sessions sauvegardées sous le
 * profil `mero` (qui utilise `trapezoidal`) tout en proposant Heun
 * comme nouveau défaut amélioré.
 */

import type { IntegratorState, DecelFn } from './euler';

const GRAVITY = 9.80665;

export function heunStep(s: IntegratorState, dt: number, decelFn: DecelFn): void {
  const v0 = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
  if (v0 < 1) return;

  // ── k1 — dérivées au point actuel ────────────────────────────────
  const decel0 = decelFn(v0);
  const k1_vx = -(decel0 * s.vx) / v0;
  const k1_vy = -GRAVITY - (decel0 * s.vy) / v0;
  const k1_x = s.vx;
  const k1_y = s.vy;

  // ── Prédiction Euler complète ────────────────────────────────────
  const pvx = s.vx + k1_vx * dt;
  const pvy = s.vy + k1_vy * dt;
  const px = s.x + k1_x * dt;
  const py = s.y + k1_y * dt;

  const vPred = Math.sqrt(pvx * pvx + pvy * pvy);
  if (vPred < 1) {
    // Le predictor stalle : repli Euler pour ne pas figer la boucle.
    s.vx = pvx;
    s.vy = pvy;
    s.x = px;
    s.y = py;
    return;
  }

  // ── k2 — dérivées à l'état prédit ────────────────────────────────
  const decel1 = decelFn(vPred);
  const k2_vx = -(decel1 * pvx) / vPred;
  const k2_vy = -GRAVITY - (decel1 * pvy) / vPred;
  const k2_x = pvx;
  const k2_y = pvy;

  // ── Correction : moyenne des deux ────────────────────────────────
  s.vx += 0.5 * (k1_vx + k2_vx) * dt;
  s.vy += 0.5 * (k1_vy + k2_vy) * dt;
  s.x += 0.5 * (k1_x + k2_x) * dt;
  s.y += 0.5 * (k1_y + k2_y) * dt;
}