import { Airgun, Projectile, Optic, Reticle, Session, Tune, AppSettings } from './types';
import {
  sanitizeProjectileForPublic,
  sanitizeSessionForPublic,
} from './drag-law-policy';
import {
  IDB_PROJECTILES_KEY,
  migrateProjectilesFromLocalStorageIfNeeded,
  writeProjectilesToIdb,
} from './projectile-repo';
import {
  IDB_SESSIONS_KEY,
  LEGACY_SESSIONS_LOCALSTORAGE_KEY,
  migrateSessionsFromLocalStorageIfNeeded,
  writeSessionsToIdb,
} from './session-repo';
import {
  upsertSessionToSupabase,
  deleteSessionFromSupabase,
} from './session-supabase-repo';
import { supabase } from '@/integrations/supabase/client';

const KEYS = {
  airguns: 'pcp-airguns',
  tunes: 'pcp-tunes',
  projectiles: 'pcp-projectiles',
  optics: 'pcp-optics',
  reticles: 'pcp-reticles',
  sessions: 'pcp-sessions',
  settings: 'pcp-settings',
} as const;

function load<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function save<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

/**
 * Erreur dédiée au dépassement du quota localStorage. Permet aux
 * consommateurs (modal d'import notamment) d'afficher un message
 * actionnable plutôt qu'un simple "fileInvalid".
 */
export class StorageQuotaExceededError extends Error {
  constructor(public readonly storeKey: string, cause?: unknown) {
    super(`Storage quota exceeded while writing "${storeKey}".`);
    this.name = 'StorageQuotaExceededError';
    if (cause !== undefined) (this as { cause?: unknown }).cause = cause;
  }
}

function isQuotaError(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false;
  const err = e as { name?: string; code?: number };
  return (
    err.name === 'QuotaExceededError' ||
    err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    err.code === 22 ||
    err.code === 1014
  );
}

function generateId(): string {
  return crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// Generic CRUD
function createCRUD<T extends { id: string; createdAt: string; updatedAt: string }>(key: string) {
  return {
    getAll: (): T[] => load<T>(key),
    getById: (id: string): T | undefined => load<T>(key).find(item => item.id === id),
    create: (item: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): T => {
      const now = new Date().toISOString();
      const newItem = { ...item, id: generateId(), createdAt: now, updatedAt: now } as T;
      const items = load<T>(key);
      items.push(newItem);
      try {
        save(key, items);
      } catch (e) {
        if (isQuotaError(e)) throw new StorageQuotaExceededError(key, e);
        throw e;
      }
      return newItem;
    },
    /**
     * Bulk insert : un seul `load` + un seul `save` quels que soient N items.
     * Indispensable pour les imports massifs (bullets4 = ~8700 projectiles)
     * où l'appel séquentiel à `create()` est O(N²) sur localStorage et
     * fait crasher le tab.
     */
    createMany: (newItems: ReadonlyArray<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>): T[] => {
      if (newItems.length === 0) return [];
      const now = new Date().toISOString();
      const items = load<T>(key);
      const created: T[] = [];
      for (const it of newItems) {
        const fresh = { ...it, id: generateId(), createdAt: now, updatedAt: now } as T;
        items.push(fresh);
        created.push(fresh);
      }
      try {
        save(key, items);
      } catch (e) {
        if (isQuotaError(e)) throw new StorageQuotaExceededError(key, e);
        throw e;
      }
      return created;
    },
    update: (id: string, updates: Partial<T>): T | undefined => {
      const items = load<T>(key);
      const idx = items.findIndex(i => i.id === id);
      if (idx === -1) return undefined;
      items[idx] = { ...items[idx], ...updates, updatedAt: new Date().toISOString() };
      save(key, items);
      return items[idx];
    },
    delete: (id: string): boolean => {
      const items = load<T>(key);
      const filtered = items.filter(i => i.id !== id);
      if (filtered.length === items.length) return false;
      save(key, filtered);
      return true;
    },
  };
}

export const airgunStore = createCRUD<Airgun>(KEYS.airguns);
export const tuneStore = createCRUD<Tune>(KEYS.tunes);
export const projectileStore = createProjectileStore();
export const opticStore = createCRUD<Optic>(KEYS.optics);
/**
 * Tranche F.1 — store CRUD pour l'entité `Reticle`. Suit strictement le
 * pattern des autres stores (createCRUD) : pas de logique métier ici, la
 * normalisation/validation arrivera avec la pipeline d'import en F.2.
 */
export const reticleStore = createCRUD<Reticle>(KEYS.reticles);
/**
 * Tranche Sessions IDB — store sessions désormais adossé à IndexedDB,
 * cache mémoire sync + write-through. Voir `createSessionStore()` ci-bas
 * pour le contrat exact (incl. fallback localStorage legacy lazy).
 */
export const sessionStore = createSessionStore();

export function getSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(KEYS.settings);
    return raw ? JSON.parse(raw) : defaultSettings();
  } catch { return defaultSettings(); }
}

