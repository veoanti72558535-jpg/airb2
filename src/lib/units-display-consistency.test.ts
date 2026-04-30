/**
 * Audit test — guards against hardcoded display units in primary user-facing
 * surfaces. The selected unit system in Préférences must reach every place
 * where ballistic values are rendered (dashboard, tables, charts, tooltips,
 * labels). Anything that prints a raw " m/s", " mm", " J", " gr", " fps",
 * " ft·lbf", etc. instead of going through `useUnits().symbol(...)` will
 * silently ignore the user's preference — that's what we forbid here.
 *
 * The test is intentionally scoped to the "priority" surfaces fixed in this
 * pass. New surfaces should be added to PROTECTED_FILES once they have been
 * migrated to `useUnits`. Pages still queued for migration are tracked in
 * KNOWN_DEBT and reported (not failed) so we never lose visibility.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const PROTECTED_FILES = [
  'src/pages/Dashboard.tsx',
  'src/components/DashboardWidgets.tsx',
  'src/pages/SessionsPage.tsx',
  'src/pages/FieldModePage.tsx',
];

const KNOWN_DEBT = [
  'src/pages/ShootingDiaryPage.tsx',
  'src/pages/FieldTargetCompPage.tsx',
  'src/pages/RangeSimulatorPage.tsx',
  'src/pages/ScopeViewPage.tsx',
  'src/pages/SessionDetailPage.tsx',
  'src/pages/TunesPage.tsx',
];

/**
 * Patterns that strongly indicate a hardcoded display unit in JSX text.
 * We look for them as suffixes after a number or a closing curly brace
 * (`}` from a JSX expression) so we don't flag legitimate occurrences in
 * comments/identifiers like `m/s` inside a long sentence or `kmps` enum.
 */
const HARDCODED_PATTERNS: { name: string; re: RegExp }[] = [
  { name: 'm/s after value',      re: /[}\d)]\s*m\/s\b/ },
  { name: 'fps after value',      re: /[}\d)]\s*fps\b/ },
  { name: 'mm after value',       re: /[}\d)]\s*mm\b/ },
  { name: 'inch after value',     re: /[}\d)]\s*(?:inch|in)\b/ },
  { name: 'J after value',        re: /[}\d)]\s*J\b(?!S)/ },
  { name: 'ft·lbf after value',   re: /[}\d)]\s*ft·lbf\b/ },
  { name: 'gr after value',       re: /[}\d)]\s*gr\b/ },
];

/** Matches likely JSX render lines (skip imports/comments/strings in code). */
function isRenderLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('//')) return false;
  if (trimmed.startsWith('*')) return false;
  if (trimmed.startsWith('import ')) return false;
  return true;
}

function scan(file: string) {
  const abs = path.resolve(process.cwd(), file);
  const src = fs.readFileSync(abs, 'utf8');
  const offences: { line: number; pattern: string; text: string }[] = [];
  src.split('\n').forEach((raw, idx) => {
    if (!isRenderLine(raw)) return;
    for (const { name, re } of HARDCODED_PATTERNS) {
      if (re.test(raw)) {
        offences.push({ line: idx + 1, pattern: name, text: raw.trim().slice(0, 140) });
      }
    }
  });
  return offences;
}

describe('Display unit consistency — protected surfaces use useUnits()', () => {
  for (const file of PROTECTED_FILES) {
    it(`${file} has no hardcoded display units`, () => {
      const offences = scan(file);
      if (offences.length > 0) {
        const report = offences
          .map(o => `  L${o.line} [${o.pattern}] ${o.text}`)
          .join('\n');
        throw new Error(
          `Hardcoded display units found in ${file} — route them through ` +
          `useUnits().symbol(...) so the Préférences toggle controls them:\n${report}`,
        );
      }
      expect(offences).toEqual([]);
    });

    it(`${file} imports useUnits`, () => {
      const src = fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');
      expect(src).toMatch(/from ['"]@\/hooks\/use-units['"]/);
    });
  }
});

describe('Display unit consistency — known debt (informational)', () => {
  it('lists remaining files still containing hardcoded units', () => {
    const debt = KNOWN_DEBT.map(f => ({ file: f, hits: scan(f).length }))
      .filter(d => d.hits > 0);
    // Informational only — log so reviewers see the backlog without failing.
    if (debt.length > 0) {
      // eslint-disable-next-line no-console
      console.warn('[units-debt]', debt);
    }
    expect(Array.isArray(debt)).toBe(true);
  });
});
