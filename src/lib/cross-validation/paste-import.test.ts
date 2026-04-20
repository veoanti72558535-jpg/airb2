import { describe, it, expect } from 'vitest';
import { mergeRows, parsePastedRows } from './paste-import';

describe('parsePastedRows', () => {
  it('parses a nominal TSV paste', () => {
    const text = [
      'range\tdrop\tvelocity\ttof',
      '10\t3.2\t265.1\t0.0374',
      '50\t-19.7\t245.2\t0.1957',
      '100\t-122.1\t222.5\t0.4099',
    ].join('\n');
    const r = parsePastedRows(text);
    expect(r.ok).toBe(true);
    expect(r.separator).toBe('tab');
    expect(r.rows).toHaveLength(3);
    expect(r.rows[0]).toEqual({ range: 10, drop: 3.2, velocity: 265.1, tof: 0.0374 });
    expect(r.warnings).toHaveLength(0);
  });

  it('parses a comma CSV paste', () => {
    const text = ['range,drop,velocity', '10,3.2,265', '50,-19.7,245'].join('\n');
    const r = parsePastedRows(text);
    expect(r.ok).toBe(true);
    expect(r.separator).toBe('comma');
    expect(r.rows).toHaveLength(2);
  });

  it('parses a semicolon CSV paste with comma decimals', () => {
    const text = ['range;drop;velocity', '10;3,2;265,1', '50;-19,7;245,2'].join('\n');
    const r = parsePastedRows(text);
    expect(r.ok).toBe(true);
    expect(r.separator).toBe('semicolon');
    expect(r.rows[0].drop).toBeCloseTo(3.2);
    expect(r.rows[1].velocity).toBeCloseTo(245.2);
  });

  it('parses TSV with comma decimals (european tabular paste)', () => {
    const text = ['range\tdrop\tvelocity', '10\t3,2\t265,1', '50\t-19,7\t245,2'].join('\n');
    const r = parsePastedRows(text);
    expect(r.ok).toBe(true);
    expect(r.separator).toBe('tab');
    expect(r.rows[0].drop).toBeCloseTo(3.2);
  });

  it('warns on unknown columns but keeps known ones', () => {
    const text = ['range\tdrop\tfoobar', '10\t1.0\txxx', '20\t-2.0\tyyy'].join('\n');
    const r = parsePastedRows(text);
    expect(r.ok).toBe(true);
    expect(r.rows).toHaveLength(2);
    expect(r.warnings.some((w) => w.kind === 'unknown-column')).toBe(true);
  });

  it('rejects rows missing a usable range', () => {
    const text = ['range,drop', ',1.0', '50,-5.0'].join('\n');
    const r = parsePastedRows(text);
    expect(r.ok).toBe(true);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].range).toBe(50);
    expect(r.warnings.some((w) => w.kind === 'incomplete-row')).toBe(true);
  });

  it('returns ok:false on empty input (no crash)', () => {
    const r = parsePastedRows('   ');
    expect(r.ok).toBe(false);
    expect(r.error).toBe('empty-input');
    expect(r.rows).toHaveLength(0);
  });

  it('returns ok:false when range column is missing (no fabrication)', () => {
    const r = parsePastedRows('drop,velocity\n1.0,265');
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/range/i);
    expect(r.rows).toHaveLength(0);
  });

  it('returns ok:false when no usable data rows', () => {
    const r = parsePastedRows('range,drop\n,1\n,2');
    expect(r.ok).toBe(false);
    expect(r.rows).toHaveLength(0);
  });

  it('handles aliases (distance → range, vel → velocity)', () => {
    const text = ['distance\tvel\ttime', '10\t265\t0.04', '50\t245\t0.20'].join('\n');
    const r = parsePastedRows(text);
    expect(r.ok).toBe(true);
    expect(r.rows[0]).toEqual({ range: 10, velocity: 265, tof: 0.04 });
  });

  it('keeps absent cells as undefined (does not invent values)', () => {
    const text = ['range\tdrop\tvelocity', '10\t\t265', '50\t-19.7\t'].join('\n');
    const r = parsePastedRows(text);
    expect(r.ok).toBe(true);
    expect(r.rows[0].drop).toBeUndefined();
    expect(r.rows[0].velocity).toBe(265);
    expect(r.rows[1].velocity).toBeUndefined();
    expect(r.rows[1].drop).toBeCloseTo(-19.7);
  });
});

describe('mergeRows', () => {
  const a = [{ range: 10, drop: 1 }, { range: 20, drop: 2 }];
  const b = [{ range: 30, drop: 3 }];

  it('replace mode swaps the array entirely', () => {
    const out = mergeRows(a, b, 'replace');
    expect(out).toEqual(b);
    expect(out).not.toBe(b); // copied
  });

  it('append mode concatenates without dedup', () => {
    const out = mergeRows(a, b, 'append');
    expect(out).toHaveLength(3);
    expect(out[2]).toEqual({ range: 30, drop: 3 });
  });

  it('append on empty existing returns pasted only', () => {
    expect(mergeRows([], b, 'append')).toEqual(b);
  });
});