export function saveSettings(settings: AppSettings) {
  localStorage.setItem(KEYS.settings, JSON.stringify(settings));
}

function defaultSettings(): AppSettings {
  return {
    unitSystem: 'metric',
    advancedMode: false,
    featureFlags: { ai: false, weather: true },
    // UK FAC limit by default — most permissive common threshold; users can switch.
    energyThresholdJ: 16.27,
  };
}

/**
 * Public/shareable export.
 *
 * Tranche D — security boundary: any drag law that is not in the V1 public
 * whitelist (G1/G7/GA/GS) is rewritten to G1 before leaving the device.
 * Two reasons:
 *  1. The MERO laws (RA4/GA2/SLG0/SLG1) are engine-internal — exposing them
 *     in a downloadable JSON would let a third party re-import them and
 *     surface non-validated curves in their public UI.
 *  2. A round-trip export → import on another device must produce a
 *     coherent projectile/session, not a "mystery model" the receiving UI
 *     cannot select. G1 is a safe, neutral fallback.
 *
 * `customDragTable` is preserved — those are user-provided Cd points and
 * remain valid public content.
 *
 * NOTE: this is the ONLY export path wired to the user-facing "Export JSON"
 * button. If a future internal/diagnostic export is added (e.g. for support
 * tickets), it MUST live in a separate function with a different name to
 * keep the policy boundary obvious.
 */
export function exportAllData(): string {
  return JSON.stringify({
    airguns: airgunStore.getAll(),
    tunes: tuneStore.getAll(),
    projectiles: projectileStore.getAll().map(p => sanitizeProjectileForPublic(p).projectile),
    optics: opticStore.getAll(),
    sessions: sessionStore.getAll().map(s => sanitizeSessionForPublic(s)),
    settings: getSettings(),
    exportedAt: new Date().toISOString(),
  }, null, 2);
}

// ───────────────────────────────────────────────────────────────────────────
// Projectile store — cache mémoire write-through vers IndexedDB
// (Tranche IDB — voir projectile-repo.ts pour les détails de migration).
// ───────────────────────────────────────────────────────────────────────────

interface ProjectileStoreInternal {
  getAll: () => Projectile[];
  getById: (id: string) => Projectile | undefined;
  create: (item: Omit<Projectile, 'id' | 'createdAt' | 'updatedAt'>) => Projectile;
  createMany: (
    items: ReadonlyArray<Omit<Projectile, 'id' | 'createdAt' | 'updatedAt'>>,
  ) => Projectile[];
  update: (id: string, updates: Partial<Projectile>) => Projectile | undefined;
  delete: (id: string) => boolean;
  /**
   * Bulk delete by predicate. Filtre le cache mémoire en une passe puis
   * persiste une seule fois — indispensable pour des nettoyages massifs
   * (ex. retirer ~8000 projectiles non-airgun importés depuis bullets4)
   * sans payer un coût O(N²) en write-through IDB.
   *
   * Retourne le nombre d'items effectivement supprimés.
   */
  deleteWhere: (predicate: (p: Projectile) => boolean) => number;
  /** Hydrate the in-memory cache (called once at boot, see bootstrapStorage). */
  __hydrate: (items: Projectile[]) => void;
  /** Test-only — reset the cache to empty. */
  __resetForTests: () => void;
  /** Internal — returns the in-flight chain of IDB writes (for flushProjectilePersistence). */
  __getPendingPersist: () => Promise<void>;
  /**
   * Tranche Import UX — re-déclenche une persistance IDB du snapshot
   * mémoire courant SANS re-jouer create/createMany. Utilisé exclusivement
   * par le bouton « Réessayer l'enregistrement » du flow d'import admin
   * en cas d'échec de persistance après un createMany() déjà appliqué au
   * cache. N'introduit aucun doublon : on ré-écrit l'état exact du cache.
   */
  __retryPersist: () => void;
}

