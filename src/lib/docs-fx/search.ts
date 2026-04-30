/**
 * Fuzzy search over FX documentation sections.
 *
 * Index built lazily on first query and rebuilt whenever `listSections()`
 * returns a different snapshot (cheap reference check on length+ids+
 * updatedAt). Fuse.js scores tags slightly higher than the body so a tag
 * hit doesn't get drowned by long Markdown content.
 */
import Fuse, { type IFuseOptions } from 'fuse.js';
import { listSections } from './store';
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

/** All distinct tags across published sections (for the tag chip filter). */
export function listAllTags(includeDrafts = false): string[] {
  const set = new Set<string>();
  for (const s of listSections()) {
    if (!includeDrafts && s.visibility !== 'published') continue;
    for (const t of s.tags) set.add(t);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

/** Force a rebuild on next query. Useful after upsert/delete. */
export function invalidateSearchIndex(): void {
  fuse = null;
  signature = '';
}