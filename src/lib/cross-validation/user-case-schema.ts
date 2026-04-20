/**
 * BUILD-C bis — Schéma JSON utilisateur pour la validation comparative.
 *
 * Ce module définit le contrat JSON canonique que l'utilisateur (ou plus
 * tard une build IA "screenshots → JSON") utilisera pour décrire un cas
 * de validation comparative externe (ChairGun Elite / Strelok Pro / MERO).
 *
 * Pourquoi un schéma utilisateur distinct de `CrossValidationCase` ?
 *  - `CrossValidationCase.inputs` est un `BallisticInput` complet, qui
 *    embarque déjà la résolution moteur (engineConfig, customDragTable…).
 *    Pour un cas saisi à la main, on veut un format plat, lisible, qui
 *    documente les intentions de l'utilisateur (caliber, weightGrains,
 *    bcModel, vent, etc.) sans s'engager sur des détails moteur.
 *  - À la sérialisation, on convertit `UserCrossValidationCase` →
 *    `CrossValidationCase` via `mapUserCaseToCrossValidationCase()`.
 *
 * Règles d'or (cf. doc protocolaire) :
 *  - aucune valeur n'est inventée à la lecture ;
 *  - les champs absents restent absents (jamais "0" par défaut sur du
 *    physique) ;
 *  - les sources externes sont fermées (typage strict) pour éviter les
 *    fautes de frappe silencieuses ;
 *  - chaque référence porte sa propre confiance + méthode d'extraction.
 *
 * Le schéma Zod est la SOURCE DE VÉRITÉ : les types TypeScript sont
 * inférés depuis lui (`z.infer`), pas l'inverse. Cela garantit qu'un
 * payload accepté par `validate()` est aussi exploitable par TypeScript.
 */

import { z } from 'zod';
import type { BallisticInput, WeatherSnapshot } from '@/lib/types';
import type {
  CrossValidationCase,
  CrossValidationConfidence,
  CrossValidationExtractionMethod,
  CrossValidationSource,
  ExternalReference,
  ExternalReferenceRow,
  ReferenceMeta,
} from './types';

// -----------------------------------------------------------------------------
// Énumérations partagées avec `cross-validation/types.ts`.
// On RE-DÉCLARE ici en Zod pour avoir validation runtime + type inference,
// mais on les contraint à matcher exactement les types existants via
// `satisfies` sur l'usage (cf. tests).
// -----------------------------------------------------------------------------

const SOURCE_VALUES = [
  'chairgun',
  'chairgun-elite',
  'strelok',
  'strelok-pro',
  'mero',
  'auxiliary',
] as const satisfies ReadonlyArray<CrossValidationSource>;

const CONFIDENCE_VALUES = ['A', 'B', 'C'] as const satisfies ReadonlyArray<CrossValidationConfidence>;

const EXTRACTION_VALUES = [
  'export-csv',
  'export-json',
  'screenshot-retyped',
  'manual-entry',
  'published-table',
] as const satisfies ReadonlyArray<CrossValidationExtractionMethod>;

const DRAG_MODEL_VALUES = ['G1', 'G7', 'GA', 'GS', 'RA4', 'GA2', 'SLG0', 'SLG1'] as const;

const PROJECTILE_TYPE_VALUES = ['pellet', 'slug', 'bb', 'dart', 'other'] as const;

/**
 * Schéma d'une ligne de résultat externe. Toutes les métriques sauf
 * `range` sont optionnelles : une référence honnête peut n'exposer que
 * `drop` et `velocity`.
 *
 * Unités canoniques (mêmes que le moteur AirBallistik) :
 *  - range, drop, windDrift : mètres / millimètres / millimètres
 *  - velocity : m/s
 *  - tof : secondes
 *  - energy : joules
 */
export const referenceRowSchema = z
  .object({
    range: z.number().finite().nonnegative({
      message: 'range must be ≥ 0 (meters)',
    }),
    drop: z.number().finite().optional(),
    velocity: z.number().finite().nonnegative().optional(),
    tof: z.number().finite().nonnegative().optional(),
    windDrift: z.number().finite().optional(),
    energy: z.number().finite().nonnegative().optional(),
    note: z.string().trim().max(500).optional(),
  })
  .strict();

