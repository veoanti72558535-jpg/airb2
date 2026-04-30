/**
 * Guardrail: the six pages migrated in this slice MUST NOT reintroduce
 * hardcoded unit literals in their JSX/template-string output. Every
 * physical quantity is formatted via `useUnits().symbol(category)` so the
 * user's display preferences (Metric/Imperial, per-category overrides,
 * decimals/scientific) propagate everywhere.
 *
 * This test scans the source files for the exact patterns we replaced
 * and fails if any reappears. Adjust the allow-lists below ONLY for
 * legitimate occurrences (unit category seed code, comments, or names
 * like `clickUnit: 'MRAD'` which is a session-stored angular contract,
 * not a display unit).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PAGES = [
  'src/pages/BallisticChatPage.tsx',
  'src/pages/RangeSimulatorPage.tsx',
  'src/pages/ScopeViewPage.tsx',
  'src/pages/SessionDetailPage.tsx',
  'src/pages/TunesPage.tsx',
  'src/pages/DesignSystemPage.tsx',
] as const;

/**
 * Patterns that, if found OUTSIDE comments and string-literal regex
 * sources (which we strip below), indicate a hardcoded unit display.
 * Each pattern targets a JSX text node or template-string suffix —
 * never a category key or session-stored contract.
 */
const FORBIDDEN_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: 'mm suffix in template', regex: /\$\{[^}]+\}\s*mm\b/ },
  { name: 'm/s suffix in template', regex: /\$\{[^}]+\}\s*m\/s\b/ },
  { name: ' J suffix in template', regex: /\$\{[^}]+\}\s*J\b(?!SON|s\.|SX)/ },
  { name: 'fps suffix in template', regex: /\$\{[^}]+\}\s*fps\b/ },
  { name: 'gr suffix in template', regex: /\$\{[^}]+\}\s*gr\b/ },
  // JSX literal text: > m/s< or >mm< etc. (closing-tag delimiters).
  { name: 'JSX literal m/s', regex: />\s*m\/s\s*</ },
  { name: 'JSX literal mm', regex: />\s*mm\s*</ },
  { name: 'JSX literal fps', regex: />\s*fps\s*</ },
  // Hardcoded unit strings in object-literal `unit:` fields.
  { name: "unit: 'mm' literal", regex: /\bunit:\s*['"`]mm['"`]/ },
  { name: "unit: 'm/s' literal", regex: /\bunit:\s*['"`]m\/s['"`]/ },
  { name: "unit: 'J' literal", regex: /\bunit:\s*['"`]J['"`]/ },
  { name: "unit: 'fps' literal", regex: /\bunit:\s*['"`]fps['"`]/ },
];

/**
 * Strip line and block comments — comments documenting the SI contract
 * legitimately mention "mm" / "m/s" / "J" and must not trigger the test.
 */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

describe('units pages — no hardcoded display literals', () => {
  for (const rel of PAGES) {
    it(`${rel} has no hardcoded unit suffix`, () => {
      const abs = resolve(process.cwd(), rel);
      const raw = readFileSync(abs, 'utf-8');
      const code = stripComments(raw);
      for (const { name, regex } of FORBIDDEN_PATTERNS) {
        const match = code.match(regex);
        if (match) {
          // Build a friendly error including the offending excerpt.
          const idx = code.indexOf(match[0]);
          const snippet = code.slice(Math.max(0, idx - 40), idx + match[0].length + 40);
          throw new Error(
            `${rel} reintroduced "${name}":\n  …${snippet.replace(/\n/g, '⏎')}…\n` +
            `Use useUnits().display(<cat>, value) + useUnits().symbol(<cat>) instead.`,
          );
        }
      }
      expect(true).toBe(true);
    });

    it(`${rel} imports useUnits`, () => {
      const abs = resolve(process.cwd(), rel);
      const raw = readFileSync(abs, 'utf-8');
      expect(raw).toMatch(/from\s+['"]@\/hooks\/use-units['"]/);
    });
  }
});