/**
 * Cross-validation — BUILD-A — Loader CSV minimal.
 *
 * Honnête, pas magique :
 *  - parse strict des nombres (NaN → erreur, pas valeur silencieuse)
 *  - colonnes inconnues ignorées avec warning structuré
 *  - colonne `range` obligatoire sinon le CSV est rejeté
 *  - aucune interpolation, aucune extrapolation
 *  - aucune conversion d'unités (CSV doit déjà être en unités canoniques)
 *
 * Format attendu :
 *   - séparateur `,` ou `;` (auto-détecté sur la première ligne non vide)
 *   - header obligatoire en première ligne non vide / non commentée
 *   - lignes commençant par `#` ignorées (commentaires)
 *   - lignes vides ignorées
 *
 * Retourne `{ rows, warnings }` plutôt que de lever sur tout :
 * les warnings (colonnes ignorées, lignes ignorées car incomplètes) sont
 * documentaires et permettront au futur runner d'afficher un rapport
 * propre. Les erreurs vraies (header manquant, `range` manquant, format
 * cassé) lèvent une `CsvLoaderError`.
 */

import {
  CSV_COLUMN_ALIASES,
  CSV_REQUIRED_COLUMNS,
  type ExternalReferenceRow,
} from './types';

export class CsvLoaderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CsvLoaderError';
  }
}

export interface LoaderWarning {
  /** 1-based line index in the original CSV (header counts as 1). */
  line: number;
  kind: 'unknown-column' | 'incomplete-row' | 'non-numeric-value';
  detail: string;
}

export interface LoaderResult {
  rows: ExternalReferenceRow[];
  warnings: LoaderWarning[];
}

/** Detect `,` vs `;` separator from the header line. Falls back to `,`. */
function detectSeparator(headerLine: string): ',' | ';' {
  const commas = (headerLine.match(/,/g) ?? []).length;
  const semis = (headerLine.match(/;/g) ?? []).length;
  return semis > commas ? ';' : ',';
}

function normalizeHeader(raw: string): string {
  return raw.trim().toLowerCase().replace(/_/g, '-');
}

function parseNumberStrict(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  // Accept comma decimal as a courtesy (European CSVs).
  const normalised = trimmed.replace(',', '.');
  const n = Number(normalised);
  if (!Number.isFinite(n)) return null;
  return n;
}

/**
 * Parse a CSV string into typed `ExternalReferenceRow[]`.
 *
 * @throws {CsvLoaderError} on structural failure (no header, no `range`,
 *   no usable rows).
 */
export function parseExternalReferenceCsv(csv: string): LoaderResult {
  if (typeof csv !== 'string' || csv.trim() === '') {
    throw new CsvLoaderError('Empty CSV input');
  }

  const allLines = csv.split(/\r?\n/);
  const warnings: LoaderWarning[] = [];

  // Find first non-empty, non-comment line → header.
  let headerIdx = -1;
  for (let i = 0; i < allLines.length; i++) {
    const ln = allLines[i].trim();
    if (ln === '' || ln.startsWith('#')) continue;
    headerIdx = i;
    break;
  }
  if (headerIdx === -1) {
    throw new CsvLoaderError('No header line found in CSV');
  }

  const sep = detectSeparator(allLines[headerIdx]);
  const rawHeaders = allLines[headerIdx].split(sep).map(normalizeHeader);

  // Map each column index → canonical key (or null if unknown).
  const colMap: Array<keyof ExternalReferenceRow | null> = rawHeaders.map(
    (h, idx) => {
      const mapped = CSV_COLUMN_ALIASES[h];
      if (!mapped) {
        warnings.push({
          line: headerIdx + 1,
          kind: 'unknown-column',
          detail: `Column "${h}" at index ${idx} is not recognised — ignored`,
        });
        return null;
      }
      return mapped;
    },
  );

  // Check required columns are present.
  const seen = new Set(colMap.filter((c): c is keyof ExternalReferenceRow => c !== null));
  for (const required of CSV_REQUIRED_COLUMNS) {
    if (!seen.has(required)) {
      throw new CsvLoaderError(
        `Required column "${required}" missing from header`,
      );
    }
  }

  const rows: ExternalReferenceRow[] = [];

  for (let i = headerIdx + 1; i < allLines.length; i++) {
    const raw = allLines[i];
    const trimmed = raw.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;

    const cells = raw.split(sep);
    const row: ExternalReferenceRow = { range: NaN };
    let rangeSet = false;
    let badCell = false;

    for (let c = 0; c < cells.length; c++) {
      const key = colMap[c];
      if (!key) continue;
      const parsed = parseNumberStrict(cells[c]);
      if (parsed === null) {
        // Empty cell → field stays undefined (except range, which we track).
        if (cells[c].trim() !== '') {
          warnings.push({
            line: i + 1,
            kind: 'non-numeric-value',
            detail: `Cell "${cells[c]}" for column "${key}" is not numeric`,
          });
          badCell = true;
        }
        continue;
      }
      if (key === 'range') {
        row.range = parsed;
        rangeSet = true;
      } else {
        row[key] = parsed;
      }
    }

    if (!rangeSet) {
      warnings.push({
        line: i + 1,
        kind: 'incomplete-row',
        detail: 'Row dropped: no usable `range` value',
      });
      continue;
    }
    if (badCell) {
      // Row kept (range is set), but flagged. Caller decides what to do.
    }
    rows.push(row);
  }

  if (rows.length === 0) {
    throw new CsvLoaderError('No usable data rows in CSV');
  }

  return { rows, warnings };
}