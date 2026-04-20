/**
 * BUILD — Paste-import helper for external reference rows.
 *
 * Convertit un texte tabulaire collé (TSV / CSV virgule / CSV
 * point-virgule) en `ExternalReferenceRow[]`, en réutilisant
 * `parseExternalReferenceCsv` du loader existant. Logique pure,
 * 100 % testable, aucune dépendance UI.
 *
 * Règles :
 *  - séparateur auto-détecté sur la première ligne non vide /
 *    non commentée (préfère TAB > `;` > `,`) ;
 *  - header obligatoire (sinon le loader rejette explicitement) ;
 *  - aucune valeur n'est inventée : cellules vides → champs
 *    `undefined` ;
 *  - colonnes inconnues → warning, pas d'erreur fatale ;
 *  - lignes sans `range` exploitable → rejetées avec warning.
 *
 * Le résultat reste honnête : on retourne `rows` + `warnings` +
 * `error` (fatal). L'UI décide quoi afficher.
 */

import {
  CsvLoaderError,
  parseExternalReferenceCsv,
  type LoaderWarning,
} from './loader';
import type { ExternalReferenceRow } from './types';

export type PasteSeparator = 'tab' | 'comma' | 'semicolon';

export interface PasteImportResult {
  ok: boolean;
  rows: ExternalReferenceRow[];
  warnings: LoaderWarning[];
  /** Fatal error message (header missing, no usable rows, …). */
  error?: string;
  /** Detected separator (documentary, helps the UI explain). */
  separator?: PasteSeparator;
  /** Number of non-empty / non-comment lines after the header. */
  inputLineCount: number;
}

/**
 * Detect the most likely separator on the first non-empty,
 * non-comment line. TAB wins when present; otherwise we delegate
 * to the loader's own `,`/`;` heuristic by NOT touching the input.
 */
function detectSeparator(text: string): PasteSeparator {
  const lines = text.split(/\r?\n/);
  for (const raw of lines) {
    const ln = raw.trim();
    if (ln === '' || ln.startsWith('#')) continue;
    if (ln.includes('\t')) return 'tab';
    const semis = (ln.match(/;/g) ?? []).length;
    const commas = (ln.match(/,/g) ?? []).length;
    return semis > commas ? 'semicolon' : 'comma';
  }
  return 'comma';
}

/**
 * Count non-empty / non-comment / non-header lines in the source
 * text. Used to expose "X lignes lues, Y rejetées" in the UI.
 */
function countDataLines(text: string): number {
  const lines = text.split(/\r?\n/);
  let header = false;
  let n = 0;
  for (const raw of lines) {
    const ln = raw.trim();
    if (ln === '' || ln.startsWith('#')) continue;
    if (!header) {
      header = true;
      continue;
    }
    n++;
  }
  return n;
}

/**
 * Parse pasted tabular text into typed reference rows.
 *
 * Honnête par défaut : retourne `{ ok:false, error }` plutôt que
 * de lever — l'UI affichera l'erreur sans crasher. Les warnings
 * non fatals (colonnes inconnues, cellules non numériques) sont
 * cumulés dans `warnings`.
 */
export function parsePastedRows(text: string): PasteImportResult {
  const trimmed = (text ?? '').trim();
  if (trimmed === '') {
    return {
      ok: false,
      rows: [],
      warnings: [],
      error: 'empty-input',
      inputLineCount: 0,
    };
  }

  const sep = detectSeparator(text);
  // Le loader ne reconnaît que `,` et `;`. Pour le TSV, on
  // remplace TAB par `,` AVANT envoi, et on s'assure qu'aucun
  // `,` ne traîne (sinon on choisit `;`). Approche conservatrice :
  // on convertit TAB → `\t-safe` séparateur unique.
  let normalised = text;
  if (sep === 'tab') {
    // Si le texte contient déjà des virgules dans des cellules
    // (rare en TSV mais possible : décimales européennes), on
    // utilise `;` comme séparateur cible.
    const hasComma = /,/.test(text);
    const target = hasComma ? ';' : ',';
    normalised = text.replace(/\t/g, target);
  }

  try {
    const { rows, warnings } = parseExternalReferenceCsv(normalised);
    return {
      ok: true,
      rows,
      warnings,
      separator: sep,
      inputLineCount: countDataLines(text),
    };
  } catch (e) {
    const msg =
      e instanceof CsvLoaderError
        ? e.message
        : e instanceof Error
          ? e.message
          : String(e);
    return {
      ok: false,
      rows: [],
      warnings: [],
      error: msg,
      separator: sep,
      inputLineCount: countDataLines(text),
    };
  }
}

/**
 * Merge pasted rows into an existing rows array.
 *
 * - `replace` : remplace intégralement.
 * - `append`  : concatène à la fin (pas de dédoublonnage par
 *   range — l'opérateur reste maître ; un futur helper pourra
 *   proposer un merge intelligent par distance).
 */
export function mergeRows(
  existing: ExternalReferenceRow[],
  pasted: ExternalReferenceRow[],
  mode: 'replace' | 'append',
): ExternalReferenceRow[] {
  if (mode === 'replace') return pasted.slice();
  return [...existing, ...pasted];
}