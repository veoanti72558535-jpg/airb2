import { describe, it, expect } from 'vitest';
import { parseTargetAnalysis, scaleToMax } from './target-photo';

describe('scaleToMax', () => {
  it('keeps small images unchanged', () => {
    expect(scaleToMax(800, 600, 1920)).toEqual({ width: 800, height: 600 });
  });

  it('downscales when longest side exceeds maxSide', () => {
    const r = scaleToMax(4000, 3000, 1920);
    expect(r.width).toBe(1920);
    expect(r.height).toBe(1440);
  });

  it('handles portrait orientation', () => {
    const r = scaleToMax(2400, 4000, 1920);
    expect(r.height).toBe(1920);
    expect(r.width).toBe(1152);
  });
});

describe('parseTargetAnalysis', () => {
  const validJson = JSON.stringify({
    groupSizeMm: 22,
    groupSizeMoa: 1.5,
    groupSizeMrad: 0.44,
    centerOffsetXmm: 5,
    centerOffsetYmm: -8,
    correctionMoa: { horizontal: 0.34, vertical: -0.55 },
    correctionMrad: { horizontal: 0.1, vertical: -0.16 },
    shotCount: 5,
    confidence: 0.87,
    notes: 'Groupement serré, dérive vers la droite.',
    warnings: [],
  });

  it('parses a valid JSON', () => {
    const r = parseTargetAnalysis(validJson);
    expect(r).not.toBeNull();
    expect(r?.groupSizeMm).toBe(22);
    expect(r?.correctionMoa.vertical).toBe(-0.55);
    expect(r?.shotCount).toBe(5);
    expect(r?.confidence).toBeCloseTo(0.87);
  });

  it('parses JSON inside markdown fences', () => {
    const fenced = '```json\n' + validJson + '\n```';
    const r = parseTargetAnalysis(fenced);
    expect(r).not.toBeNull();
    expect(r?.groupSizeMm).toBe(22);
  });

  it('returns null on invalid JSON', () => {
    expect(parseTargetAnalysis('not json at all')).toBeNull();
    expect(parseTargetAnalysis('')).toBeNull();
    expect(parseTargetAnalysis('{ "incomplete": ')).toBeNull();
  });

  it('returns null when minimal shape is missing', () => {
    expect(parseTargetAnalysis('{"foo": "bar"}')).toBeNull();
  });

  it('clamps confidence to [0, 1]', () => {
    const a = parseTargetAnalysis('{"confidence": 2, "groupSizeMm": 10}');
    const b = parseTargetAnalysis('{"confidence": -0.5, "groupSizeMm": 10}');
    expect(a?.confidence).toBe(1);
    expect(b?.confidence).toBe(0);
  });

  it('coerces missing nested fields into safe defaults', () => {
    const r = parseTargetAnalysis('{"groupSizeMm": 18, "confidence": 0.4}');
    expect(r?.correctionMoa).toEqual({ horizontal: 0, vertical: 0 });
    expect(r?.warnings).toEqual([]);
    expect(r?.shotCount).toBeNull();
  });
});
