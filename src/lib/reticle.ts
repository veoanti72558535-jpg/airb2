/**
 * Tranche F.1 — Helpers minimaux autour de l'entité `Reticle`.
 *
 * Volontairement frugal : pas de Zod (réservé à la pipeline d'import F.2),
 * pas de calcul de holdover, pas d'interaction avec les optiques. Ce
 * module fournit uniquement :
 *   - le canon des unités de réticule (`RETICLE_UNITS`)
 *   - le canon des types (`RETICLE_TYPES`)
 *   - une garde de type runtime `isReticleUnit` pour rejeter `'mil'` et
 *     toute chaîne hors-canon avant un éventuel write.
 *
 * NB : `'mil'` est un alias possible côté import (Strelok exporte parfois
 * `mil`), mais il NE doit JAMAIS être persisté tel quel dans le modèle
 * interne — la normalisation `mil → MRAD` se fera dans la pipeline
 * d'import F.2, pas ici.
 */

import type { Reticle, ReticleType, ReticleUnit } from './types';

export const RETICLE_UNITS = ['MOA', 'MRAD'] as const satisfies readonly ReticleUnit[];

export const RETICLE_TYPES = [
  'mil-dot',
  'moa-grid',
  'mrad-grid',
  'duplex',
  'bdc',
  'other',
] as const satisfies readonly ReticleType[];

/** Garde de type runtime — rejette `'mil'` et toute valeur hors-canon. */
export function isReticleUnit(value: unknown): value is ReticleUnit {
  return value === 'MOA' || value === 'MRAD';
}

/** Garde de type runtime sur la taxonomie fermée des types de réticule. */
export function isReticleType(value: unknown): value is ReticleType {
  return (RETICLE_TYPES as readonly string[]).includes(value as string);
}

/**
 * Validation légère "structurelle" — sans Zod — utilisée pour les tests
 * de F.1. La validation stricte d'import (champs requis, longueurs,
 * dédup) sera factorisée en F.2 dans `import-schemas.ts`.
 */
export function isPlausibleReticleShape(
  candidate: unknown,
): candidate is Pick<Reticle, 'brand' | 'model' | 'type' | 'unit' | 'subtension'> {
  if (!candidate || typeof candidate !== 'object') return false;
  const c = candidate as Record<string, unknown>;
  return (
    typeof c.brand === 'string' &&
    typeof c.model === 'string' &&
    isReticleType(c.type) &&
    isReticleUnit(c.unit) &&
    typeof c.subtension === 'number' &&
    Number.isFinite(c.subtension) &&
    c.subtension > 0
  );
}
