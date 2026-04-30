/**
 * Couverture du garde-fou SI sur tous les endpoints balistiques.
 *
 * Règle (voir `docs/engine/backend-si-contract.md`) :
 *   Toute edge function dont le nom commence par `ballistic-` doit
 *   appliquer le garde-fou SI partagé. Concrètement :
 *
 *     1. Importer depuis `../_shared/si-guardrail.ts`
 *     2. Invoquer `applySiGuardrail(...)` au moins une fois
 *     3. Ne PAS redéclarer en local les constantes du garde-fou
 *        (FORBIDDEN_SUFFIXES, FORBIDDEN_TOKENS, SI_BOUNDS) — elles
 *        doivent vivre dans le module partagé pour rester
 *        synchronisées.
 *
 * Ce test fait échouer la CI si un nouvel endpoint balistique est
 * ajouté sans le garde-fou. Il garantit qu'il est *impossible* d'avoir
 * un endpoint balistique vulnérable à l'injection d'unités d'affichage,
 * même par inadvertance.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const FUNCTIONS_DIR = join(process.cwd(), 'supabase', 'functions');

function listBallisticEndpoints(): string[] {
  if (!existsSync(FUNCTIONS_DIR)) return [];
  const out: string[] = [];
  for (const name of readdirSync(FUNCTIONS_DIR)) {
    if (!name.startsWith('ballistic-')) continue;
    const dir = join(FUNCTIONS_DIR, name);
    if (!statSync(dir).isDirectory()) continue;
    const indexPath = join(dir, 'index.ts');
    if (!existsSync(indexPath)) continue;
    out.push(indexPath);
  }
  return out;
}

const ENDPOINTS = listBallisticEndpoints();

describe('Backend SI guardrail coverage — every ballistic-* endpoint', () => {
  it('finds at least one ballistic endpoint to audit (sanity)', () => {
    // Today: ballistic-compute. Future: ballistic-zero-solver,
    // ballistic-truing, ballistic-pbr, … all caught by this scan.
    expect(ENDPOINTS.length).toBeGreaterThanOrEqual(1);
  });

  for (const path of ENDPOINTS) {
    const rel = path.replace(process.cwd() + '/', '');

    describe(rel, () => {
      const src = readFileSync(path, 'utf8');

      it('imports from `_shared/si-guardrail.ts`', () => {
        const importsGuardrail =
          /from\s+['"][.\/]+_shared\/si-guardrail(\.ts)?['"]/.test(src);
        expect(
          importsGuardrail,
          `${rel} must import from '../_shared/si-guardrail.ts' — see docs/engine/backend-si-contract.md`,
        ).toBe(true);
      });

      it('invokes `applySiGuardrail(...)` at least once', () => {
        // The helper is the single entry point: sentinel + key audit
        // (+ optional bounds). Skipping it = vulnerable endpoint.
        // Tolerate explicit type parameters, including nested generics
        // like `applySiGuardrail<Record<string, unknown>>(body)`. We
        // match any chars up to the call paren, conservatively excluding
        // newlines (so `import { applySiGuardrail, …\n}` is not counted).
        const calls =
          src.match(/\bapplySiGuardrail\s*(?:<[^\n;]*>)?\s*\(/g) ?? [];
        expect(
          calls.length,
          `${rel} must call applySiGuardrail(body) before any computation. ` +
            `See the canonical pattern in docs/engine/backend-si-contract.md §1.`,
        ).toBeGreaterThanOrEqual(1);
      });

      it('does NOT redeclare guardrail constants locally', () => {
        // Forbid local duplicates of constants that MUST live in the
        // shared module — silent drift between two copies would defeat
        // the whole purpose of the guardrail.
        const localDuplicates: string[] = [];
        const FORBIDDEN_LOCALS = [
          'FORBIDDEN_SUFFIXES',
          'FORBIDDEN_TOKENS',
          'SI_BOUNDS',
        ];
        for (const name of FORBIDDEN_LOCALS) {
          // Match `const NAME = [` / `const NAME: ... = [` / `const NAME = {`
          const re = new RegExp(`(?:^|\\n)\\s*const\\s+${name}\\s*[:=]`, 'g');
          if (re.test(src)) localDuplicates.push(name);
        }
        expect(
          localDuplicates,
          `${rel} redeclares ${localDuplicates.join(', ')} locally — these MUST be imported from '../_shared/si-guardrail.ts' to prevent drift.`,
        ).toEqual([]);
      });

      it('runs the guardrail BEFORE the structural Zod schema parse', () => {
        // Order matters: guardrail first (sentinel + key audit),
        // then structural validation, then bounds, then logic.
        // Skip the IMPORT occurrence — only call sites count.
        const guardIdx = src.search(
          /\bapplySiGuardrail\s*(?:<[^\n;]*>)?\s*\(/,
        );
        const zodIdx   = src.search(/\.safeParse\s*\(|\.parse\s*\(/);
        if (guardIdx === -1 || zodIdx === -1) return; // covered by the other tests
        expect(
          guardIdx < zodIdx,
          `${rel}: applySiGuardrail() must run BEFORE Zod .safeParse()/.parse(). ` +
            `Otherwise a payload with a display-unit key could partially validate and leak through error messages.`,
        ).toBe(true);
      });
    });
  }
});

describe('Backend SI guardrail — shared module health', () => {
  const sharedPath = join(FUNCTIONS_DIR, '_shared', 'si-guardrail.ts');

  it('shared module exists', () => {
    expect(existsSync(sharedPath), 'supabase/functions/_shared/si-guardrail.ts is missing').toBe(true);
  });

  it('shared module exposes the canonical helpers', () => {
    const src = readFileSync(sharedPath, 'utf8');
    for (const symbol of [
      'applySiGuardrail',
      'findDisplayUnitKey',
      'keyMentionsDisplayUnit',
      'checkSiBound',
      'findOutOfSiRange',
      'SI_BOUNDS',
      'FORBIDDEN_SUFFIXES',
      'FORBIDDEN_TOKENS',
    ]) {
      expect(
        new RegExp(`export\\s+(const|function|type)\\s+${symbol}\\b`).test(src),
        `_shared/si-guardrail.ts must export \`${symbol}\``,
      ).toBe(true);
    }
  });
});
