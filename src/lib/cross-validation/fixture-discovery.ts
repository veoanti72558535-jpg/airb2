/**
 * Cross-validation — BUILD-C — Découverte fixtures (tests only).
 *
 * Module d'infrastructure : scanne le dossier
 * `src/lib/__fixtures__/cross-validation/` côté Node (tests Vitest), lit
 * pour chaque sous-dossier les fichiers attendus (`case.json`,
 * `inputs.json`, et pour chaque référence : `*.csv` + `*.meta.json`),
 * puis assemble le tout via `assembleCrossValidationCase` (BUILD-A).
 *
 * **Hors UI**, **hors moteur**, **hors bundle** : importe `node:fs` et
 * `node:path` — n'est jamais résolu côté navigateur. Réservé au harness
 * de tests et à un futur runner BUILD-D.
 *
 * Honnête : si un fichier annoncé dans `case.json` est absent, on lève.
 * Aucune valeur n'est inférée silencieusement.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { assembleCrossValidationCase, type AssembledCase } from './case-loader';
import type { ReferenceMeta } from './types';
import type { BallisticInput } from '@/lib/types';

/** Manifest minimal d'un cas (cf. `case.json`). */
interface CaseManifest {
  id: string;
  description: string;
  tags?: string[];
  inputsFile: string;
  references: Array<{ metaFile: string; csvFile: string }>;
  notes?: string;
}

/** Racine par défaut, résolue depuis la cwd Vitest (= racine projet). */
export const DEFAULT_FIXTURES_ROOT = resolve(
  process.cwd(),
  'src/lib/__fixtures__/cross-validation',
);

/**
 * Liste les sous-dossiers de cas (1 dossier = 1 cas). Filtre tout ce qui
 * n'est pas un dossier ou ne contient pas `case.json`.
 */
export function listCaseDirectories(root: string = DEFAULT_FIXTURES_ROOT): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root)
    .map((name) => join(root, name))
    .filter((p) => {
      try {
        return statSync(p).isDirectory() && existsSync(join(p, 'case.json'));
      } catch {
        return false;
      }
    });
}

function readJson<T>(path: string): T {
  if (!existsSync(path)) {
    throw new Error(`Fixture file missing: ${path}`);
  }
  return JSON.parse(readFileSync(path, 'utf-8')) as T;
}

function readText(path: string): string {
  if (!existsSync(path)) {
    throw new Error(`Fixture file missing: ${path}`);
  }
  return readFileSync(path, 'utf-8');
}

/**
 * Charge un cas complet depuis son dossier.
 * @throws si un fichier annoncé est absent ou si JSON est invalide.
 */
export function loadCaseFromDirectory(caseDir: string): AssembledCase {
  const manifest = readJson<CaseManifest>(join(caseDir, 'case.json'));
  const inputs = readJson<BallisticInput>(join(caseDir, manifest.inputsFile));

  const references = manifest.references.map((r) => ({
    meta: readJson<ReferenceMeta>(join(caseDir, r.metaFile)),
    csv: readText(join(caseDir, r.csvFile)),
  }));

  return assembleCrossValidationCase({
    id: manifest.id,
    description: manifest.description,
    tags: manifest.tags,
    inputs,
    references,
    notes: manifest.notes,
  });
}

/**
 * Charge tous les cas présents sous `root`. Préserve l'ordre alphabétique
 * des sous-dossiers — déterministe.
 */
export function loadAllCases(root: string = DEFAULT_FIXTURES_ROOT): AssembledCase[] {
  return listCaseDirectories(root).sort().map(loadCaseFromDirectory);
}
