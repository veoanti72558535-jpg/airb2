/**
 * Tranche F.2 — Pipeline d'import JSON pure (Projectile / Optic / Reticle).
 *
 * Caractéristiques :
 *   - **pure**   : aucun accès `localStorage`, aucun side-effect, aucune
 *     dépendance UI. Sortie sérialisable.
 *   - **dry-run** : par construction. Cette pipeline ne produit qu'une
 *     `ImportPreview`. Le write réel (write-store) est reporté à F.3+ et
 *     consommera ce résultat.
 *   - **réutilise Tranche D** : la sanitisation drag-law passe par
 *     `sanitizePublicDragLaw` (source unique de vérité publique).
 *   - **canonicalise les unités de réticule** : `mil → MRAD`. La sortie
 *     normalisée n'émet JAMAIS `unit: 'mil'`.
 *   - **sécurité** : limites de taille (1 MB), de cardinalité (1000 items)
 *     et de longueur de chaîne (via les schémas Zod).
 *   - **dédup** : intra-lot ET vs un set d'existants passé explicitement.
 *
 * Aucun `id` entrant n'est ré-émis. Aucun champ inconnu non plus
 * (`.strict()` côté Zod).
 */

import { z } from 'zod';
import {
  ENTITY_SCHEMAS,
  type ImportEntityType,
  type OpticImport,
  type ProjectileImport,
  type ReticleImport,
} from './import-schemas';
import {
  isPublicDragLaw,
  sanitizePublicDragLaw,
} from './drag-law-policy';
import { deriveCaliber } from './caliber-derive';
import type {
  DragModel,
  ImportSource,
  Optic,
  Projectile,
  Reticle,
  ReticleUnit,
} from './types';

export const MAX_PAYLOAD_BYTES = 1_000_000; // 1 MB
export const MAX_ITEMS = 1000;

export type ImportItemStatus = 'ok' | 'sanitized' | 'duplicate' | 'rejected';

export interface ImportSanitizationNote {
  /** Code court, stable pour l'UI (i18n possible plus tard). */
  code:
    | 'drag-law-replaced'
    | 'reticle-unit-canonicalised'
    | 'unknown-field-stripped'
    | 'caliber-derived-from-diameter'
    | 'imported-from-remapped';
  /** Message lisible (FR) — non i18n pour l'instant, factorisable plus tard. */
  message: string;
  /** Champ touché. */
  field?: string;
  /** Valeur originale rejetée. */
  originalValue?: unknown;
  /** Valeur canonique appliquée. */
  appliedValue?: unknown;
}

export interface ImportRejectionIssue {
  path: ReadonlyArray<string | number>;
  message: string;
  code?: string;
}

interface BaseItem<T> {
  /** Index dans le payload d'origine, utile pour les messages d'erreur UI. */
  index: number;
  status: ImportItemStatus;
  data?: T;
  notes?: ImportSanitizationNote[];
  issues?: ImportRejectionIssue[];
  /** Pour les doublons : clé utilisée pour la collision. */
  duplicateKey?: string;
}

export type ProjectileImportItem = BaseItem<NormalisedProjectile>;
export type OpticImportItem = BaseItem<NormalisedOptic>;
export type ReticleImportItem = BaseItem<NormalisedReticle>;

/**
 * Sortie normalisée — prête à être écrite par un futur step F.3 après
 * confirmation utilisateur. Aucune clé `id` / `createdAt` / `updatedAt`
 * ici : ce sera ajouté par le store au moment du write réel.
 */
export type NormalisedProjectile = Omit<
  Projectile,
  'id' | 'createdAt' | 'updatedAt'
>;
export type NormalisedOptic = Omit<Optic, 'id' | 'createdAt' | 'updatedAt'>;
export type NormalisedReticle = Omit<Reticle, 'id' | 'createdAt' | 'updatedAt'>;

interface PreviewBase {
  source: ImportSource;
  total: number;
  okCount: number;
  sanitizedCount: number;
  duplicateCount: number;
  rejectedCount: number;
  /** Erreur globale (payload trop gros, JSON invalide, > MAX_ITEMS…). */
  fatalError?: { code: string; message: string };
}

export interface ProjectileImportPreview extends PreviewBase {
  entityType: 'projectile';
  items: ProjectileImportItem[];
}

export interface OpticImportPreview extends PreviewBase {
  entityType: 'optic';
  items: OpticImportItem[];
}

export interface ReticleImportPreview extends PreviewBase {
  entityType: 'reticle';
  items: ReticleImportItem[];
}

