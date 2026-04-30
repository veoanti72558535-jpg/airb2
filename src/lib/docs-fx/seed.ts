/**
 * Build-time seed loader for FX documentation.
 *
 * Vite resolves `import.meta.glob('../../content/docs-fx/*.md', { as: 'raw' })`
 * at build time, so the Markdown ships in the bundle and the page works
 * offline / without backend. Filename → id mapping is stable
 * (`airguns-profiles.md` → `airguns-profiles`).
 *
 * Frontmatter is intentionally NOT supported here (we keep the seed simple
 * and human-grep-able). Metadata such as tags / category / order lives in
 * a small lookup table below — easier to audit than YAML strewn across
 * many files.
 */
import type { DocCategory, DocSection } from './types';

// Vite glob: eager + raw → strings keyed by absolute project path.
const RAW_FILES = import.meta.glob('../../content/docs-fx/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

interface SeedMeta {
  title: string;
  tags: string[];
  category: DocCategory;
  order: number;
}

/**
 * Curated metadata for each shipped seed file. Keep ids in sync with
 * filenames (without `.md`). Adding a new .md file requires adding a row
 * here, otherwise the file is silently skipped.
 */
const SEED_META: Record<string, SeedMeta> = {
  README: {
    title: 'Documentation FX — index',
    tags: ['fx', 'index'],
    category: 'general',
    order: 0,
  },
  'airguns-profiles': {
    title: 'Profils airguns FX — limites et comportement',
    tags: ['fx', 'airgun', 'limites', 'météo', 'erreur', 'si'],
    category: 'limits',
    order: 10,
  },
  'radar-ble': {
    title: 'FX Radar — Chronographe Web Bluetooth',
    tags: ['fx', 'radar', 'ble', 'chronographe', 'erreur', 'protocole'],
    category: 'protocol',
    order: 20,
  },
  'manual-weather-faq': {
    title: 'FAQ — Météo manuelle (saisie, erreurs, bonnes pratiques)',
    tags: ['fx', 'météo', 'manuel', 'faq', 'erreur', 'si'],
    category: 'faq',
    order: 30,
  },
};

function fileNameToId(path: string): string {
  const m = path.match(/([^/]+)\.md$/);
  return m ? m[1] : path;
}

let cached: DocSection[] | null = null;

export function getSeedSections(): DocSection[] {
  if (cached) return cached;
  const out: DocSection[] = [];
  for (const [path, body] of Object.entries(RAW_FILES)) {
    const id = fileNameToId(path);
    const meta = SEED_META[id];
    if (!meta) {
      // Silent skip — adding metadata is opt-in to avoid leaking WIP files.
      continue;
    }
    out.push({
      id,
      title: meta.title,
      body: body.trim(),
      tags: [...meta.tags],
      category: meta.category,
      order: meta.order,
      visibility: 'published',
      fromSeed: true,
    });
  }
  cached = out;
  return out;
}

/** Test-only: drop the in-memory cache so re-globbing in JSDOM works. */
export function __resetSeedCacheForTests(): void {
  cached = null;
}