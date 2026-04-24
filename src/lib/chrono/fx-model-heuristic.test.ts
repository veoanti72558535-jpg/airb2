import { describe, it, expect } from 'vitest';
import { guessFxModel, bucketConfidence } from './fx-model-heuristic';
import type { BleDeviceDiagnostic } from './fx-radar-ble';

const base = (overrides: Partial<BleDeviceDiagnostic>): BleDeviceDiagnostic => ({
  id: 'dev-1',
  name: '',
  connected: true,
  scannedAt: new Date('2025-01-01').toISOString(),
  services: [],
  ...overrides,
});

describe('guessFxModel', () => {
  it('returns unknown for an empty snapshot', () => {
    const r = guessFxModel(base({}));
    expect(r.model).toBe('unknown');
    expect(r.confidence).toBe(0);
    // Empty services should at least surface a no-services signal
    expect(r.signals.some(s => s.code === 'no-services')).toBe(true);
  });

  it('picks fx-radar when name contains "radar"', () => {
    const r = guessFxModel(base({ name: 'FX Radar' }));
    expect(r.model).toBe('fx-radar');
    expect(r.confidence).toBeGreaterThanOrEqual(0.5);
    expect(r.signals.some(s => s.code === 'name-radar')).toBe(true);
  });

  it('picks fx-chrono when name contains "chrono"', () => {
    const r = guessFxModel(base({ name: 'FX Chrono' }));
    expect(r.model).toBe('fx-chrono');
    expect(r.confidence).toBeGreaterThanOrEqual(0.5);
    expect(r.signals.some(s => s.code === 'name-chrono')).toBe(true);
  });

  it('biases toward fx-radar when only "FX" prefix is known', () => {
    const r = guessFxModel(base({ name: 'FX' }));
    expect(r.model).toBe('fx-radar');
    expect(r.signals.some(s => s.code === 'name-fx-prefix')).toBe(true);
  });

  it('combines name and service signals — radar', () => {
    const r = guessFxModel(base({
      name: 'FX Radar',
      services: [
        { uuid: '0000fff0-0000-1000-8000-00805f9b34fb', characteristics: [] },
        { uuid: '0000180f-0000-1000-8000-00805f9b34fb', characteristics: [] },
      ],
    }));
    expect(r.model).toBe('fx-radar');
    expect(r.confidence).toBeGreaterThan(0.6);
    const codes = r.signals.map(s => s.code);
    expect(codes).toContain('svc-fff0');
    expect(codes).toContain('svc-battery');
  });

  it('detects fx-chrono via Nordic LBS service alone', () => {
    const r = guessFxModel(base({
      services: [
        { uuid: '00001523-1212-efde-1523-785feabcd123', characteristics: [] },
      ],
    }));
    expect(r.model).toBe('fx-chrono');
    expect(r.signals.some(s => s.code === 'svc-1523-nordic')).toBe(true);
  });

  it('caps confidence below 0.85 (no certainty)', () => {
    const r = guessFxModel(base({
      name: 'FX Chrono',
      services: [
        { uuid: '0000fff0-0000-1000-8000-00805f9b34fb', characteristics: [] },
        { uuid: '00001523-1212-efde-1523-785feabcd123', characteristics: [] },
        { uuid: '0000180f-0000-1000-8000-00805f9b34fb', characteristics: [] },
        { uuid: '0000180a-0000-1000-8000-00805f9b34fb', characteristics: [] },
      ],
    }));
    expect(r.confidence).toBeLessThanOrEqual(0.85);
    expect(r.model).toBe('fx-chrono');
  });
});

describe('bucketConfidence', () => {
  it('classifies low/medium/high', () => {
    expect(bucketConfidence(0.1)).toBe('low');
    expect(bucketConfidence(0.4)).toBe('medium');
    expect(bucketConfidence(0.7)).toBe('high');
  });
});