export type ImportPreview =
  | ProjectileImportPreview
  | OpticImportPreview
  | ReticleImportPreview;

// ---------------------------------------------------------------------------
// Existing-entities lookup (pour la dédup contre la base courante)
// ---------------------------------------------------------------------------

export interface ExistingForDedup {
  projectiles?: ReadonlyArray<Pick<Projectile, 'brand' | 'model' | 'weight' | 'caliber'>>;
  optics?: ReadonlyArray<Pick<Optic, 'name'> & { brand?: string; model?: string }>;
  reticles?: ReadonlyArray<Pick<Reticle, 'brand' | 'model'>>;
}

// ---------------------------------------------------------------------------
// Clés de dédup
// ---------------------------------------------------------------------------

function projectileKey(p: { brand: string; model: string; weight: number; caliber: string }): string {
  return `${p.brand.toLowerCase()}|${p.model.toLowerCase()}|${p.weight}|${p.caliber.toLowerCase()}`;
}

/**
 * Optic : dédup par `(brand, model)` côté importé. Si la donnée existante
 * n'expose qu'un `name`, on retombe sur celui-ci.
 */
function opticKeyFromImport(o: { name: string }): string {
  return `name:${o.name.toLowerCase()}`;
}

function opticKeyFromExisting(o: { name?: string; brand?: string; model?: string }): string {
  if (o.brand && o.model) return `name:${`${o.brand} ${o.model}`.toLowerCase()}`;
  return `name:${(o.name ?? '').toLowerCase()}`;
}

function reticleKey(r: { brand: string; model: string }): string {
  return `${r.brand.toLowerCase()}|${r.model.toLowerCase()}`;
}

// ---------------------------------------------------------------------------
// Normalisation + sanitisation par entité
// ---------------------------------------------------------------------------

function normaliseProjectile(
  parsed: ProjectileImport,
  source: ImportSource,
): { data: NormalisedProjectile; notes: ImportSanitizationNote[] } {
  const notes: ImportSanitizationNote[] = [];

  // Sanitisation drag-law via la source unique Tranche D.
  let bcModel: DragModel | undefined;
  if (parsed.bcModel !== undefined) {
    if (isPublicDragLaw(parsed.bcModel)) {
      bcModel = parsed.bcModel;
    } else {
      const safe = sanitizePublicDragLaw(parsed.bcModel, 'G1');
      bcModel = safe;
      notes.push({
        code: 'drag-law-replaced',
        message: `Drag law « ${parsed.bcModel} » non publique : remplacée par « ${safe} ».`,
        field: 'bcModel',
        originalValue: parsed.bcModel,
        appliedValue: safe,
      });
    }
  }

  const data: NormalisedProjectile = {
    brand: parsed.brand,
    model: parsed.model,
    weight: parsed.weight,
    bc: parsed.bc,
    caliber: parsed.caliber,
    importedFrom: source,
    ...(bcModel !== undefined ? { bcModel } : {}),
    ...(parsed.projectileType !== undefined ? { projectileType: parsed.projectileType } : {}),
    ...(parsed.shape !== undefined ? { shape: parsed.shape } : {}),
    ...(parsed.length !== undefined ? { length: parsed.length } : {}),
    ...(parsed.diameter !== undefined ? { diameter: parsed.diameter } : {}),
    ...(parsed.material !== undefined ? { material: parsed.material } : {}),
    ...(parsed.notes !== undefined ? { notes: parsed.notes } : {}),
    ...(parsed.dataSource !== undefined ? { dataSource: parsed.dataSource } : {}),
    ...(parsed.customDragTable !== undefined
      ? { customDragTable: parsed.customDragTable as NormalisedProjectile['customDragTable'] }
      : {}),
  };

  return { data, notes };
}

function normaliseOptic(
  parsed: OpticImport,
  source: ImportSource,
): { data: NormalisedOptic; notes: ImportSanitizationNote[] } {
  // Optic.clickUnit conserve son canon historique ('MOA' | 'MRAD' | 'mil').
  const data: NormalisedOptic = {
    name: parsed.name,
    clickUnit: parsed.clickUnit,
    clickValue: parsed.clickValue,
    importedFrom: source,
    ...(parsed.type !== undefined ? { type: parsed.type } : {}),
    ...(parsed.focalPlane !== undefined ? { focalPlane: parsed.focalPlane } : {}),
    ...(parsed.mountHeight !== undefined ? { mountHeight: parsed.mountHeight } : {}),
    ...(parsed.tubeDiameter !== undefined ? { tubeDiameter: parsed.tubeDiameter } : {}),
    ...(parsed.magCalibration !== undefined ? { magCalibration: parsed.magCalibration } : {}),
    ...(parsed.notes !== undefined ? { notes: parsed.notes } : {}),
  };
  return { data, notes: [] };
}

