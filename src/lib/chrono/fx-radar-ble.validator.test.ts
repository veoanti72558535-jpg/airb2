import { describe, it, expect } from 'vitest';
import {
  validateFxRadarCandidate,
  type BleDeviceDiagnostic,
} from './fx-radar-ble';

function makeSnap(over: Partial<BleDeviceDiagnostic> = {}): BleDeviceDiagnostic {
  return {
    id: 'x', name: '', connected: true, scannedAt: '2026-04-24T00:00:00Z',
    services: [], ...over,
  };
}

describe('validateFxRadarCandidate', () => {
  it('accepts a device exposing a known FX service UUID', () => {
    const v = validateFxRadarCandidate(
      makeSnap({
        name: 'Whatever',
        services: [{
          uuid: '0000fff0-0000-1000-8000-00805f9b34fb',
          characteristics: [],
        }],
      }),
    );
    expect(v.ok).toBe(true);
    expect(v.score).toBeGreaterThanOrEqual(3);
  });

  it('accepts a device named FX Radar with a notifiable characteristic', () => {
    const v = validateFxRadarCandidate(
      makeSnap({
        name: 'FX Radar',
        services: [{
          uuid: '0000aaaa-0000-1000-8000-00805f9b34fb',
          characteristics: [{
            uuid: '0000bbbb-0000-1000-8000-00805f9b34fb',
            properties: { read: false, write: false, writeWithoutResponse: false, notify: true, indicate: false },
          }],
        }],
      }),
    );
    expect(v.ok).toBe(true);
  });

  it('rejects an unrelated device with no FX hint', () => {
    const v = validateFxRadarCandidate(
      makeSnap({
        name: 'Random Headset',
        services: [{
          uuid: '0000180a-0000-1000-8000-00805f9b34fb',
          characteristics: [],
        }],
      }),
    );
    expect(v.ok).toBe(false);
    expect(v.reasons).toContain('no-known-fx-service-uuid');
    expect(v.reasons).toContain('no-notifiable-characteristic');
  });

  it('rejects an unnamed device with no services', () => {
    const v = validateFxRadarCandidate(makeSnap());
    expect(v.ok).toBe(false);
    expect(v.reasons).toContain('unnamed-device');
  });

  it('surfaces an enumeration error in reasons', () => {
    const v = validateFxRadarCandidate(
      makeSnap({ error: 'GATT timeout', name: 'FX Radar' }),
    );
    expect(v.reasons.some((r) => r.startsWith('enumeration failed:'))).toBe(true);
  });
});