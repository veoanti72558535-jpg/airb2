/**
 * Tranche Admin Storage — Diagnostic lecture seule du backend de
 * persistance des sessions.
 *
 * Mirror strict de `projectile-storage-diagnostic.ts` :
 *  - aucun side effect
 *  - aucun bouton destructif induit
 *  - aucune migration forcée
 *  - lit IDB (best-effort), inspecte la clé legacy localStorage et le flag
 *    de migration, puis renvoie un snapshot normalisé pour l'UI admin.
 *
 * Réutilise les primitives publiques de `session-repo.ts` afin d'éviter
 * toute duplication de constantes.
 */

import {
  IDB_SESSIONS_KEY,
  LEGACY_SESSIONS_LOCALSTORAGE_KEY,
  SESSIONS_MIGRATION_FLAG_KEY,
  readSessionsFromIdb,
} from './session-repo';
import { sessionStore } from './storage';

export type IdbAvailability = 'available' | 'unavailable' | 'unknown';
export type MigrationState = 'migrated' | 'not-migrated' | 'unknown';
export type TriState = 'yes' | 'no' | 'unknown';

export interface SessionStorageDiagnostic {
  /** IndexedDB est-il disponible et fonctionnel ? */
  idb: IdbAvailability;
  /** ISO date du flag de migration (si présent), sinon null. */
  migrationFlagAt: string | null;
  /** Migration legacy → IDB connue comme effectuée ? */
  migration: MigrationState;
  /** Présence de la clé legacy localStorage `pcp-sessions`. */
  legacyKeyPresent: TriState;
  /** Taille (en caractères JSON) de la valeur legacy si encore présente. */
  legacyKeyByteSize: number | null;
  /** Nombre de sessions actuellement visibles dans le cache mémoire. */
  inMemoryCount: number;
  /** Nombre de sessions réellement présentes en IDB (ou null si IDB KO). */
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
    const items = await readSessionsFromIdb();
    return { available: 'available', persistedCount: items.length };
  } catch {
    return { available: 'unavailable', persistedCount: null };
  }
}

function readLegacyKey(): { present: TriState; byteSize: number | null; flag: string | null } {
  try {
    const flag = localStorage.getItem(SESSIONS_MIGRATION_FLAG_KEY);
    const raw = localStorage.getItem(LEGACY_SESSIONS_LOCALSTORAGE_KEY);
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
export async function getSessionStorageDiagnostic(): Promise<SessionStorageDiagnostic> {
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
    inMemoryCount: sessionStore.getAll().length,
    persistedCount,
    degraded: available !== 'available',
    keys: {
      idb: IDB_SESSIONS_KEY,
      legacy: LEGACY_SESSIONS_LOCALSTORAGE_KEY,
      migrationFlag: SESSIONS_MIGRATION_FLAG_KEY,
    },
  };
}