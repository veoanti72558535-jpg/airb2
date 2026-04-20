/**
 * BUILD-C bis — Persistance locale des cas de validation comparative
 * saisis ou importés par l'utilisateur.
 *
 * Choix d'implémentation :
 *  - localStorage (clé `pcp-cross-validation-cases`),
 *  - aligné sur le pattern des autres stores (`storage.ts`),
 *  - PAS de IndexedDB ici : volume très faible (≤ quelques dizaines de
 *    cas) et pas de blob lourd. Si plus tard on dépasse, migrer vers
 *    IDB comme pour `projectile-repo` sera direct.
 *
 * Le store est volontairement strictement séparé des entités domaine
 * (Airgun/Projectile/...) : un cas de validation n'est PAS un objet
 * métier balistique, c'est un artefact de QA.
 */

import {
  validateUserCase,
  type UserCrossValidationCase,
  type ValidationIssue,
} from './user-case-schema';

export const USER_CASES_STORAGE_KEY = 'pcp-cross-validation-cases';

export interface StoredUserCase {
  /** ID interne stable (UUID) — distinct du `caseId` éditable utilisateur. */
  id: string;
  case: UserCrossValidationCase;
  createdAt: string;
  updatedAt: string;
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function safeParse(raw: string | null): StoredUserCase[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (it): it is StoredUserCase =>
        !!it &&
        typeof it === 'object' &&
        typeof it.id === 'string' &&
        typeof it.createdAt === 'string' &&
        typeof it.updatedAt === 'string' &&
        !!it.case,
    );
  } catch {
    return [];
  }
}

function read(): StoredUserCase[] {
  if (typeof localStorage === 'undefined') return [];
  return safeParse(localStorage.getItem(USER_CASES_STORAGE_KEY));
}

function write(items: StoredUserCase[]): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(USER_CASES_STORAGE_KEY, JSON.stringify(items));
}

export interface CreateResult {
  ok: boolean;
  stored?: StoredUserCase;
  issues?: ValidationIssue[];
}

export const userCaseRepo = {
  getAll(): StoredUserCase[] {
    return read();
  },

  getById(id: string): StoredUserCase | undefined {
    return read().find((s) => s.id === id);
  },

  /**
   * Crée un nouveau cas après validation Zod stricte. Renvoie les issues
   * si le payload n'est pas conforme — JAMAIS de throw.
   */
  create(payload: unknown): CreateResult {
    const v = validateUserCase(payload);
    if (!v.ok) {
      return { ok: false, issues: v.issues };
    }
    const now = new Date().toISOString();
    const stored: StoredUserCase = {
      id: generateId(),
      case: v.case,
      createdAt: now,
      updatedAt: now,
    };
    const items = read();
    items.push(stored);
    write(items);
    return { ok: true, stored };
  },

  /**
   * Remplace un cas existant. Validation Zod réappliquée. Renvoie les
   * issues si invalide ; renvoie `ok:false` sans issues si l'`id` n'existe
   * pas (le caller décide quoi faire).
   */
  update(id: string, payload: unknown): CreateResult {
    const items = read();
    const idx = items.findIndex((s) => s.id === id);
    if (idx === -1) return { ok: false };
    const v = validateUserCase(payload);
    if (!v.ok) {
      return { ok: false, issues: v.issues };
    }
    const updated: StoredUserCase = {
      ...items[idx],
      case: v.case,
      updatedAt: new Date().toISOString(),
    };
    items[idx] = updated;
    write(items);
    return { ok: true, stored: updated };
  },

  remove(id: string): boolean {
    const items = read();
    const next = items.filter((s) => s.id !== id);
    if (next.length === items.length) return false;
    write(next);
    return true;
  },

  /** Reset complet — utile en tests. */
  clear(): void {
    write([]);
  },
};