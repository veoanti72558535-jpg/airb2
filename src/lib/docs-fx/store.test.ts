/**
 * Hybrid store contract tests.
 *
 * What we lock in:
 *  - seed sections appear with `fromSeed: true`
 *  - editing a seed only stores changed fields (partial override)
 *  - tombstone (deleteSection on a seed) hides it from listSections
 *  - resetSeedSection() restores the bundled .md content
 *  - brand-new sections persist with all fields and `fromSeed: false`
 *  - search ranks tag hits and respects category / tag filters
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  __clearOverridesForTests,
  deleteSection,
  hasOverride,
  listSections,
  resetSeedSection,
  upsertSection,
} from './store';
import {
  invalidateSearchIndex,
  listAllTags,
  paginate,
  searchDocs,
  searchDocsPaged,
} from './search';

beforeEach(() => {
  __clearOverridesForTests();
  invalidateSearchIndex();
});
afterEach(() => {
  __clearOverridesForTests();
  invalidateSearchIndex();
});

describe('docs-fx store', () => {
  it('exposes seed sections with fromSeed=true', () => {
    const all = listSections();
    const seed = all.filter((s) => s.fromSeed);
    expect(seed.length).toBeGreaterThanOrEqual(2);
    // The shipped airguns-profiles section is part of the seed.
    expect(seed.find((s) => s.id === 'airguns-profiles')).toBeTruthy();
  });

  it('partial override only stores fields that actually changed', () => {
    const seed = listSections().find((s) => s.id === 'airguns-profiles')!;
    upsertSection({
      ...seed,
      title: 'Profils FX (édition test)',
    });
    const raw = JSON.parse(localStorage.getItem('airballistik:docs-fx:overrides') ?? '{}');
    expect(raw['airguns-profiles']).toBeDefined();
    // body / tags / category were unchanged → must not be persisted
    expect(raw['airguns-profiles'].body).toBeUndefined();
    expect(raw['airguns-profiles'].tags).toBeUndefined();
    expect(raw['airguns-profiles'].category).toBeUndefined();
    // title IS persisted
    expect(raw['airguns-profiles'].title).toBe('Profils FX (édition test)');

    // and listSections reflects the override
    const after = listSections().find((s) => s.id === 'airguns-profiles')!;
    expect(after.title).toBe('Profils FX (édition test)');
    expect(after.body).toBe(seed.body);
  });

  it('deleteSection on a seed creates a tombstone (hidden from list)', () => {
    deleteSection('radar-ble');
    const ids = listSections().map((s) => s.id);
    expect(ids).not.toContain('radar-ble');
    // resetSeedSection restores it
    resetSeedSection('radar-ble');
    expect(listSections().some((s) => s.id === 'radar-ble')).toBe(true);
  });

  it('creates brand-new sections that are NOT marked fromSeed', () => {
    upsertSection({
      id: 'faq-meteo-manuelle',
      title: 'FAQ — Météo manuelle',
      body: '## Pourquoi mes valeurs sont-elles ignorées ?',
      tags: ['faq', 'météo', 'fx'],
      category: 'faq',
      order: 50,
      visibility: 'published',
    });
    const found = listSections().find((s) => s.id === 'faq-meteo-manuelle')!;
    expect(found.fromSeed).toBe(false);
    expect(found.tags).toContain('météo');
    expect(hasOverride('faq-meteo-manuelle')).toBe(true);
  });
});

describe('docs-fx search', () => {
  it('finds sections by tag', () => {
    const hits = searchDocs('radar');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => h.section.id === 'radar-ble')).toBe(true);
  });

  it('respects the tag filter (AND semantics across tags)', () => {
    const hits = searchDocs('', { tags: ['fx', 'limites'] });
    // airguns-profiles has both tags
    expect(hits.some((h) => h.section.id === 'airguns-profiles')).toBe(true);
    // radar-ble does not have 'limites'
    expect(hits.some((h) => h.section.id === 'radar-ble')).toBe(false);
  });

  it('hides drafts from non-admin queries', () => {
    upsertSection({
      id: 'draft-faq',
      title: 'Brouillon',
      body: 'wip',
      tags: ['fx'],
      category: 'faq',
      order: 1,
      visibility: 'draft',
    });
    invalidateSearchIndex();
    const publicHits = searchDocs('Brouillon');
    expect(publicHits.some((h) => h.section.id === 'draft-faq')).toBe(false);
    const adminHits = searchDocs('Brouillon', { includeDrafts: true });
    expect(adminHits.some((h) => h.section.id === 'draft-faq')).toBe(true);
  });

  it('listAllTags aggregates published tags', () => {
    const tags = listAllTags();
    expect(tags).toContain('fx');
  });
});

describe('docs-fx pagination', () => {
  it('paginate slices the list and clamps out-of-range pages', () => {
    const items = Array.from({ length: 23 }, (_, i) => i + 1);
    const p1 = paginate(items, { page: 1, pageSize: 10 });
    expect(p1.items).toHaveLength(10);
    expect(p1.pageCount).toBe(3);
    expect(p1.total).toBe(23);

    const p3 = paginate(items, { page: 3, pageSize: 10 });
    expect(p3.items).toEqual([21, 22, 23]);

    // Clamp: page 99 → last page
    const pHi = paginate(items, { page: 99, pageSize: 10 });
    expect(pHi.page).toBe(3);
    // Clamp: page 0 → page 1
    const pLo = paginate(items, { page: 0, pageSize: 10 });
    expect(pLo.page).toBe(1);
  });

  it('paginate handles an empty list with pageCount=1', () => {
    const p = paginate([], { page: 1, pageSize: 5 });
    expect(p.items).toEqual([]);
    expect(p.total).toBe(0);
    expect(p.pageCount).toBe(1);
  });

  it('searchDocsPaged composes search + pagination', () => {
    const page = searchDocsPaged('', { page: 1, pageSize: 1 });
    expect(page.items).toHaveLength(1);
    expect(page.total).toBeGreaterThanOrEqual(2);
    expect(page.pageCount).toBeGreaterThanOrEqual(2);
  });
});