function normaliseReticle(
  parsed: ReticleImport,
  source: ImportSource,
): { data: NormalisedReticle; notes: ImportSanitizationNote[] } {
  const notes: ImportSanitizationNote[] = [];

  // Canonicalisation `mil → MRAD` — jamais émis tel quel en sortie.
  let unit: ReticleUnit;
  if (parsed.unit === 'mil') {
    unit = 'MRAD';
    notes.push({
      code: 'reticle-unit-canonicalised',
      message: 'Unité « mil » canonicalisée en « MRAD ».',
      field: 'unit',
      originalValue: 'mil',
      appliedValue: 'MRAD',
    });
  } else {
    unit = parsed.unit;
  }

  const data: NormalisedReticle = {
    brand: parsed.brand,
    model: parsed.model,
    type: parsed.type,
    unit,
    subtension: parsed.subtension,
    importedFrom: source,
    ...(parsed.focalPlane !== undefined ? { focalPlane: parsed.focalPlane } : {}),
    ...(parsed.marks !== undefined ? { marks: parsed.marks } : {}),
    ...(parsed.notes !== undefined ? { notes: parsed.notes } : {}),
  };

  return { data, notes };
}

// ---------------------------------------------------------------------------
// Parse + bornes payload
// ---------------------------------------------------------------------------

interface ParseResult {
  ok: boolean;
  data?: unknown[];
  fatalError?: { code: string; message: string };
}

function parsePayload(raw: unknown): ParseResult {
  let parsed: unknown = raw;

  if (typeof raw === 'string') {
    if (raw.length > MAX_PAYLOAD_BYTES) {
      return {
        ok: false,
        fatalError: {
          code: 'payload-too-large',
          message: `Payload > ${MAX_PAYLOAD_BYTES} octets.`,
        },
      };
    }
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      return {
        ok: false,
        fatalError: {
          code: 'invalid-json',
          message: e instanceof Error ? e.message : 'JSON invalide.',
        },
      };
    }
  }

  if (!Array.isArray(parsed)) {
    return {
      ok: false,
      fatalError: {
        code: 'not-an-array',
        message: 'Le payload d\'import doit être un tableau JSON.',
      },
    };
  }

  if (parsed.length > MAX_ITEMS) {
    return {
      ok: false,
      fatalError: {
        code: 'too-many-items',
        message: `Nombre d'items > ${MAX_ITEMS}.`,
      },
    };
  }

  return { ok: true, data: parsed as unknown[] };
}

function emptyPreview<T extends ImportEntityType>(
  entityType: T,
  source: ImportSource,
  fatalError: { code: string; message: string },
): ImportPreview {
  const base = {
    source,
    total: 0,
    okCount: 0,
    sanitizedCount: 0,
    duplicateCount: 0,
    rejectedCount: 0,
    fatalError,
    items: [] as never[],
  };
  // Shape selon entityType — TS preserve grâce au discriminant.
  if (entityType === 'projectile') return { ...base, entityType: 'projectile' } as ProjectileImportPreview;
  if (entityType === 'optic') return { ...base, entityType: 'optic' } as OpticImportPreview;
  return { ...base, entityType: 'reticle' } as ReticleImportPreview;
}

function zodIssuesToRejection(err: z.ZodError): ImportRejectionIssue[] {
  return err.issues.map(i => ({
    path: i.path,
    message: i.message,
    code: i.code,
  }));
}

// ---------------------------------------------------------------------------
// Pipeline générique
// ---------------------------------------------------------------------------

interface RunOptions {
  source: ImportSource;
  existing?: ExistingForDedup;
}

