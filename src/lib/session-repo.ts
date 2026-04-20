/**
 * Tranche Sessions IDB — Repository de persistance pour `Session`.
 *
 * Mirror strict de `projectile-repo.ts` :
 *  - une seule clé IDB contenant l'array `Session[]` complet
 *  - migration one-shot et idempotente depuis la clé legacy localStorage
 *  - purge de la clé legacy après migration réussie
 *  - flag de migration côté localStorage pour éviter de reboucler
 *
 * POURQUOI ?
 *  - Les sessions accumulent results[], metadata, lineage, tags, warnings.
 *    Sur un usage intensif, on heurte le quota localStorage (~5 MB) avec
 *    quelques centaines d'entrées.
 *  - IDB offre plusieurs centaines de MB sans imposer de chantier backend.
 *
 * STRATÉGIE D'API :
 *  - `sessionStore` (storage.ts) reste 100% synchrone côté call sites.
 *  - Cache mémoire hydraté au bootstrap (et lazily depuis localStorage si
 *    le bootstrap n'a pas tourné — utile aux tests legacy).
 *  - Writes : cache mis à jour sync, write-through async vers IDB.
 *
 * Aucune logique métier ici (recalc, lineage, sanitisation) — pur transport.
 */

import { get, set, del } from 'idb-keyval';
import type { Session } from './types';

/** Nouvelle clé IDB. */
export const IDB_SESSIONS_KEY = 'pcp-sessions-idb';
/** Ancienne clé localStorage — lue une seule fois pour migration, puis supprimée. */
export const LEGACY_SESSIONS_LOCALSTORAGE_KEY = 'pcp-sessions';
/** Drapeau de migration — indique que la migration a été tentée (succès ou no-op). */
export const SESSIONS_MIGRATION_FLAG_KEY = 'pcp-sessions-idb-migrated-v1';

/**
 * Lit l'array session depuis IDB. Retourne `[]` si absent ou en cas
 * d'erreur — ne jette jamais.
 */
export async function readSessionsFromIdb(): Promise<Session[]> {
  try {
    const raw = await get<unknown>(IDB_SESSIONS_KEY);
    if (!raw) return [];
    if (Array.isArray(raw)) return raw as Session[];
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as Session[]) : [];
      } catch {
        return [];
      }
    }
    return [];
  } catch (e) {
    console.warn('[session-repo] IDB read failed, falling back to empty list', e);
    return [];
  }
}

/**
 * Persiste l'array session vers IDB. Toute erreur est propagée à l'appelant.
 */
export async function writeSessionsToIdb(items: Session[]): Promise<void> {
  await set(IDB_SESSIONS_KEY, items);
}

/**
 * Migration one-shot et idempotente — voir projectile-repo pour le détail
 * du contrat (même algorithme, juste appliqué aux sessions).
 *
 * Retourne le snapshot final présent en IDB après migration, utilisé pour
 * hydrater le cache mémoire du `sessionStore`.
 */
export async function migrateSessionsFromLocalStorageIfNeeded(): Promise<Session[]> {
  const idbItems = await readSessionsFromIdb();

  let alreadyMigrated = false;
  try {
    alreadyMigrated = localStorage.getItem(SESSIONS_MIGRATION_FLAG_KEY) != null;
  } catch {
    return idbItems;
  }

  if (alreadyMigrated) return idbItems;

  let legacyItems: Session[] = [];
  try {
    const raw = localStorage.getItem(LEGACY_SESSIONS_LOCALSTORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) legacyItems = parsed as Session[];
    }
  } catch {
    legacyItems = [];
  }

  let finalItems = idbItems;
  if (idbItems.length === 0 && legacyItems.length > 0) {
    try {
      await writeSessionsToIdb(legacyItems);
      finalItems = legacyItems;
    } catch (e) {
      console.warn('[session-repo] IDB seed from legacy failed', e);
      return idbItems;
    }
  }

  try {
    localStorage.removeItem(LEGACY_SESSIONS_LOCALSTORAGE_KEY);
    localStorage.setItem(SESSIONS_MIGRATION_FLAG_KEY, new Date().toISOString());
  } catch {
    // idempotent — sera retenté au prochain boot
  }

  return finalItems;
}

/**
 * Reset complet — destiné aux tests uniquement.
 */
export async function __resetSessionRepoForTests(): Promise<void> {
  try { await del(IDB_SESSIONS_KEY); } catch { /* noop */ }
  try { localStorage.removeItem(SESSIONS_MIGRATION_FLAG_KEY); } catch { /* noop */ }
  try { localStorage.removeItem(LEGACY_SESSIONS_LOCALSTORAGE_KEY); } catch { /* noop */ }
}