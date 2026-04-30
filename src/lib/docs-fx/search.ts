/**
 * Fuzzy search over FX documentation sections.
 *
 * Index built lazily on first query and rebuilt whenever `listSections()`
 * returns a different snapshot (cheap reference check on length+ids+
 * updatedAt). Fuse.js scores tags slightly higher than the body so a tag
 * hit doesn't get drowned by long Markdown content.
 *
 * Rebuild coalescing
 * ------------------
 * A burst of CRUD operations (e.g. an admin doing upsert→upsert→delete in
 * the same tick) used to invalidate the index N times. We now coalesce
 * those notifications via `scheduleRebuild()`:
 *  - same tick / within the debounce window → a single rebuild on flush
 *  - cross-tab `storage` events still invalidate immediately so other tabs
 *    converge without waiting for a debounce timer that may never fire if
 *    nothing else happens locally
 *  - any `searchDocs()` call before the timer fires is still 100% coherent
 *    because `ensureIndex()` re-checks the snapshot signature on the hot
 *    path (debounce is an optimization, not a correctness mechanism)
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

/* ---------------- Coalesced rebuild scheduler ---------------- */

let debounceMs = 50;
let pendingTimer: ReturnType<typeof setTimeout> | null = null;
let pendingCount = 0;

function doInvalidate(): void {
  fuse = null;
  signature = '';
}

function scheduleRebuild(): void {
  if (debounceMs <= 0) {
    doInvalidate();
    return;
  }
  pendingCount += 1;
  if (pendingTimer !== null) return; // already scheduled — coalesce
  pendingTimer = setTimeout(() => {
    pendingTimer = null;
    pendingCount = 0;
    doInvalidate();
  }, debounceMs);
}

let _autoInvalidateBound = false;
function bindAutoInvalidate(): void {
  if (_autoInvalidateBound) return;
  _autoInvalidateBound = true;
  subscribeOverrideChanges(() => scheduleRebuild());

  // Cross-tab edits (storage event re-fired by store.ts) need immediate
  // invalidation so the *other* tab converges without waiting on its own
  // local debounce. We detect that path by piggy-backing on the same
  // notifier but flushing right away when the call comes from a storage
  // event — implemented by listening to `storage` here as well.
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key === 'airballistik:docs-fx:overrides') {
        flushSearchIndex();
      }
    });
  }
}
bindAutoInvalidate();

/** Test/diagnostic: how many coalesced notifications are pending. */
export function _pendingRebuildCount(): number {
  return pendingCount;
}

/** Force any pending coalesced rebuild to apply now. */
export function flushSearchIndex(): void {
  if (pendingTimer !== null) {
    clearTimeout(pendingTimer);
    pendingTimer = null;
  }
  pendingCount = 0;
  doInvalidate();
}

/**
 * Tune the coalescing window. `0` disables debouncing (every CRUD
 * invalidates synchronously — the previous behaviour).
 */
export function configureSearchIndex(opts: { debounceMs: number }): void {
  debounceMs = Math.max(0, Math.floor(opts.debounceMs));
  // If we just disabled debouncing, drain anything pending.
  if (debounceMs === 0) flushSearchIndex();
}

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
  flushSearchIndex();
}