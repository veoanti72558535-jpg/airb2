/**
 * Tranche Admin Diagnostic — Lecture seule de l'état de persistance projectile.
 *
 * Ce module n'introduit AUCUN side effect : il observe seulement l'environnement
 * (disponibilité IndexedDB, présence du flag de migration, présence de la clé
 * legacy localStorage, taille du cache mémoire actuel) et retourne un snapshot
 * normalisé pour l'UI admin.
 *
 * AUCUN bouton destructif, AUCUN reset, AUCUNE migration forcée ici.
 */

import {
  IDB_PROJECTILES_KEY,
  LEGACY_LOCALSTORAGE_KEY,
  MIGRATION_FLAG_KEY,
  readProjectilesFromIdb,
} from './projectile-repo';
import { projectileStore } from './storage';

export type IdbAvailability = 'available' | 'unavailable' | 'unknown';
export type MigrationState = 'migrated' | 'not-migrated' | 'unknown';
export type TriState = 'yes' | 'no' | 'unknown';

export interface ProjectileStorageDiagnostic {
  /** IndexedDB est-il disponible et fonctionnel ? */
  idb: IdbAvailability;
  /** ISO date du flag de migration (si présent), sinon null. */
  migrationFlagAt: string | null;
  /** Migration legacy → IDB connue comme effectuée ? */
  migration: MigrationState;
  /** Présence de la clé legacy localStorage `pcp-projectiles`. */
  legacyKeyPresent: TriState;
  /** Taille (en caractères JSON) de la valeur legacy si encore présente. */
  legacyKeyByteSize: number | null;
  /** Nombre de projectiles actuellement visibles dans le cache mémoire. */
  inMemoryCount: number;
  /** Nombre de projectiles réellement présents en IDB (ou null si IDB KO). */
  persistedCount: number | null;
  /** Mode dégradé : pas d'IDB → les writes sont volatiles. */
  degraded: boolean;
  /** Constantes exposées pour debug/inspection (lecture seule). */
  keys: {
    idb: string;
    legacy: string;
    migrationFlag: string;
  };
}

async function probeIdb(): Promise<{ available: IdbAvailability; persistedCount: number | null }> {
  if (typeof indexedDB === 'undefined') {
    return { available: 'unavailable', persistedCount: null };
  }
  try {
    const items = await readProjectilesFromIdb();
    return { available: 'available', persistedCount: items.length };
  } catch {
    return { available: 'unavailable', persistedCount: null };
  }
}

function readLegacyKey(): { present: TriState; byteSize: number | null; flag: string | null } {
  try {
    const flag = localStorage.getItem(MIGRATION_FLAG_KEY);
    const raw = localStorage.getItem(LEGACY_LOCALSTORAGE_KEY);
    if (raw == null) return { present: 'no', byteSize: null, flag };
    return { present: 'yes', byteSize: raw.length, flag };
  } catch {
    return { present: 'unknown', byteSize: null, flag: null };
  }
}

/**
 * Snapshot de diagnostic — read-only, ne modifie jamais le stockage.
 * Conçu pour être appelé à la demande depuis l'admin (pas en boucle).
 */
export async function getProjectileStorageDiagnostic(): Promise<ProjectileStorageDiagnostic> {
  const [{ available, persistedCount }, legacy] = await Promise.all([
    probeIdb(),
    Promise.resolve(readLegacyKey()),
  ]);

  let migration: MigrationState;
  if (legacy.flag != null) migration = 'migrated';
  else if (legacy.present === 'unknown') migration = 'unknown';
  else migration = 'not-migrated';

  return {
    idb: available,
    migrationFlagAt: legacy.flag,
    migration,
    legacyKeyPresent: legacy.present,
    legacyKeyByteSize: legacy.byteSize,
    inMemoryCount: projectileStore.getAll().length,
    persistedCount,
    degraded: available !== 'available',
    keys: {
      idb: IDB_PROJECTILES_KEY,
      legacy: LEGACY_LOCALSTORAGE_KEY,
      migrationFlag: MIGRATION_FLAG_KEY,
    },
  };
}
