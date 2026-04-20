import { describe, it, expect } from 'vitest';
import { CsvLoaderError, parseExternalReferenceCsv } from './loader';

describe('parseExternalReferenceCsv', () => {
  it('parses a minimal CSV with range + drop + velocity + tof', () => {
    const csv = [
      'range,drop,velocity,tof',
      '10,3.2,265.1,0.0374',
      '50,-19.7,245.2,0.1957',
      '100,-122.1,222.5,0.4099',
    ].join('\n');
    const { rows, warnings } = parseExternalReferenceCsv(csv);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual({ range: 10, drop: 3.2, velocity: 265.1, tof: 0.0374 });
    expect(rows[2].drop).toBeCloseTo(-122.1);
    expect(warnings).toHaveLength(0);
  });

  it('skips comments and blank lines', () => {
    const csv = [
      '# header comment',
      '',
      'range,drop',
      '# inline comment',
      '10,1.0',
      '',
      '20,-5.0',
    ].join('\n');
    const { rows } = parseExternalReferenceCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[1]).toEqual({ range: 20, drop: -5.0 });
  });

  it('accepts semicolon separator and comma decimal', () => {
    const csv = ['range;drop;velocity', '10;3,2;265,1', '50;-19,7;245,2'].join('\n');
    const { rows } = parseExternalReferenceCsv(csv);
    expect(rows[0].drop).toBeCloseTo(3.2);
    expect(rows[1].velocity).toBeCloseTo(245.2);
  });

  it('remaps known aliases (distance → range, vel → velocity)', () => {
    const csv = ['distance,vel,time', '10,265,0.04', '50,245,0.20'].join('\n');
    const { rows } = parseExternalReferenceCsv(csv);
    expect(rows[0]).toEqual({ range: 10, velocity: 265, tof: 0.04 });
  });

  it('warns on unknown columns but keeps valid data', () => {
    const csv = ['range,drop,foobar', '10,1.0,xxx', '50,-5.0,yyy'].join('\n');
    const { rows, warnings } = parseExternalReferenceCsv(csv);
    expect(rows).toHaveLength(2);
    expect(warnings.some((w) => w.kind === 'unknown-column')).toBe(true);
  });

  it('warns on non-numeric cells but does not invent values', () => {
    const csv = ['range,drop,velocity', '10,abc,265', '50,-19.7,xyz'].join('\n');
    const { rows, warnings } = parseExternalReferenceCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0].drop).toBeUndefined();
    expect(rows[1].velocity).toBeUndefined();
    expect(warnings.filter((w) => w.kind === 'non-numeric-value')).toHaveLength(2);
  });

  it('drops rows missing the range value', () => {
    const csv = ['range,drop', ',1.0', '50,-5.0'].join('\n');
    const { rows, warnings } = parseExternalReferenceCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].range).toBe(50);
    expect(warnings.some((w) => w.kind === 'incomplete-row')).toBe(true);
  });

  it('throws when range column is missing', () => {
    const csv = ['drop,velocity', '1.0,265'].join('\n');
    expect(() => parseExternalReferenceCsv(csv)).toThrow(CsvLoaderError);
  });

  it('throws on empty input', () => {
    expect(() => parseExternalReferenceCsv('')).toThrow(CsvLoaderError);
    expect(() => parseExternalReferenceCsv('   \n  ')).toThrow(CsvLoaderError);
  });

  it('throws when no usable data rows exist', () => {
    const csv = ['range,drop', ',1.0', ',2.0'].join('\n');
    expect(() => parseExternalReferenceCsv(csv)).toThrow(CsvLoaderError);
  });
});