function createProjectileStore(): ProjectileStoreInternal {
  let cache: Projectile[] = [];
  // Tranche Import UX — chaîne des writes IDB en cours. `flushProjectilePersistence()`
  // permet à un appelant (ex. modal d'import admin) d'attendre la confirmation
  // réelle d'écriture IDB avant de déclarer un succès. Toutes les writes sont
  // sérialisées sur cette chaîne pour garantir un ordre déterministe.
  let pendingPersist: Promise<void> = Promise.resolve();

  const persist = () => {
    // Snapshot to avoid the writer seeing a later mutation.
    const snapshot = cache.slice();
    // Chaîne sur la précédente write : un éventuel flush attendra TOUTES
    // les writes empilées, pas seulement la dernière.
    pendingPersist = pendingPersist
      .catch(() => undefined) // une erreur passée ne bloque pas la suivante
      .then(() => writeProjectilesToIdb(snapshot));
    // Évite "unhandled rejection" si personne ne flush (call sites historiques).
    pendingPersist.catch((e) => {
      console.error('[projectileStore] IDB persist failed', e);
    });
  };

  return {
    getAll: () => cache.slice(),
    getById: (id) => cache.find((p) => p.id === id),
    create: (item) => {
      const now = new Date().toISOString();
      const fresh = {
        ...item,
        id: generateId(),
        createdAt: now,
        updatedAt: now,
      } as Projectile;
      cache = [...cache, fresh];
      persist();
      return fresh;
    },
    createMany: (items) => {
      if (items.length === 0) return [];
      const now = new Date().toISOString();
      const created: Projectile[] = items.map((it) => ({
        ...it,
        id: generateId(),
        createdAt: now,
        updatedAt: now,
      } as Projectile));
      cache = [...cache, ...created];
      persist();
      return created;
    },
    update: (id, updates) => {
      const idx = cache.findIndex((p) => p.id === id);
      if (idx === -1) return undefined;
      const next = {
        ...cache[idx],
        ...updates,
        updatedAt: new Date().toISOString(),
      } as Projectile;
      cache = [...cache.slice(0, idx), next, ...cache.slice(idx + 1)];
      persist();
      return next;
    },
    delete: (id) => {
      const before = cache.length;
      cache = cache.filter((p) => p.id !== id);
      if (cache.length === before) return false;
      persist();
      return true;
    },
    deleteWhere: (predicate) => {
      const before = cache.length;
      cache = cache.filter((p) => !predicate(p));
      const removed = before - cache.length;
      if (removed > 0) persist();
      return removed;
    },
    __hydrate: (items) => {
      cache = Array.isArray(items) ? items.slice() : [];
    },
    __resetForTests: () => {
      cache = [];
      pendingPersist = Promise.resolve();
    },
    __getPendingPersist: () => pendingPersist,
    __retryPersist: () => {
      // Réutilise le même mécanisme `persist()` (snapshot + chaînage) ;
      // la chaîne `pendingPersist` est ré-amorcée avec une promesse résolue
      // pour que le précédent rejet n'entraîne pas le retry.
      pendingPersist = Promise.resolve();
      persist();
    },
  };
}

