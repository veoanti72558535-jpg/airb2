/**
 * Locks the error catalog against drift.
 *
 * Adding a new code in the guardrail / client wrapper without adding a
 * row to error-codes.ts would silently leave users with an untranslated
 * raw code in the UI. This suite refuses that regression.
 */
import { describe, expect, it } from 'vitest';
import { ERROR_ROWS, KNOWN_ERROR_CODES, RANGE_ROWS } from './error-codes';
import { HARD_REJECTION_CODES } from '../ballistic-compute-client';
import { SI_BOUNDS } from '../../../supabase/functions/_shared/si-guardrail';

describe('docs-fx error catalog', () => {
  it('covers every HARD_REJECTION_CODES entry', () => {
    for (const code of HARD_REJECTION_CODES) {
      expect(KNOWN_ERROR_CODES, `missing row for hard code "${code}"`).toContain(code);
    }
  });

  it('covers every soft transport code returned by the client wrapper', () => {
    for (const code of ['no-supabase', 'no-auth', 'network-error', 'server-misconfigured', 'method-not-allowed']) {
      expect(KNOWN_ERROR_CODES, `missing row for soft code "${code}"`).toContain(code);
    }
  });

  it('every row has both FR and EN strings (no untranslated content)', () => {
    for (const row of ERROR_ROWS) {
      expect(row.cause.fr.trim().length, `cause.fr empty for ${row.code}`).toBeGreaterThan(0);
      expect(row.cause.en.trim().length, `cause.en empty for ${row.code}`).toBeGreaterThan(0);
      expect(row.userMessage.fr.trim().length, `userMessage.fr empty for ${row.code}`).toBeGreaterThan(0);
      expect(row.userMessage.en.trim().length, `userMessage.en empty for ${row.code}`).toBeGreaterThan(0);
      expect(row.fix.fr.trim().length, `fix.fr empty for ${row.code}`).toBeGreaterThan(0);
      expect(row.fix.en.trim().length, `fix.en empty for ${row.code}`).toBeGreaterThan(0);
    }
  });

  it('hard rejection codes are flagged with severity "hard"', () => {
    for (const code of HARD_REJECTION_CODES) {
      const row = ERROR_ROWS.find((r) => r.code === code)!;
      expect(row.severity, `code "${code}" should be severity "hard"`).toBe('hard');
    }
  });

  it('range table mirrors SI_BOUNDS exactly (one row per field)', () => {
    const fields = Object.keys(SI_BOUNDS).sort();
    const rangeFields = RANGE_ROWS.map((r) => r.field).sort();
    expect(rangeFields).toEqual(fields);
    for (const row of RANGE_ROWS) {
      const b = SI_BOUNDS[row.field];
      expect(row.min).toBe(b.min);
      expect(row.max).toBe(b.max);
      expect(row.unit).toBe(b.unit);
    }
  });

  it('codes are unique', () => {
    const set = new Set(KNOWN_ERROR_CODES);
    expect(set.size).toBe(KNOWN_ERROR_CODES.length);
  });
});