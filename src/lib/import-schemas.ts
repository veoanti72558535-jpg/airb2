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

/**
 * Type projectile importé. Étendu (extension bullets4) pour accepter `bb`
 * et `dart` en plus de `pellet`/`slug`/`other`. La taxonomie côté domaine
 * reste fermée mais alignée sur `ProjectileType`.
 */
const importedProjectileType = z.enum(['pellet', 'slug', 'bb', 'dart', 'other']);

/** Forme normalisée bullets4 — taxonomie ouverte (string libre toléré côté schema via `shape: shortString`). */
const importedProjectileShape = z.enum([
  'domed',
  'pointed',
  'hollow-point',
  'wadcutter',
  'round-nose',
  'semi-wadcutter',
  'flat-nose',
  'hybrid',
  'other',
]);

/** Unité de poids importée. */
const importedWeightUnit = z.enum(['gr', 'g']);

/** Zone BC (Litz / bullets4) — bornes prudentes. */
const bcZoneSchema = z
  .object({
    bc: z.number().finite().positive().max(2),
    minVelocity: z.number().finite().min(0).max(2000),
  })
  .strict();

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
    /**
     * `weight` (grains) historiquement obligatoire. Rendu optionnel pour
     * accepter les sources bullets4 qui n'exposent que `weightGrains` /
     * `weightGrams`. La pipeline dérive `weight` depuis ces variantes et
     * marque l'item `sanitized`. Si aucune des trois variantes n'est
     * fournie, la pipeline rejette l'item avec un message explicite.
     */
    weight: finiteNumber.positive().max(1000).optional(),
    /**
     * `bc` historiquement obligatoire. Rendu optionnel pour accepter les
     * sources bullets4 qui n'exposent que `bcG1` / `bcG7`. La pipeline
     * dérive `bc` depuis `bcG1` (ou `bcG7` à défaut) et marque l'item
     * `sanitized`. Si aucune variante n'est fournie, la pipeline rejette.
     */
    bc: finiteNumber.positive().max(2).optional(),
    bcModel: importedDragModel.optional(),
    projectileType: importedProjectileType.optional(),
    shape: optionalShortString,
    /**
     * Caliber : libellé canonique court (ex: ".22", ".22 (5.5mm)"). Rendu
     * optionnel pour accepter les sources bullets4 qui n'exposent que
     * `diameterIn`/`diameterMm` — la pipeline dérivera alors le token
     * canonique via `deriveCaliber()` et marquera l'item `sanitized`.
     */
    caliber: shortString.optional(),
    length: finiteNumber.positive().max(200).optional(),
    diameter: finiteNumber.positive().max(50).optional(),
    material: optionalShortString,
    notes: optionalShortString,
    dataSource: optionalShortString,
    customDragTable: dragTableSchema.optional(),
    // ----- Extension bullets4 (tous optionnels, additifs) -------------------
    caliberLabel: optionalShortString,
    diameterMm: finiteNumber.positive().max(50).optional(),
    diameterIn: finiteNumber.positive().max(2).optional(),
    weightUnit: importedWeightUnit.optional(),
    weightGrains: finiteNumber.positive().max(1000).optional(),
    weightGrams: finiteNumber.positive().max(100).optional(),
    bcG1: finiteNumber.positive().max(2).optional(),
    bcG7: finiteNumber.positive().max(2).optional(),
    /** `null` autorisé : on préserve la distinction "absent" / "vide". */
    bcZones: z.array(bcZoneSchema).max(20).nullable().optional(),
    lengthMm: finiteNumber.positive().max(200).nullable().optional(),
    lengthIn: finiteNumber.positive().max(10).nullable().optional(),
    sourceDbId: optionalShortString,
    sourceTable: optionalShortString,
    /**
     * `importedFrom` peut être présent dans la source (ex: bullets4 export
     * pré-tagué `"bullets4-db"`). La pipeline dispose alors d'une info
     * fiable pour remapper la provenance avant write.
     */
    importedFrom: z
      .enum(['json-user', 'preset-internal', 'strelok', 'chairgun', 'airballistik', 'bullets4-db'])
      .optional(),
    /** Forme normalisée bullets4 — accepté en plus de `shape` libre. */
    shapeNormalised: importedProjectileShape.optional(),
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