/**
 * Tranche Import UX — attend explicitement la fin de toutes les writes IDB
 * du `projectileStore` empilées jusqu'à présent.
 *
 * Utilisé par le workflow d'import admin pour ne déclarer un succès qu'après
 * confirmation réelle de la persistance IndexedDB. Pour les call sites
 * historiques, c'est purement opt-in : ne pas l'appeler ne change rien.
 *
 * Throw si la dernière write a échoué — l'appelant doit catch et gérer
 * (UI : ne pas afficher de faux succès, conserver la preview).
 */
export async function flushProjectilePersistence(): Promise<void> {
  await projectileStore.__getPendingPersist();
}

/**
 * Tranche Import UX — Réessaie uniquement la PERSISTANCE IDB du snapshot
 * mémoire courant du `projectileStore`, sans rejouer aucun `create()` /
 * `createMany()`. Awaitable : résout dès que l'écriture IDB est confirmée
 * (ou throw si elle échoue à nouveau).
 *
 * Contrat :
 *  - aucun nouvel item n'est créé,
 *  - aucun doublon n'est introduit,
 *  - le cache mémoire est inchangé,
 *  - on tente strictement de re-pousser ce que le cache contient déjà.
 *
 * Utilisé par l'UI d'import quand `flushProjectilePersistence()` a rejeté.
 */
export async function retryProjectilePersistence(): Promise<void> {
  projectileStore.__retryPersist();
  await projectileStore.__getPendingPersist();
}

/**
 * Bootstrap à appeler **une seule fois** au démarrage de l'app, AVANT le
 * premier render. Migre les projectiles localStorage → IDB si nécessaire,
 * puis hydrate le cache mémoire de `projectileStore`.
 *
 * Idempotent : peut être appelé plusieurs fois sans dommage (utile pour
 * les tests qui réinitialisent l'état).
 */
export async function bootstrapStorage(): Promise<void> {
  try {
    const items = await migrateProjectilesFromLocalStorageIfNeeded();
    projectileStore.__hydrate(items);
  } catch (e) {
    console.error('[storage] bootstrap failed — projectile store left empty', e);
    projectileStore.__hydrate([]);
  }
  try {
    const items = await migrateSessionsFromLocalStorageIfNeeded();
    // On force l'hydratation IDB comme source de vérité après bootstrap
    // (le fallback localStorage lazy ne sera plus consulté).
    sessionStore.__hydrate(items);
  } catch (e) {
    console.error('[storage] bootstrap failed — session store left empty', e);
    sessionStore.__hydrate([]);
  }
}

// Keep IDB key referenced for tooling/debug; not consumed directly here.
void IDB_PROJECTILES_KEY;
void IDB_SESSIONS_KEY;

// ───────────────────────────────────────────────────────────────────────────
// Session store — cache mémoire write-through vers IndexedDB
// (Tranche Sessions IDB — voir session-repo.ts pour les détails de migration).
//
// Particularité par rapport au projectile store : un fallback de lecture
// LAZY depuis localStorage (clé legacy `pcp-sessions`) est consulté tant
// que le bootstrap n'a pas encore hydraté le cache. Cela préserve les
// très nombreux tests existants qui seedent les sessions via
// `localStorage.setItem('pcp-sessions', …)` puis lisent immédiatement de
// façon synchrone (sans appeler `bootstrapStorage`).
//
// En production, `bootstrapStorage()` est appelé avant le premier render,
// l'hydratation IDB devient la source de vérité, et le fallback ne joue
// plus aucun rôle.
// ───────────────────────────────────────────────────────────────────────────

interface SessionStoreInternal {
  getAll: () => Session[];
  getById: (id: string) => Session | undefined;
  create: (item: Omit<Session, 'id' | 'createdAt' | 'updatedAt'>) => Session;
  update: (id: string, updates: Partial<Session>) => Session | undefined;
  delete: (id: string) => boolean;
  /** Hydrate the in-memory cache from the bootstrap (or tests). */
  __hydrate: (items: Session[]) => void;
  /** Test-only — reset the cache and the lazy-hydrate latch. */
  __resetForTests: () => void;
  /** Internal — pending IDB write chain. */
  __getPendingPersist: () => Promise<void>;
}