export function importProjectilesPreview(
  raw: unknown,
  opts: RunOptions,
): ProjectileImportPreview {
  const parsed = parsePayload(raw);
  if (!parsed.ok || !parsed.data) {
    return emptyPreview('projectile', opts.source, parsed.fatalError!) as ProjectileImportPreview;
  }

  const seenInBatch = new Set<string>();
  const existingKeys = new Set<string>(
    (opts.existing?.projectiles ?? []).map(projectileKey),
  );

  const items: ProjectileImportItem[] = parsed.data.map((rawItem, index) => {
    const result = ENTITY_SCHEMAS.projectile.safeParse(rawItem);
    if (!result.success) {
      return {
        index,
        status: 'rejected',
        issues: zodIssuesToRejection(result.error),
      };
    }
    const { data, notes } = normaliseProjectile(result.data, opts.source);
    const key = projectileKey(data);
    if (existingKeys.has(key) || seenInBatch.has(key)) {
      return { index, status: 'duplicate', data, duplicateKey: key };
    }
    seenInBatch.add(key);
    return {
      index,
      status: notes.length > 0 ? 'sanitized' : 'ok',
      data,
      ...(notes.length > 0 ? { notes } : {}),
    };
  });

  return summarise('projectile', opts.source, items) as ProjectileImportPreview;
}

export function importOpticsPreview(
  raw: unknown,
  opts: RunOptions,
): OpticImportPreview {
  const parsed = parsePayload(raw);
  if (!parsed.ok || !parsed.data) {
    return emptyPreview('optic', opts.source, parsed.fatalError!) as OpticImportPreview;
  }

  const seenInBatch = new Set<string>();
  const existingKeys = new Set<string>(
    (opts.existing?.optics ?? []).map(opticKeyFromExisting),
  );

  const items: OpticImportItem[] = parsed.data.map((rawItem, index) => {
    const result = ENTITY_SCHEMAS.optic.safeParse(rawItem);
    if (!result.success) {
      return { index, status: 'rejected', issues: zodIssuesToRejection(result.error) };
    }
    const { data, notes } = normaliseOptic(result.data, opts.source);
    const key = opticKeyFromImport(data);
    if (existingKeys.has(key) || seenInBatch.has(key)) {
      return { index, status: 'duplicate', data, duplicateKey: key };
    }
    seenInBatch.add(key);
    return {
      index,
      status: notes.length > 0 ? 'sanitized' : 'ok',
      data,
      ...(notes.length > 0 ? { notes } : {}),
    };
  });

  return summarise('optic', opts.source, items) as OpticImportPreview;
}

export function importReticlesPreview(
  raw: unknown,
  opts: RunOptions,
): ReticleImportPreview {
  const parsed = parsePayload(raw);
  if (!parsed.ok || !parsed.data) {
    return emptyPreview('reticle', opts.source, parsed.fatalError!) as ReticleImportPreview;
  }

  const seenInBatch = new Set<string>();
  const existingKeys = new Set<string>(
    (opts.existing?.reticles ?? []).map(reticleKey),
  );

  const items: ReticleImportItem[] = parsed.data.map((rawItem, index) => {
    const result = ENTITY_SCHEMAS.reticle.safeParse(rawItem);
    if (!result.success) {
      return { index, status: 'rejected', issues: zodIssuesToRejection(result.error) };
    }
    const { data, notes } = normaliseReticle(result.data, opts.source);
    const key = reticleKey(data);
    if (existingKeys.has(key) || seenInBatch.has(key)) {
      return { index, status: 'duplicate', data, duplicateKey: key };
    }
    seenInBatch.add(key);
    return {
      index,
      status: notes.length > 0 ? 'sanitized' : 'ok',
      data,
      ...(notes.length > 0 ? { notes } : {}),
    };
  });

  return summarise('reticle', opts.source, items) as ReticleImportPreview;
}

function summarise(
  entityType: ImportEntityType,
  source: ImportSource,
  items: BaseItem<unknown>[],
): ImportPreview {
  const counts = items.reduce(
    (acc, it) => {
      acc.total += 1;
      if (it.status === 'ok') acc.okCount += 1;
      else if (it.status === 'sanitized') acc.sanitizedCount += 1;
      else if (it.status === 'duplicate') acc.duplicateCount += 1;
      else acc.rejectedCount += 1;
      return acc;
    },
    { total: 0, okCount: 0, sanitizedCount: 0, duplicateCount: 0, rejectedCount: 0 },
  );
  return {
    entityType,
    source,
    ...counts,
    items,
  } as ImportPreview;
}

/**
 * Façade unique — utile à F.3 (UI Modal). Dispatch sur l'entité.
 */
export function runImportPreview(
  entityType: ImportEntityType,
  raw: unknown,
  opts: RunOptions,
): ImportPreview {
  if (entityType === 'projectile') return importProjectilesPreview(raw, opts);
  if (entityType === 'optic') return importOpticsPreview(raw, opts);
  return importReticlesPreview(raw, opts);
}
