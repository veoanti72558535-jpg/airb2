import { DragTablePoint } from './types';

export interface DragTableParseResult {
  /** Sorted, validated table. */
  table: DragTablePoint[];
  /** Non-fatal warnings (duplicates collapsed, header skipped, etc.). */
  warnings: string[];
}

export class DragTableParseError extends Error {}

/**
 * Parse a Cd vs Mach drag table from CSV or JSON text.
 *
 * Supported formats:
 *  - CSV with optional header row "mach,cd" — comma, semicolon, or tab separator.
 *  - JSON array: `[{ "mach": 0.5, "cd": 0.235 }, ...]`
 *  - JSON object: `{ "table": [...] }` or `{ "points": [...] }` or `{ "drag": [...] }`
 *
 * Returns a sorted, deduplicated table with at least 2 points.
 * Throws DragTableParseError on fatal issues (bad format, <2 valid rows).
 */
export function parseDragTable(text: string): DragTableParseResult {
  const trimmed = text.trim();
  if (!trimmed) throw new DragTableParseError('Empty input');

  const warnings: string[] = [];
  let raw: unknown[] = [];

  // JSON branch
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch (e) {
      throw new DragTableParseError(`Invalid JSON: ${(e as Error).message}`);
    }
    if (Array.isArray(parsed)) {
      raw = parsed;
    } else if (parsed && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>;
      const candidate = obj.table ?? obj.points ?? obj.drag ?? obj.data;
      if (!Array.isArray(candidate)) {
        throw new DragTableParseError(
          'JSON object must contain an array under "table", "points", "drag" or "data".'
        );
      }
      raw = candidate;
    } else {
      throw new DragTableParseError('JSON must be an array or object.');
    }
  } else {
    // CSV branch
    const lines = trimmed.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 0) throw new DragTableParseError('No CSV rows found.');
    const sep = detectSeparator(lines[0]);
    let startIdx = 0;
    const firstCells = splitCsv(lines[0], sep);
    if (firstCells.length >= 2 && Number.isNaN(Number(firstCells[0]))) {
      startIdx = 1;
      warnings.push('Skipped header row.');
    }
    for (let i = startIdx; i < lines.length; i++) {
      const cells = splitCsv(lines[i], sep);
      if (cells.length < 2) continue;
      raw.push({ mach: cells[0], cd: cells[1] });
    }
  }

  // Normalise + validate
  const points: DragTablePoint[] = [];
  for (const row of raw) {
    const point = coercePoint(row);
    if (point) points.push(point);
  }

  if (points.length < 2) {
    throw new DragTableParseError(
      `At least 2 valid (mach, cd) pairs required — got ${points.length}.`
    );
  }

  // Sort ascending by mach
  points.sort((a, b) => a.mach - b.mach);

  // Deduplicate identical mach values (keep first)
  const dedup: DragTablePoint[] = [];
  for (const p of points) {
    if (dedup.length > 0 && Math.abs(dedup[dedup.length - 1].mach - p.mach) < 1e-9) {
      warnings.push(`Duplicate Mach ${p.mach} ignored.`);
      continue;
    }
    dedup.push(p);
  }

  if (dedup.length < 2) {
    throw new DragTableParseError('Table collapsed to <2 unique points after dedup.');
  }

  return { table: dedup, warnings };
}

/** Serialise a drag table as compact CSV with header row. */
export function dragTableToCsv(table: DragTablePoint[]): string {
  const lines = ['mach,cd'];
  for (const p of table) {
    lines.push(`${formatNum(p.mach)},${formatNum(p.cd)}`);
  }
  return lines.join('\n');
}

function formatNum(n: number): string {
  // Avoid scientific notation, keep up to 6 significant digits.
  return Number.isInteger(n) ? n.toString() : n.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
}

function detectSeparator(line: string): string {
  if (line.includes('\t')) return '\t';
  if (line.includes(';')) return ';';
  return ',';
}

function splitCsv(line: string, sep: string): string[] {
  return line.split(sep).map(s => s.trim());
}

function coercePoint(row: unknown): DragTablePoint | null {
  if (!row || typeof row !== 'object') return null;
  const obj = row as Record<string, unknown>;
  // Accept several common key spellings.
  const machRaw = obj.mach ?? obj.Mach ?? obj.MACH ?? obj.m ?? obj.M;
  const cdRaw = obj.cd ?? obj.Cd ?? obj.CD ?? obj.cD;
  const mach = Number(machRaw);
  const cd = Number(cdRaw);
  if (!Number.isFinite(mach) || !Number.isFinite(cd)) return null;
  if (mach < 0 || cd < 0) return null;
  if (mach > 10 || cd > 5) return null; // sanity bounds
  return { mach, cd };
}
