/**
 * ChairGun Elite subsonic drag table — reverse-engineered from
 * `com.jetlab.chairgunelite` (decompiled APK v4.7.2).
 *
 * This 14-point Mach/Cd table is the exact table ChairGun uses for its
 * G1-variant subsonic pellet drag model. It differs significantly from the
 * standard G1 piecewise curve used by the legacy profile:
 *   - Lower Cd baseline (~0.26 vs 0.235 at Mach 0)
 *   - Smooth quadratic-like trough at Mach 0.5 (Cd ≈ 0.20)
 *   - Sharp ramp from 0.60 → 1.00 (transonic spike)
 *
 * The ChairGun retardation formula is `(Cd / BC) * v` — NOT the
 * `(Cd * atmo * v² * DRAG_K) / BC` used by the legacy/mero profiles.
 * This table is consumed by the `chairgun` CdResolver and the
 * `chairgunRetardation` function.
 *
 * Source: c:\adb\tt\chairgun_engine.js lines 12-17
 */

/**
 * Exact 14-point Mach/Cd table from ChairGun Elite.
 * Sorted ascending by Mach. Cd is dimensionless.
 */
export const CHAIRGUN_DRAG_TABLE: readonly [mach: number, cd: number][] = [
  [0.00, 0.2629],
  [0.05, 0.2558],
  [0.10, 0.2487],
  [0.15, 0.2413],
  [0.20, 0.2344],
  [0.25, 0.2278],
  [0.30, 0.2214],
  [0.35, 0.2155],
  [0.40, 0.2104],
  [0.45, 0.2061],
  [0.50, 0.2032],
  [0.55, 0.2020],
  [0.60, 0.2034],
  [1.00, 0.3500],
] as const;

/**
 * Speed of sound used by ChairGun Elite (m/s).
 * ChairGun uses 340.3 (ISA at 15 °C, dry air); the legacy engine uses 343.
 * We match ChairGun's value exactly for the chairgun profile.
 */
export const CHAIRGUN_SOUND_MS = 340.3;

/**
 * Linear interpolation of Cd from the ChairGun subsonic table.
 *
 * Behaviour at boundaries:
 *   - Mach ≤ 0   → table[0].cd (0.2629)
 *   - Mach ≥ 1.0 → table[last].cd (0.3500) — no extrapolation
 *   - Between two points → standard linear lerp
 *
 * Identical to ChairGun's `getCD()` function (chairgun_engine.js:22-32).
 */
export function cdFromChairgun(mach: number): number {
  const table = CHAIRGUN_DRAG_TABLE;
  if (mach <= 0) return table[0][1];

  for (let i = 0; i < table.length - 1; i++) {
    const [m0, c0] = table[i];
    const [m1, c1] = table[i + 1];
    if (mach >= m0 && mach <= m1) {
      const span = m1 - m0;
      if (span <= 0) return c0;
      const t = (mach - m0) / span;
      return c0 + t * (c1 - c0);
    }
  }

  return table[table.length - 1][1];
}

/**
 * ChairGun-style retardation (deceleration along velocity vector).
 *
 * Formula: `(Cd / BC) × v`
 *
 * This is fundamentally different from the legacy/mero formula which is
 * `(Cd × atmoFactor × v² × DRAG_K) / BC`. ChairGun does NOT use an
 * atmosphere correction factor on the drag, and does NOT use DRAG_K.
 *
 * The atmospheric factor is irrelevant here because ChairGun's drag model
 * already bakes in the "average" air density via the Cd table values and
 * the BC value. The user's BC in ChairGun is effectively a "real-world"
 * BC that already accounts for the operating environment.
 */
export function chairgunRetardation(velocity: number, bc: number): number {
  const mach = velocity / CHAIRGUN_SOUND_MS;
  const cd = cdFromChairgun(mach);
  return (cd / bc) * velocity;
}
