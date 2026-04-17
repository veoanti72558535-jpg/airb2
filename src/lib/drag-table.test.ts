import { describe, it, expect } from 'vitest';
import { parseDragTable, DragTableParseError } from './drag-table';

describe('parseDragTable', () => {
  describe('CSV format', () => {
    it('parses CSV with header row and reports a warning', () => {
      const { table, warnings } = parseDragTable('mach,cd\n0.5,0.235\n0.9,0.45\n1.2,0.55');
      expect(table).toEqual([
        { mach: 0.5, cd: 0.235 },
        { mach: 0.9, cd: 0.45 },
        { mach: 1.2, cd: 0.55 },
      ]);
      expect(warnings).toContain('Skipped header row.');
    });

    it('parses CSV without header row (no warning)', () => {
      const { table, warnings } = parseDragTable('0.5,0.235\n1.0,0.59');
      expect(table).toHaveLength(2);
      expect(table[0]).toEqual({ mach: 0.5, cd: 0.235 });
      expect(warnings).not.toContain('Skipped header row.');
    });

    it('parses CSV with semicolon separator', () => {
      const { table } = parseDragTable('mach;cd\n0.5;0.235\n1.0;0.59');
      expect(table).toEqual([
        { mach: 0.5, cd: 0.235 },
        { mach: 1.0, cd: 0.59 },
      ]);
    });

    it('parses CSV with tab separator', () => {
      const { table } = parseDragTable('mach\tcd\n0.5\t0.235\n1.0\t0.59');
      expect(table).toEqual([
        { mach: 0.5, cd: 0.235 },
        { mach: 1.0, cd: 0.59 },
      ]);
    });

    it('trims whitespace around cells', () => {
      const { table } = parseDragTable('  0.5 , 0.235 \n 1.0 , 0.59 ');
      expect(table).toEqual([
        { mach: 0.5, cd: 0.235 },
        { mach: 1.0, cd: 0.59 },
      ]);
    });

    it('skips lines with fewer than 2 cells', () => {
      const { table } = parseDragTable('0.5,0.235\nbroken-row\n1.0,0.59');
      expect(table).toHaveLength(2);
    });

    it('handles CRLF line endings', () => {
      const { table } = parseDragTable('0.5,0.235\r\n1.0,0.59\r\n');
      expect(table).toHaveLength(2);
    });
  });

  describe('JSON format', () => {
    it('parses a flat JSON array of {mach,cd}', () => {
      const json = JSON.stringify([
        { mach: 0.5, cd: 0.235 },
        { mach: 1.0, cd: 0.59 },
      ]);
      const { table } = parseDragTable(json);
      expect(table).toHaveLength(2);
      expect(table[1]).toEqual({ mach: 1.0, cd: 0.59 });
    });

    it('parses a JSON object wrapped under "table"', () => {
      const json = JSON.stringify({ table: [{ mach: 0.5, cd: 0.235 }, { mach: 1.0, cd: 0.59 }] });
      const { table } = parseDragTable(json);
      expect(table).toHaveLength(2);
    });

    it('parses a JSON object wrapped under "points"', () => {
      const json = JSON.stringify({ points: [{ mach: 0.5, cd: 0.235 }, { mach: 1.0, cd: 0.59 }] });
      expect(parseDragTable(json).table).toHaveLength(2);
    });

    it('parses a JSON object wrapped under "drag"', () => {
      const json = JSON.stringify({ drag: [{ mach: 0.5, cd: 0.235 }, { mach: 1.0, cd: 0.59 }] });
      expect(parseDragTable(json).table).toHaveLength(2);
    });

    it('parses a JSON object wrapped under "data"', () => {
      const json = JSON.stringify({ data: [{ mach: 0.5, cd: 0.235 }, { mach: 1.0, cd: 0.59 }] });
      expect(parseDragTable(json).table).toHaveLength(2);
    });

    it('accepts alternate key spellings (Mach/Cd, M/cd)', () => {
      const json = JSON.stringify([
        { Mach: 0.5, Cd: 0.235 },
        { M: 1.0, cd: 0.59 },
      ]);
      const { table } = parseDragTable(json);
      expect(table).toEqual([
        { mach: 0.5, cd: 0.235 },
        { mach: 1.0, cd: 0.59 },
      ]);
    });

    it('throws on invalid JSON syntax', () => {
      expect(() => parseDragTable('{ not valid')).toThrow(DragTableParseError);
    });

    it('throws when JSON object has no recognised array key', () => {
      const json = JSON.stringify({ foo: [{ mach: 0.5, cd: 0.235 }] });
      expect(() => parseDragTable(json)).toThrow(/table|points|drag|data/i);
    });

    it('throws when top-level JSON is a primitive', () => {
      expect(() => parseDragTable('42')).toThrow(DragTableParseError);
    });
  });

  describe('Validation & error handling', () => {
    it('throws on empty input', () => {
      expect(() => parseDragTable('')).toThrow(/empty/i);
      expect(() => parseDragTable('   \n  ')).toThrow(/empty/i);
    });

    it('throws when fewer than 2 valid rows', () => {
      expect(() => parseDragTable('0.5,0.235')).toThrow(/at least 2/i);
    });

    it('drops rows with non-numeric values', () => {
      const { table } = parseDragTable('0.5,0.235\nfoo,bar\n1.0,0.59');
      expect(table).toHaveLength(2);
    });

    it('drops rows with negative values', () => {
      const { table } = parseDragTable('-0.5,0.235\n0.5,0.235\n1.0,-0.1\n1.5,0.6');
      expect(table.map(p => p.mach)).toEqual([0.5, 1.5]);
    });

    it('drops rows outside sanity bounds (mach>10, cd>5)', () => {
      const { table } = parseDragTable('0.5,0.235\n11,0.3\n1.5,6\n2.0,0.4');
      expect(table.map(p => p.mach)).toEqual([0.5, 2.0]);
    });

    it('throws if all rows are filtered out', () => {
      expect(() => parseDragTable('foo,bar\nbaz,qux')).toThrow(DragTableParseError);
    });
  });

  describe('Sorting & dedup', () => {
    it('sorts points ascending by mach', () => {
      const { table } = parseDragTable('1.2,0.55\n0.5,0.235\n0.9,0.45');
      expect(table.map(p => p.mach)).toEqual([0.5, 0.9, 1.2]);
    });

    it('deduplicates identical mach values and warns', () => {
      const { table, warnings } = parseDragTable('0.5,0.235\n0.5,0.30\n1.0,0.59');
      expect(table).toHaveLength(2);
      expect(table.map(p => p.mach)).toEqual([0.5, 1.0]);
      expect(warnings.some(w => /duplicate.*0\.5/i.test(w))).toBe(true);
    });

    it('keeps first cd value when deduplicating', () => {
      const { table } = parseDragTable('0.5,0.235\n0.5,0.99\n1.0,0.59');
      expect(table[0].cd).toBe(0.235);
    });

    it('throws when dedup collapses table below 2 unique points', () => {
      expect(() => parseDragTable('0.5,0.235\n0.5,0.30\n0.5,0.40')).toThrow(/<2|at least 2/i);
    });
  });
});
