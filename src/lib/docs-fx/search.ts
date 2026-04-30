/**
 * Fuzzy search over FX documentation sections.
 *
 * Index built lazily on first query and rebuilt whenever `listSections()`
 * returns a different snapshot (cheap reference check on length+ids+
 * updatedAt). Fuse.js scores tags slightly higher than the body so a tag
 * hit doesn't get drowned by long Markdown content.
 */
import Fuse, { type IFuseOptions } from 'fuse.js';
import { listSections, subscribeOverrideChanges } from './store';
import type { DocSection } from './types';

const FUSE_OPTIONS: IFuseOptions<DocSection> = {
  includeScore: true,
  threshold: 0.4,
  ignoreLocation: true,
  minMatchCharLength: 2,
  keys: [
    { name: 'title', weight: 0.4 },
    { name: 'tags', weight: 0.3 },
    { name: 'category', weight: 0.1 },
    { name: 'body', weight: 0.2 },
  ],
};

let fuse: Fuse<DocSection> | null = null;
let signature = '';

// Auto-invalidate the index whenever the override store mutates (this tab
// or another tab). The signature check in `ensureIndex()` is still our
// safety net, but this push-based hook makes the next `searchDocs()` call
// O(1) hot path instead of paying for a snapshot diff.
let _autoInvalidateBound = false;
function bindAutoInvalidate(): void {
  if (_autoInvalidateBound) return;
  _autoInvalidateBound = true;
  subscribeOverrideChanges(() => {
    fuse = null;
    signature = '';
  });
}
bindAutoInvalidate();

function snapshotSignature(sections: DocSection[]): string {
  return sections
    .map((s) => `${s.id}:${s.updatedAt ?? ''}:${s.tags.join(',')}`)
    .join('|');
}

function ensureIndex(): { fuse: Fuse<DocSection>; sections: DocSection[] } {
  const sections = listSections();
  const sig = snapshotSignature(sections);
  if (!fuse || sig !== signature) {
    fuse = new Fuse(sections, FUSE_OPTIONS);
    signature = sig;
  }
  return { fuse, sections };
}

export interface SearchOptions {
  /** Restrict to a single category. */
  category?: DocSection['category'];
  /** Restrict to sections that include ALL of these tags (case-insensitive). */
  tags?: string[];
  /** Include drafts in the results (admin only). Default false. */
  includeDrafts?: boolean;
}

export interface SearchHit {
  section: DocSection;
  score: number;
}

export interface PaginateOptions {
  /** 1-based page number. Values < 1 are clamped to 1. */
  page: number;
  /** Page size (items per page). Values < 1 are clamped to 1. */
  pageSize: number;
}

export interface PageResult<T> {
  /** The slice of items for the current page. */
  items: T[];
  /** Echoed back, clamped to a valid range. */
  page: number;
  pageSize: number;
  /** Total number of items across all pages (before slicing). */
  total: number;
  /** Total number of pages (≥ 1, even when total = 0). */
  pageCount: number;
}

function matchesFilters(s: DocSection, opts: SearchOptions): boolean {
  if (!opts.includeDrafts && s.visibility !== 'published') return false;
  if (opts.category && s.category !== opts.category) return false;
  if (opts.tags && opts.tags.length > 0) {
    const lower = s.tags.map((t) => t.toLowerCase());
    for (const t of opts.tags) {
      if (!lower.includes(t.toLowerCase())) return false;
    }
  }
  return true;
}

/**
 * Run a query. An empty query returns all sections matching the filters,
 * sorted by (category, order). A non-empty query returns Fuse-ranked hits.
 */
export function searchDocs(query: string, opts: SearchOptions = {}): SearchHit[] {
  const { fuse, sections } = ensureIndex();
  const q = query.trim();

  if (!q) {
    return sections
      .filter((s) => matchesFilters(s, opts))
      .map((s) => ({ section: s, score: 0 }));
  }

  return fuse
    .search(q)
    .filter((r) => matchesFilters(r.item, opts))
    .map((r) => ({ section: r.item, score: r.score ?? 1 }));
}

/**
 * Slice a hit list into a single page. Stable + pure: callers control the
 * page number, so deep linking / URL sync stays trivial.
 *
 * - `page` is 1-based and clamped into `[1, pageCount]`.
 * - When `total === 0`, returns `pageCount: 1` and `items: []` (empty page).
 */
export function paginate<T>(items: T[], opts: PaginateOptions): PageResult<T> {
  const pageSize = Math.max(1, Math.floor(opts.pageSize));
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, Math.floor(opts.page)), pageCount);
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page,
    pageSize,
    total,
    pageCount,
  };
}

/** Convenience: search + paginate in one call. */
export function searchDocsPaged(
  query: string,
  opts: SearchOptions & PaginateOptions,
): PageResult<SearchHit> {
  return paginate(searchDocs(query, opts), opts);
}

/** All distinct tags across published sections (for the tag chip filter). */
export function listAllTags(includeDrafts = false): string[] {
  const set = new Set<string>();
  for (const s of listSections()) {
    if (!includeDrafts && s.visibility !== 'published') continue;
    for (const t of s.tags) set.add(t);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

/**
 * Force a rebuild on next query. Normally NOT required from product code:
 * the search index auto-invalidates on every override CRUD via
 * `subscribeOverrideChanges`. Kept exported for tests and edge cases (e.g.
 * after a manual `localStorage.clear()` that bypasses the store API).
 */
export function invalidateSearchIndex(): void {
  fuse = null;
  signature = '';
}