function createSessionStore(): SessionStoreInternal {
  let cache: Session[] = [];
  let hydrated = false;
  let pendingPersist: Promise<void> = Promise.resolve();

  /**
   * Hydratation paresseuse au premier accès si `bootstrapStorage` n'a
   * pas encore tourné (cas typique : tests legacy qui seedent
   * `localStorage['pcp-sessions']` puis montent un composant directement).
   *
   * On ne lit JAMAIS IDB depuis ici — IDB est strictement asynchrone et
   * réservé au chemin `bootstrapStorage()`. Le fallback se limite à la
   * clé legacy localStorage.
   */
  const ensureHydrated = () => {
    if (hydrated) return;
    try {
      const raw = localStorage.getItem(LEGACY_SESSIONS_LOCALSTORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) cache = parsed as Session[];
      }
    } catch {
      // legacy illisible → cache vide, on continue
    }
    hydrated = true;
  };

  const persist = () => {
    const snapshot = cache.slice();
    pendingPersist = pendingPersist
      .catch(() => undefined)
      .then(() => writeSessionsToIdb(snapshot));
    pendingPersist.catch((e) => {
      console.error('[sessionStore] IDB persist failed', e);
    });
  };

  /**
   * P-3 dual-write — fire-and-forget push to Supabase.
   * Never awaited by the caller; errors logged silently.
   */
  const persistToSupabase = (session: Session, op: 'upsert' | 'delete') => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      const userId = data?.user?.id;
      if (!userId) return;
      if (op === 'upsert') {
        upsertSessionToSupabase(session, userId).catch(() => {});
      } else {
        deleteSessionFromSupabase(session.id).catch(() => {});
      }
    }).catch(() => {});
  };

  return {
    getAll: () => {
      ensureHydrated();
      return cache.slice();
    },
    getById: (id) => {
      ensureHydrated();
      return cache.find((s) => s.id === id);
    },
    create: (item) => {
      ensureHydrated();
      const now = new Date().toISOString();
      const fresh = {
        ...item,
        id: generateId(),
        createdAt: now,
        updatedAt: now,
      } as Session;
      cache = [...cache, fresh];
      persist();
      persistToSupabase(fresh, 'upsert');
      return fresh;
    },
    update: (id, updates) => {
      ensureHydrated();
      const idx = cache.findIndex((s) => s.id === id);
      if (idx === -1) return undefined;
      const next = {
        ...cache[idx],
        ...updates,
        updatedAt: new Date().toISOString(),
      } as Session;
      cache = [...cache.slice(0, idx), next, ...cache.slice(idx + 1)];
      persist();
      persistToSupabase(next, 'upsert');
      return next;
    },
    delete: (id) => {
      ensureHydrated();
      const before = cache.length;
      const target = cache.find((s) => s.id === id);
      cache = cache.filter((s) => s.id !== id);
      if (cache.length === before) return false;
      persist();
      if (target) persistToSupabase(target, 'delete');
      return true;
    },
    __hydrate: (items: Session[]) => {
      cache = Array.isArray(items) ? items.slice() : [];
      hydrated = true;
    },
    __resetForTests: () => {
      cache = [];
      hydrated = false;
      pendingPersist = Promise.resolve();
    },
    __getPendingPersist: () => pendingPersist,
  };
}

/**
 * Tranche Sessions IDB — équivalent de `flushProjectilePersistence` pour
 * les sessions. Permet à un appelant d'attendre que toutes les writes IDB
 * empilées sur le `sessionStore` soient confirmées (utile pour des
 * scénarios d'export/snapshot où l'on veut garantir la durabilité avant
 * d'annoncer un succès). Opt-in.
 */
export async function flushSessionPersistence(): Promise<void> {
  await sessionStore.__getPendingPersist();
}
