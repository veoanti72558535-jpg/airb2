import { Airgun, Projectile, Optic, Session, Tune, AppSettings } from './types';
import {
  sanitizeProjectileForPublic,
  sanitizeSessionForPublic,
} from './drag-law-policy';

const KEYS = {
  airguns: 'pcp-airguns',
  tunes: 'pcp-tunes',
  projectiles: 'pcp-projectiles',
  optics: 'pcp-optics',
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
      save(key, items);
      return newItem;
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
export const projectileStore = createCRUD<Projectile>(KEYS.projectiles);
export const opticStore = createCRUD<Optic>(KEYS.optics);
export const sessionStore = createCRUD<Session>(KEYS.sessions);

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
