/**
 * Dérivation du caliber canonique à partir d'un diamètre nominal en pouces.
 *
 * Utilisé par la pipeline d'import projectile (extension bullets4) quand la
 * source ne fournit pas de `caliber` lisible mais expose `diameterIn`. La
 * sortie est un token court de la forme `.NNN` (ex: ".22", ".224", ".30")
 * compatible avec `caliber` côté `Projectile` et avec le helper
 * `calToken()` existant (cf. `caliber.ts`).
 *
 * Politique :
 *   - table fermée des calibres standards air/powder (.17, .20, .204, .22,
 *     .224, .25, .25-cal, .30, .308, .357, .45) ;
 *   - tolérance `±0.003"` autour de chaque valeur nominale (couvre les
 *     écarts catalogue Crosman/H&N/JSB sans confondre .22 et .224) ;
 *   - en cas d'ambigüité on retient le candidat le plus proche ;
 *   - retourne `null` quand aucun candidat n'est dans la tolérance — la
 *     pipeline laissera alors `caliber` vide plutôt que d'inventer.
 *
 * Aucune dépendance UI, aucune dépendance moteur — testable en isolation.
 */

interface CaliberCandidate {
  /** Token canonique stocké tel quel dans `Projectile.caliber`. */
  token: string;
  /** Diamètre nominal en pouces. */
  inches: number;
}

/**
 * Catalogue ordonné des calibres standards. Ordre préservé pour le tri
 * stable secondaire (token le plus court d'abord en cas d'égalité parfaite).
 */
const CALIBER_TABLE: ReadonlyArray<CaliberCandidate> = [
  { token: '.17', inches: 0.177 },
  { token: '.20', inches: 0.20 },
  { token: '.204', inches: 0.204 },
  { token: '.22', inches: 0.22 },
  { token: '.224', inches: 0.224 },
  { token: '.25', inches: 0.25 },
  { token: '.30', inches: 0.30 },
  { token: '.308', inches: 0.308 },
  { token: '.357', inches: 0.357 },
  { token: '.45', inches: 0.45 },
];

/**
 * Tolérance par défaut en pouces (≈ 0.127 mm). Couvre l'écart 5.5 mm
 * (0.2165") ↔ .22 (0.220") qui apparaît dans les exports bullets4 où le
 * diamètre est exprimé en mm puis converti.
 */
const DEFAULT_TOLERANCE_IN = 0.005;

/**
 * Retourne le token caliber canonique le plus proche de `diameterIn`, ou
 * `null` si aucun candidat n'entre dans la tolérance.
 */
export function deriveCaliberFromDiameterIn(
  diameterIn: number | undefined | null,
  tolerance: number = DEFAULT_TOLERANCE_IN,
): string | null {
  if (diameterIn === undefined || diameterIn === null) return null;
  if (!Number.isFinite(diameterIn) || diameterIn <= 0) return null;

  let best: { token: string; delta: number } | null = null;
  for (const c of CALIBER_TABLE) {
    const delta = Math.abs(c.inches - diameterIn);
    if (delta > tolerance) continue;
    if (best === null || delta < best.delta) {
      best = { token: c.token, delta };
    }
  }
  return best?.token ?? null;
}

/**
 * Variante "diamètre en mm" — convertit puis délègue. Pratique quand la
 * source bullets4 expose `diameterMm` mais pas `diameterIn`.
 */
export function deriveCaliberFromDiameterMm(
  diameterMm: number | undefined | null,
  tolerance: number = DEFAULT_TOLERANCE_IN,
): string | null {
  if (diameterMm === undefined || diameterMm === null) return null;
  if (!Number.isFinite(diameterMm) || diameterMm <= 0) return null;
  return deriveCaliberFromDiameterIn(diameterMm / 25.4, tolerance);
}

/**
 * Helper unifié : essaie d'abord `diameterIn`, retombe sur `diameterMm`.
 */
export function deriveCaliber(args: {
  diameterIn?: number | null;
  diameterMm?: number | null;
}): string | null {
  return (
    deriveCaliberFromDiameterIn(args.diameterIn ?? undefined) ??
    deriveCaliberFromDiameterMm(args.diameterMm ?? undefined)
  );
}

/** Exposé pour les tests / docs. */
export const CALIBER_DERIVE_TABLE = CALIBER_TABLE;
export const CALIBER_DERIVE_DEFAULT_TOLERANCE_IN = DEFAULT_TOLERANCE_IN;
