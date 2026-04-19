/**
 * Tranche F.2 — Schémas d'import Zod (Projectile / Optic / Reticle).
 *
 * Frontière de validation stricte AVANT la pipeline d'import. Aucun write
 * storage ici, aucune dépendance UI. Les schémas sont volontairement :
 *
 *   - **fermés** : `.strict()` partout — un champ inconnu fait échouer la
 *     validation. La pipeline pourra ré-essayer en mode "strip" si besoin
 *     produit, mais le défaut sécurité est de rejeter.
 *   - **bornés** : longueurs de chaînes, nombres finis, plages métier
 *     plausibles (mach ∈ [0, 5], cd ∈ [0, 2], 200 points max pour les
 *     tables Cd).
 *   - **sans `id`** : les `id` entrants sont volontairement non décrits
 *     pour qu'une éventuelle clé `id` dans la source remonte un échec
 *     ".strict()". L'identité finale sera générée par le store au write.
 *   - **agnostiques de la sanitisation drag-law** : on accepte ici toute
 *     valeur `DragModel` (ou string courte) pour pouvoir distinguer plus
 *     tard "loi interne MERO importée" (sanitized → G1) de "complete
 *     garbage" (rejected). La sanitisation Tranche D est appliquée par la
 *     pipeline, pas par le schéma.
 *
 * Limites globales appliquées par la pipeline :
 *   - taille de payload max : 1 MB (1_000_000 octets de JSON brut)
 *   - nombre max d'items : 1000
 *
 * Ces limites ne sont PAS dans Zod (Zod ne voit jamais le payload brut)
 * — voir `import-pipeline.ts` (`MAX_PAYLOAD_BYTES`, `MAX_ITEMS`).
 */

import { z } from 'zod';

const SHORT = 200;

const shortString = z
  .string()
  .trim()
  .min(1)
  .max(SHORT);

const optionalShortString = z
  .string()
  .trim()
  .max(SHORT)
  .optional();

const finiteNumber = z.number().finite();

/**
 * Drag law importée — acceptée sous forme de chaîne courte plausible. La
 * sanitisation publique (Tranche D) est faite par la pipeline, pas ici.
 */
const importedDragModel = z.string().trim().min(1).max(8);

/** Type projectile importé — taxonomie ouverte côté schéma, fermée côté pipeline. */
const importedProjectileType = z.enum(['pellet', 'slug', 'other']);

/**
 * Point Cd vs Mach. Bornes métier strictes :
 *   - mach ∈ [0, 5]   (couvre tout l'aéroballistique airgun + powder)
 *   - cd   ∈ [0, 2]   (au-delà = fit corrompu)
 */
const dragTablePointSchema = z
  .object({
    mach: z.number().finite().min(0).max(5),
    cd: z.number().finite().min(0).max(2),
  })
  .strict();

/** Table Cd custom — 200 points max (sécurité mémoire + UX preview). */
const dragTableSchema = z.array(dragTablePointSchema).min(2).max(200);

// ---------------------------------------------------------------------------
// Projectile
// ---------------------------------------------------------------------------

/**
 * Schéma d'import d'un projectile. Refuse les champs inconnus, refuse `id`,
 * refuse les valeurs hors-bornes. La sanitisation drag-law (Tranche D) est
 * faite APRÈS validation par la pipeline.
 */
export const projectileImportSchema = z
  .object({
    brand: shortString,
    model: shortString,
    weight: finiteNumber.positive().max(1000), // grains, garde-fou
    bc: finiteNumber.positive().max(2),
    bcModel: importedDragModel.optional(),
    projectileType: importedProjectileType.optional(),
    shape: optionalShortString,
    caliber: shortString,
    length: finiteNumber.positive().max(200).optional(),
    diameter: finiteNumber.positive().max(50).optional(),
    material: optionalShortString,
    notes: optionalShortString,
    dataSource: optionalShortString,
    customDragTable: dragTableSchema.optional(),
  })
  .strict();

export type ProjectileImport = z.infer<typeof projectileImportSchema>;

// ---------------------------------------------------------------------------
// Optic
// ---------------------------------------------------------------------------

/**
 * `clickUnit` accepte historiquement `'mil'` côté domaine Optic (cf.
 * `types.ts`). On le préserve ici pour ne pas casser la rétrocompat — la
 * canonicalisation `mil → MRAD` ne s'applique qu'au Reticle (F.1).
 */
const opticClickUnit = z.enum(['MOA', 'MRAD', 'mil']);

const opticTubeDiameter = z.union([z.literal(25.4), z.literal(30), z.literal(34)]);

export const opticImportSchema = z
  .object({
    name: shortString,
    type: optionalShortString,
    focalPlane: z.enum(['FFP', 'SFP']).optional(),
    clickUnit: opticClickUnit,
    clickValue: finiteNumber.positive().max(10),
    mountHeight: finiteNumber.positive().max(500).optional(),
    tubeDiameter: opticTubeDiameter.optional(),
    magCalibration: finiteNumber.positive().max(100).optional(),
    notes: optionalShortString,
  })
  .strict();

export type OpticImport = z.infer<typeof opticImportSchema>;

// ---------------------------------------------------------------------------
// Reticle
// ---------------------------------------------------------------------------

const reticleType = z.enum([
  'mil-dot',
  'moa-grid',
  'mrad-grid',
  'duplex',
  'bdc',
  'other',
]);

/**
 * Côté schéma d'import, on tolère `'mil'` en plus de `'MOA' | 'MRAD'` pour
 * accepter les exports tiers (Strelok). La canonicalisation `mil → MRAD`
 * est faite par la pipeline et marquée `sanitized`. La persistance interne
 * reste strictement `MOA | MRAD` (cf. F.1).
 */
const reticleImportUnit = z.enum(['MOA', 'MRAD', 'mil']);

export const reticleImportSchema = z
  .object({
    brand: shortString,
    model: shortString,
    type: reticleType,
    unit: reticleImportUnit,
    subtension: finiteNumber.positive().max(100),
    focalPlane: z.enum(['FFP', 'SFP']).optional(),
    marks: z.array(finiteNumber.min(-200).max(200)).max(200).optional(),
    notes: optionalShortString,
  })
  .strict();

export type ReticleImport = z.infer<typeof reticleImportSchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export const ENTITY_SCHEMAS = {
  projectile: projectileImportSchema,
  optic: opticImportSchema,
  reticle: reticleImportSchema,
} as const;

export type ImportEntityType = keyof typeof ENTITY_SCHEMAS;
