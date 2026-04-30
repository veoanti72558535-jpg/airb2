/**
 * Documentation section model for the editable FX docs.
 *
 * Sections come from two sources, merged in this order at read time:
 *   1. SEED — Markdown files bundled at build time from
 *      `src/content/docs-fx/*.md`. Read-only baseline shipped with the app.
 *   2. OVERRIDE — Edits and brand-new sections persisted in localStorage
 *      under `airballistik:docs-fx:overrides`. Only writable by users with
 *      the `admin` role (see `useIsAdmin`). Tombstones (`deleted: true`)
 *      hide a seed section without removing the file.
 */

export const DOC_CATEGORIES = ['limits', 'errors', 'faq', 'protocol', 'general'] as const;
export type DocCategory = (typeof DOC_CATEGORIES)[number];

export const DOC_VISIBILITIES = ['draft', 'published'] as const;
export type DocVisibility = (typeof DOC_VISIBILITIES)[number];

export interface DocSection {
  /** Stable kebab-case id, unique across seed + overrides. */
  id: string;
  title: string;
  /** Markdown body. Rendered with react-markdown. */
  body: string;
  tags: string[];
  category: DocCategory;
  /** Lower number → shown first inside its category. */
  order: number;
  visibility: DocVisibility;
  /** ISO timestamp; absent on pristine seed entries. */
  updatedAt?: string;
  /** True when this section originates from a build-time .md file. */
  fromSeed: boolean;
}

export interface DocOverride extends Partial<Omit<DocSection, 'id' | 'fromSeed'>> {
  id: string;
  /** Marks a seed section as deleted. Body/title etc. are ignored when true. */
  deleted?: boolean;
  updatedAt: string;
}

export const OVERRIDES_STORAGE_KEY = 'airballistik:docs-fx:overrides';