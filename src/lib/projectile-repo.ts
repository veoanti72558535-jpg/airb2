/**
 * Tranche IDB — Repository de persistance pour `Projectile`.
 *
 * Backend : IndexedDB via `idb-keyval` (une seule clé `pcp-projectiles-idb`
 * contenant l'array complet sérialisé en JSON, identique au format
 * historiquement stocké dans `localStorage`).
 *
 * POURQUOI ?
 *  - Le quota `localStorage` (~5 MB) est saturé par un import bullets4
 *    (~8700 projectiles, ~2-4 MB sérialisé) cohabitant avec d'autres entités.
 *  - IndexedDB offre plusieurs centaines de MB sans ce blocage et sans
 *    nécessiter de backend.
 *
 * STRATÉGIE D'API :
 *  - L'API publique de `projectileStore` (storage.ts) RESTE 100% SYNCHRONE.
 *    Elle s'appuie sur un cache mémoire hydraté **une fois** au bootstrap.
 *  - Les writes mettent à jour le cache (sync, retour immédiat) puis
 *    persistent via write-through async vers IDB. Une éventuelle erreur
 *    de persistance est journalisée, mais ne casse pas le flux UI.
 *  - Migration one-shot et idempotente depuis `localStorage` au premier
 *    boot post-déploiement, puis purge de la clé legacy pour libérer le
 *    quota localStorage.
 *
 * NB : ce module ne contient AUCUNE logique métier (drag law, sanitisation,
 * etc.). Il ne fait que persister un array `Projectile[]` opaque.
 */

import { get, set, del } from 'idb-keyval';
import type { Projectile } from './types';

/** Nouvelle clé IDB. Différente de la clé localStorage pour éviter toute confusion. */
export const IDB_PROJECTILES_KEY = 'pcp-projectiles-idb';
/** Ancienne clé localStorage — lue une seule fois pour migration, puis supprimée. */
export const LEGACY_LOCALSTORAGE_KEY = 'pcp-projectiles';
/** Drapeau de migration — indique que la migration a été tentée (succès ou no-op). */
export const MIGRATION_FLAG_KEY = 'pcp-projectiles-idb-migrated-v1';

/**
 * Lit l'array projectile depuis IDB. Retourne `[]` si absent ou en cas
 * d'erreur (IDB indisponible, JSON corrompu, …) — ne jette jamais.
 */
export async function readProjectilesFromIdb(): Promise<Projectile[]> {
  try {
    const raw = await get<unknown>(IDB_PROJECTILES_KEY);
    if (!raw) return [];
    if (Array.isArray(raw)) return raw as Projectile[];
    // Defensive : on a déjà vu une string (sérialisation legacy possible).
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as Projectile[]) : [];
      } catch {
        return [];
      }
    }
    return [];
  } catch (e) {
    // IDB indisponible (mode privé Firefox ancien, etc.) — fallback graceful.
    console.warn('[projectile-repo] IDB read failed, falling back to empty list', e);
    return [];
  }
}

/**
 * Persiste l'array projectile vers IDB. Toute erreur est propagée à
 * l'appelant (le store synchrone l'avale et la log pour ne pas casser l'UI).
 */
export async function writeProjectilesToIdb(items: Projectile[]): Promise<void> {
  await set(IDB_PROJECTILES_KEY, items);
}

/**
 * Migration one-shot et idempotente :
 *  1. Si `MIGRATION_FLAG_KEY` est présent en localStorage → no-op.
 *  2. Sinon, lit la clé legacy `pcp-projectiles` :
 *     - vide / illisible → on marque le flag, rien d'autre à faire.
 *     - non vide → on lit IDB ; si IDB est vide on y déverse les items
 *       legacy (non destructif), sinon on conserve IDB (déjà migré ailleurs).
 *  3. On purge la clé legacy localStorage pour libérer ~quota localStorage.
 *  4. On marque le flag.
 *
 * Retourne le nombre de projectiles **présents en IDB** après migration
 * (utilisé par le store pour initialiser son cache mémoire).
 */
export async function migrateProjectilesFromLocalStorageIfNeeded(): Promise<Projectile[]> {
  // Si IDB est déjà peuplé, on s'en sert quoi qu'il arrive — IDB fait foi
  // dès qu'il contient des données.
  const idbItems = await readProjectilesFromIdb();

  let alreadyMigrated = false;
  try {
    alreadyMigrated = localStorage.getItem(MIGRATION_FLAG_KEY) != null;
  } catch {
    // localStorage indisponible (mode privé strict) — on saute la migration.
    return idbItems;
  }

  if (alreadyMigrated) return idbItems;

  let legacyItems: Projectile[] = [];
  try {
    const raw = localStorage.getItem(LEGACY_LOCALSTORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) legacyItems = parsed as Projectile[];
    }
  } catch {
    // JSON corrompu : on ignore, on marquera quand même le flag pour
    // ne pas reboucler indéfiniment.
    legacyItems = [];
  }

  let finalItems = idbItems;
  if (idbItems.length === 0 && legacyItems.length > 0) {
    try {
      await writeProjectilesToIdb(legacyItems);
      finalItems = legacyItems;
    } catch (e) {
      console.warn('[projectile-repo] IDB seed from legacy failed', e);
      // On laisse legacyItems en localStorage pour ne pas perdre les données
      // si IDB a échoué — pas de purge, pas de flag.
      return idbItems;
    }
  }

  // Purge de la clé legacy + pose du flag (uniquement si la migration
  // s'est faite ou qu'il n'y avait rien à migrer).
  try {
    localStorage.removeItem(LEGACY_LOCALSTORAGE_KEY);
    localStorage.setItem(MIGRATION_FLAG_KEY, new Date().toISOString());
  } catch {
    // Si on n'arrive pas à poser le flag, la migration sera retentée
    // au prochain boot — c'est exactement le comportement idempotent voulu.
  }

  return finalItems;
}

/**
 * Reset complet — destiné aux tests uniquement. Supprime IDB + flag + legacy.
 */
export async function __resetProjectileRepoForTests(): Promise<void> {
  try { await del(IDB_PROJECTILES_KEY); } catch { /* noop */ }
  try { localStorage.removeItem(MIGRATION_FLAG_KEY); } catch { /* noop */ }
  try { localStorage.removeItem(LEGACY_LOCALSTORAGE_KEY); } catch { /* noop */ }
}