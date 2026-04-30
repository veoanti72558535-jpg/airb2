/**
 * Hybrid store for FX documentation sections.
 *
 * Read path:
 *   listSections()  →  merge(seed, overrides)
 *                       - tombstones hide seed entries
 *                       - overrides patch fields (title, body, tags, …)
 *                       - brand-new ids (no seed counterpart) are appended
 *
 * Write path:
 *   upsertSection() / deleteSection() update the override map and persist
 *   it. Writes are LOCAL to the device (intentional — no backend yet).
 *   Admin gating MUST happen at the call site via `useIsAdmin`; this
 *   module does not enforce it (kept storage-only by design).
 */
import {
  DOC_CATEGORIES,
  DOC_VISIBILITIES,
  type DocCategory,
  type DocOverride,
  type DocSection,
  type DocVisibility,
  OVERRIDES_STORAGE_KEY,
} from './types';
import { getSeedSections } from './seed';

function isCategory(x: unknown): x is DocCategory {
  return typeof x === 'string' && (DOC_CATEGORIES as readonly string[]).includes(x);
}
function isVisibility(x: unknown): x is DocVisibility {
  return typeof x === 'string' && (DOC_VISIBILITIES as readonly string[]).includes(x);
}

function safeReadOverrides(): Record<string, DocOverride> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(OVERRIDES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const out: Record<string, DocOverride> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (!v || typeof v !== 'object') continue;
      const o = v as Record<string, unknown>;
      if (typeof o.id !== 'string' || typeof o.updatedAt !== 'string') continue;
      out[k] = {
        id: o.id,
        updatedAt: o.updatedAt,
        deleted: o.deleted === true ? true : undefined,
        title: typeof o.title === 'string' ? o.title : undefined,
        body: typeof o.body === 'string' ? o.body : undefined,
        tags: Array.isArray(o.tags) ? o.tags.filter((t) => typeof t === 'string') : undefined,
        category: isCategory(o.category) ? o.category : undefined,
        order: typeof o.order === 'number' && Number.isFinite(o.order) ? o.order : undefined,
        visibility: isVisibility(o.visibility) ? o.visibility : undefined,
      };
    }
    return out;
  } catch {
    return {};
  }
}

function writeOverrides(map: Record<string, DocOverride>): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(OVERRIDES_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // quota / private mode — silently ignored, edits will be lost on reload
  }
}

function applyOverride(seed: DocSection, ov: DocOverride): DocSection {
  return {
    ...seed,
    title: ov.title ?? seed.title,
    body: ov.body ?? seed.body,
    tags: ov.tags ?? seed.tags,
    category: ov.category ?? seed.category,
    order: ov.order ?? seed.order,
    visibility: ov.visibility ?? seed.visibility,
    updatedAt: ov.updatedAt,
  };
}

function overrideToSection(ov: DocOverride): DocSection {
  return {
    id: ov.id,
    title: ov.title ?? '(untitled)',
    body: ov.body ?? '',
    tags: ov.tags ?? [],
    category: ov.category ?? 'general',
    order: ov.order ?? 999,
    visibility: ov.visibility ?? 'draft',
    updatedAt: ov.updatedAt,
    fromSeed: false,
  };
}

/**
 * Merge seed + overrides and return the canonical section list,
 * sorted by (category, order, title).
 */
export function listSections(): DocSection[] {
  const seed = getSeedSections();
  const overrides = safeReadOverrides();
  const seenIds = new Set<string>();
  const merged: DocSection[] = [];

  for (const s of seed) {
    const ov = overrides[s.id];
    if (ov?.deleted) {
      seenIds.add(s.id);
      continue;
    }
    merged.push(ov ? applyOverride(s, ov) : s);
    seenIds.add(s.id);
  }
  for (const [id, ov] of Object.entries(overrides)) {
    if (seenIds.has(id) || ov.deleted) continue;
    merged.push(overrideToSection(ov));
  }

  return merged.sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    if (a.order !== b.order) return a.order - b.order;
    return a.title.localeCompare(b.title);
  });
}

/** Listable categories with at least one published section. */
export function listCategoriesInUse(): DocCategory[] {
  const cats = new Set<DocCategory>();
  for (const s of listSections()) {
    if (s.visibility === 'published') cats.add(s.category);
  }
  return [...cats];
}

export function getSection(id: string): DocSection | null {
  return listSections().find((s) => s.id === id) ?? null;
}

export interface UpsertInput {
  id: string;
  title: string;
  body: string;
  tags: string[];
  category: DocCategory;
  order: number;
  visibility: DocVisibility;
}

/**
 * Create or update a section.
 *
 * For seed sections, only the changed fields are persisted as a partial
 * override (so future seed edits in .md files still flow through for
 * untouched fields). For brand-new ids, a full override is written.
 */
export function upsertSection(input: UpsertInput): DocSection {
  const overrides = safeReadOverrides();
  const seed = getSeedSections().find((s) => s.id === input.id);
  const now = new Date().toISOString();

  if (seed) {
    const partial: DocOverride = { id: input.id, updatedAt: now };
    if (input.title !== seed.title) partial.title = input.title;
    if (input.body !== seed.body) partial.body = input.body;
    if (JSON.stringify(input.tags) !== JSON.stringify(seed.tags)) partial.tags = input.tags;
    if (input.category !== seed.category) partial.category = input.category;
    if (input.order !== seed.order) partial.order = input.order;
    if (input.visibility !== seed.visibility) partial.visibility = input.visibility;
    overrides[input.id] = partial;
  } else {
    overrides[input.id] = { ...input, updatedAt: now };
  }

  writeOverrides(overrides);
  return getSection(input.id)!;
}

/**
 * Delete a section.
 * - Brand-new override → removed from the map.
 * - Seed section → tombstoned (deleted: true) so the .md file stops showing.
 */
export function deleteSection(id: string): void {
  const overrides = safeReadOverrides();
  const isSeed = getSeedSections().some((s) => s.id === id);
  if (isSeed) {
    overrides[id] = { id, deleted: true, updatedAt: new Date().toISOString() };
  } else {
    delete overrides[id];
  }
  writeOverrides(overrides);
}

/** Reset a seed section back to its bundled .md content. No-op for non-seed ids. */
export function resetSeedSection(id: string): void {
  const overrides = safeReadOverrides();
  if (!(id in overrides)) return;
  const isSeed = getSeedSections().some((s) => s.id === id);
  if (!isSeed) return;
  delete overrides[id];
  writeOverrides(overrides);
}

export function hasOverride(id: string): boolean {
  return id in safeReadOverrides();
}

/** Test helper — never call from product code. */
export function __clearOverridesForTests(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(OVERRIDES_STORAGE_KEY);
  } catch {
    /* noop */
  }
}