export const referenceMetaSchema = z
  .object({
    source: z.enum(SOURCE_VALUES),
    version: z.string().trim().min(1).max(120),
    confidence: z.enum(CONFIDENCE_VALUES),
    extractionMethod: z.enum(EXTRACTION_VALUES),
    extractedAt: z
      .string()
      .trim()
      .min(1)
      .max(40)
      .refine((s) => !Number.isNaN(Date.parse(s)), {
        message: 'extractedAt must be a parseable ISO date string',
      }),
    operator: z.string().trim().max(80).optional(),
    sourceUri: z.string().trim().max(500).optional(),
    assumptions: z.array(z.string().trim().max(300)).max(20).optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .strict();

export const userReferenceSchema = z
  .object({
    meta: referenceMetaSchema,
    rows: z
      .array(referenceRowSchema)
      .min(1, { message: 'reference must have at least one row' })
      .max(500, { message: 'reference rows capped at 500 (BUILD-C bis)' }),
  })
  .strict();

/**
 * Inputs normalisés du cas. Format plat, lisible, indépendant du moteur.
 * Les unités attendues sont documentées sur chaque champ.
 *
 * RÈGLE : les champs OBLIGATOIRES sont strictement minimaux. Tout ce qui
 * n'est pas indispensable à reproduire un cas reste optionnel. Si une
 * source externe ne documente pas une valeur, on n'invente pas.
 */
export const userInputsSchema = z
  .object({
    // --- Identification projectile ---
    projectileName: z.string().trim().min(1).max(120),
    projectileType: z.enum(PROJECTILE_TYPE_VALUES).optional(),
    caliber: z.string().trim().min(1).max(40),
    diameterMm: z.number().finite().positive().max(50).optional(),
    weightGrains: z.number().finite().positive().max(2000),
    bc: z.number().finite().positive().max(2),
    bcModel: z.enum(DRAG_MODEL_VALUES).optional(),

    // --- Vitesse + lunette ---
    muzzleVelocity: z.number().finite().positive().max(2000), // m/s
    sightHeight: z.number().finite().nonnegative().max(500), // mm
    zeroDistance: z.number().finite().positive().max(2000), // m

    // --- Atmosphère ---
    temperatureC: z.number().finite().min(-60).max(70).optional(),
    pressureHpaAbsolute: z.number().finite().positive().max(1300).optional(),
    humidityPercent: z.number().finite().min(0).max(100).optional(),
    altitudeM: z.number().finite().min(-500).max(9000).optional(),

    // --- Vent ---
    windSpeed: z.number().finite().nonnegative().max(50).optional(), // m/s
    windDirection: z.number().finite().min(0).max(360).optional(), // degrés
    /**
     * Convention vent documentaire (ex: "0=face / 90=droite",
     * "clock-position 3"). Aucune sémantique moteur — informatif.
     */
    windConvention: z.string().trim().max(80).optional(),

    // --- Plage de distances ---
    rangeStart: z.number().finite().nonnegative().max(2000).optional(),
    rangeMax: z.number().finite().positive().max(2000),
    rangeStep: z.number().finite().positive().max(500),

    // --- Optionnels documentaires ---
    twistRate: z.number().finite().positive().max(60).optional(),
    sourceUnitsNote: z.string().trim().max(300).optional(),
    comment: z.string().trim().max(1000).optional(),
  })
  .strict();

/**
 * Cas complet de validation comparative externe au format utilisateur.
 * C'est CE format qui est :
 *  - persisté en localStorage,
 *  - exporté/importé en JSON,
 *  - cible de la future build IA screenshots → JSON.
 */
export const userCrossValidationCaseSchema = z
  .object({
    /** Slug stable, recommandé `kebab-case` (ex: `22-jsb-18gr-280-zero30`). */
    caseId: z
      .string()
      .trim()
      .min(2)
      .max(80)
      .regex(/^[a-z0-9][a-z0-9._-]*$/i, {
        message: 'caseId must be alphanumeric with `.`, `_` or `-` only',
      }),
    title: z.string().trim().min(1).max(160),
    description: z.string().trim().max(2000).optional(),
    tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
    inputs: userInputsSchema,
    references: z
      .array(userReferenceSchema)
      .min(1, { message: 'at least one external reference is required' })
      .max(8, { message: 'references capped at 8 per case (BUILD-C bis)' }),
    notes: z.string().trim().max(4000).optional(),
    /**
     * Schéma versionné — incrémenté si le format change de manière non
     * rétrocompatible. Aujourd'hui = 1.
     */
    schemaVersion: z.literal(1).optional().default(1),
  })
  .strict();

export type UserReferenceRow = z.infer<typeof referenceRowSchema>;
export type UserReferenceMeta = z.infer<typeof referenceMetaSchema>;
export type UserReference = z.infer<typeof userReferenceSchema>;
export type UserInputs = z.infer<typeof userInputsSchema>;
export type UserCrossValidationCase = z.infer<typeof userCrossValidationCaseSchema>;

// -----------------------------------------------------------------------------
// Validation publique
// -----------------------------------------------------------------------------

export interface ValidationIssue {
  /** Chemin pointé sur le payload (ex: `references.0.rows.3.drop`). */
  path: string;
  message: string;
}

export type ValidationResult =
  | { ok: true; case: UserCrossValidationCase }
  | { ok: false; issues: ValidationIssue[] };

/**
 * Valide un payload arbitraire (typiquement un parse JSON). Renvoie un
 * résultat structuré — JAMAIS de throw — pour que l'UI puisse afficher
 * les erreurs proprement.
 */
export function validateUserCase(payload: unknown): ValidationResult {
  const parsed = userCrossValidationCaseSchema.safeParse(payload);
  if (parsed.success) return { ok: true, case: parsed.data };
  const issues: ValidationIssue[] = parsed.error.issues.map((iss) => ({
    path: iss.path.length === 0 ? '<root>' : iss.path.join('.'),
    message: iss.message,
  }));
  return { ok: false, issues };
}

/**
 * Parse un blob JSON brut (string) → ValidationResult. Si le JSON est
 * lui-même invalide, l'erreur de syntaxe est remontée comme une issue
 * unique pointant la racine.
 */
export function parseUserCaseJson(raw: string): ValidationResult {
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch (e) {
    return {
      ok: false,
      issues: [
        {
          path: '<root>',
          message:
            e instanceof Error ? `Invalid JSON: ${e.message}` : 'Invalid JSON',
        },
      ],
    };
  }
  return validateUserCase(payload);
}

// -----------------------------------------------------------------------------
// Mapping vers le socle BUILD-A (`CrossValidationCase`)
// -----------------------------------------------------------------------------

/**
 * Construit un `WeatherSnapshot` à partir des champs utilisateur.
 * Les valeurs absentes sont remplies par des défauts NEUTRES connus du
 * moteur (atmosphère ICAO standard) — c'est la même convention que celle
 * utilisée par les fixtures du `truth-set`. On ne les présente JAMAIS comme
 * "mesurées" : on les expose au moteur pour qu'il puisse calculer.
 */
function buildWeatherSnapshot(inputs: UserInputs): WeatherSnapshot {
  return {
    temperature: inputs.temperatureC ?? 15,
    humidity: inputs.humidityPercent ?? 50,
    pressure: inputs.pressureHpaAbsolute ?? 1013.25,
    altitude: inputs.altitudeM ?? 0,
    windSpeed: inputs.windSpeed ?? 0,
    windAngle: inputs.windDirection ?? 0,
    source: 'manual',
    timestamp: new Date(0).toISOString(),
  };
}

function mapUserReference(ref: UserReference): ExternalReference {
  const meta: ReferenceMeta = {
    source: ref.meta.source,
    version: ref.meta.version,
    confidence: ref.meta.confidence,
    extractionMethod: ref.meta.extractionMethod,
    extractedAt: ref.meta.extractedAt,
    operator: ref.meta.operator,
    sourceUri: ref.meta.sourceUri,
    assumptions: ref.meta.assumptions,
    notes: ref.meta.notes,
  };
  const rows: ExternalReferenceRow[] = ref.rows.map((r) => ({
    range: r.range,
    drop: r.drop,
    velocity: r.velocity,
    tof: r.tof,
    windDrift: r.windDrift,
    energy: r.energy,
  }));
  return { meta, rows };
}

/**
 * Convertit un cas utilisateur validé en `CrossValidationCase` exploitable
 * par le harness BUILD-B (`runCaseComparison`).
 *
 * IMPORTANT : aucune valeur n'est INVENTÉE côté moteur. Les champs
 * atmosphère absents reçoivent les défauts ICAO documentés ci-dessus —
 * c'est la même convention que pour les fixtures CSV historiques.
 */
export function mapUserCaseToCrossValidationCase(
  userCase: UserCrossValidationCase,
): CrossValidationCase {
  const ballisticInput: BallisticInput = {
    muzzleVelocity: userCase.inputs.muzzleVelocity,
    bc: userCase.inputs.bc,
    projectileWeight: userCase.inputs.weightGrains,
    sightHeight: userCase.inputs.sightHeight,
    zeroRange: userCase.inputs.zeroDistance,
    maxRange: userCase.inputs.rangeMax,
    rangeStep: userCase.inputs.rangeStep,
    weather: buildWeatherSnapshot(userCase.inputs),
    dragModel: userCase.inputs.bcModel,
    twistRate: userCase.inputs.twistRate,
    projectileDiameter: userCase.inputs.diameterMm,
  };

  return {
    id: userCase.caseId,
    description: userCase.description ?? userCase.title,
    tags: userCase.tags,
    inputs: ballisticInput,
    references: userCase.references.map(mapUserReference),
    notes: userCase.notes,
  };
}

// -----------------------------------------------------------------------------
// Factories utilitaires (UI)
// -----------------------------------------------------------------------------

/**
 * Construit un cas vierge prêt pour l'éditeur. Toutes les valeurs
 * physiques sont des placeholders explicitement éditables — ce n'est PAS
 * une donnée réelle. L'opérateur DOIT compléter avant d'attacher au
 * harness.
 */
export function makeEmptyUserCase(): UserCrossValidationCase {
  return {
    caseId: 'new-case',
    title: 'Untitled case',
    description: '',
    tags: [],
    inputs: {
      projectileName: '',
      caliber: '',
      weightGrains: 0,
      bc: 0,
      muzzleVelocity: 0,
      sightHeight: 0,
      zeroDistance: 0,
      rangeMax: 100,
      rangeStep: 10,
    },
    references: [makeEmptyUserReference()],
    notes: '',
    schemaVersion: 1,
  };
}

export function makeEmptyUserReference(): UserReference {
  return {
    meta: {
      source: 'chairgun-elite',
      version: '',
      confidence: 'B',
      extractionMethod: 'manual-entry',
      extractedAt: new Date().toISOString(),
    },
    rows: [{ range: 0 }],
  };
}

export function makeEmptyReferenceRow(range = 0): UserReferenceRow {
  return { range };
}