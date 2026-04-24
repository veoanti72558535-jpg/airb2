/**
 * G1 drag table — 79 points (Mach → Cd) issus de ChairGun Elite.
 *
 * Cette table remplace, pour les profils opt-in, l'approximation
 * piecewise historique (`cdG1` dans `standard-models.ts`) par les
 * valeurs officielles ChairGun. Couvre Mach 0..5 avec une densité
 * élevée dans la zone PCP (Mach 0.5–0.85).
 *
 * IMPORTANT — DRAG_K et la formule LOS restent intouchés. Cette table
 * n'est branchée par le moteur que via le `cdResolver` optionnel ; les
 * profils existants (legacy) continuent d'utiliser `cdG1` pour
 * préserver bit-for-bit les sessions et tests de référence.
 */

/** Couples [Mach, Cd] triés par Mach croissant. */
export const G1_DRAG_TABLE: ReadonlyArray<readonly [number, number]> = [
  [0.0, 0.2629],
  [0.05, 0.2558],
  [0.1, 0.2487],
  [0.15, 0.2413],
  [0.2, 0.2344],
  [0.25, 0.2278],
  [0.3, 0.2214],
  [0.35, 0.2155],
  [0.4, 0.2104],
  [0.45, 0.2061],
  [0.5, 0.2032],
  [0.55, 0.2020],
  [0.6, 0.2034],
  [0.7, 0.2165],
  [0.725, 0.2230],
  [0.75, 0.2313],
  [0.775, 0.2417],
  [0.8, 0.2546],
  [0.825, 0.2706],
  [0.85, 0.2901],
  [0.875, 0.3136],
  [0.9, 0.3415],
  [0.925, 0.3734],
  [0.95, 0.4084],
  [0.975, 0.4448],
  [1.0, 0.4805],
  [1.025, 0.5136],
  [1.05, 0.5427],
  [1.075, 0.5677],
  [1.1, 0.5883],
  [1.125, 0.6053],
  [1.15, 0.6191],
  [1.2, 0.6393],
  [1.25, 0.6518],
  [1.3, 0.6589],
  [1.35, 0.6621],
  [1.4, 0.6625],
  [1.45, 0.6607],
  [1.5, 0.6573],
  [1.55, 0.6528],
  [1.6, 0.6474],
  [1.65, 0.6413],
  [1.7, 0.6347],
  [1.75, 0.6280],
  [1.8, 0.6210],
  [1.85, 0.6141],
  [1.9, 0.6072],
  [1.95, 0.6003],
  [2.0, 0.5934],
  [2.05, 0.5867],
  [2.1, 0.5804],
  [2.15, 0.5743],
  [2.2, 0.5685],
  [2.25, 0.5630],
  [2.3, 0.5577],
  [2.35, 0.5527],
  [2.4, 0.5481],
  [2.45, 0.5438],
  [2.5, 0.5397],
  [2.6, 0.5325],
  [2.7, 0.5264],
  [2.8, 0.5211],
  [2.9, 0.5168],
  [3.0, 0.5133],
  [3.1, 0.5105],
  [3.2, 0.5084],
  [3.3, 0.5067],
  [3.4, 0.5054],
  [3.5, 0.5040],
  [3.6, 0.5030],
  [3.7, 0.5022],
  [3.8, 0.5016],
  [3.9, 0.5010],
  [4.0, 0.5006],
  [4.2, 0.4998],
  [4.4, 0.4995],
  [4.6, 0.4992],
  [4.8, 0.4990],
  [5.0, 0.4988],
];

/**
 * Interpolation linéaire dans `G1_DRAG_TABLE`. Hors plage : valeur du
 * point extrême le plus proche (pas d'extrapolation).
 */
export function cdFromG1Table(mach: number): number {
  const t = G1_DRAG_TABLE;
  if (mach <= t[0][0]) return t[0][1];
  const last = t[t.length - 1];
  if (mach >= last[0]) return last[1];
  // Recherche linéaire — la table est petite (≤79 points), bench OK.
  for (let i = 0; i < t.length - 1; i++) {
    const a = t[i];
    const b = t[i + 1];
    if (mach >= a[0] && mach <= b[0]) {
      const span = b[0] - a[0];
      if (span <= 0) return a[1];
      const k = (mach - a[0]) / span;
      return a[1] + k * (b[1] - a[1]);
    }
  }
  return last[1];
}