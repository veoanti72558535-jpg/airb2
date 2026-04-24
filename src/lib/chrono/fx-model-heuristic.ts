/**
 * Heuristic FX device-model detection from a BLE diagnostic snapshot.
 *
 * Pure function — NO network, NO BLE call. Operates only on the data
 * already collected by `diagnoseBleDevice()`.
 *
 * IMPORTANT — honesty over confidence: the FX Radar and FX Chrono GATT
 * UUIDs are not officially documented. The signals below come from
 * community reverse-engineering and from the candidate UUIDs the app
 * already uses for connection. We surface a "Probable" label with a
 * confidence score so the UI can never present this as authoritative.
 */
import type { BleDeviceDiagnostic } from './fx-radar-ble';

export type FxModel = 'fx-radar' | 'fx-chrono' | 'unknown';

export interface FxModelGuess {
  model: FxModel;
  /** 0–1 — never reaches 1 because GATT UUIDs are not officially confirmed. */
  confidence: number;
  /** Human-readable signals that contributed to the guess. */
  signals: FxModelSignal[];
}

export interface FxModelSignal {
  /** Stable code for i18n + tests. */
  code:
    | 'name-radar'
    | 'name-chrono'
    | 'name-fx-prefix'
    | 'svc-fff0'              // Nordic-style serial — used by both FX devices
    | 'svc-1523-nordic'       // Nordic UART (LBS) — seen on FX Chrono prototypes
    | 'svc-device-info'
    | 'svc-battery'
    | 'no-services';
  /** Weight contributed to the confidence (sign matters). */
  weight: number;
}

/** Names normalized for matching — all lowercase, no punctuation. */
function norm(s: string | undefined): string {
  return (s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

const RADAR_SVC_FFF0 = '0000fff0-0000-1000-8000-00805f9b34fb';
const NORDIC_LBS = '00001523-1212-efde-1523-785feabcd123';
const SVC_BATTERY = '0000180f-0000-1000-8000-00805f9b34fb';
const SVC_DEVICE_INFO = '0000180a-0000-1000-8000-00805f9b34fb';

/**
 * Inspect a diagnostic snapshot and return a model guess.
 * Returns `{ model: 'unknown', confidence: 0 }` if no signals match.
 */
export function guessFxModel(snapshot: BleDeviceDiagnostic): FxModelGuess {
  const signals: FxModelSignal[] = [];
  let radarScore = 0;
  let chronoScore = 0;

  const name = norm(snapshot.name);

  // ── Name signals (strongest available) ──
  if (name.includes('radar')) {
    radarScore += 0.6;
    signals.push({ code: 'name-radar', weight: 0.6 });
  } else if (name.includes('chrono')) {
    chronoScore += 0.6;
    signals.push({ code: 'name-chrono', weight: 0.6 });
  } else if (name.startsWith('fx')) {
    // "FX" prefix without further hint — slight bias toward Radar (more common)
    radarScore += 0.15;
    chronoScore += 0.1;
    signals.push({ code: 'name-fx-prefix', weight: 0.15 });
  }

  // ── Service signals ──
  const svcUuids = snapshot.services.map((s) => s.uuid.toLowerCase());

  if (svcUuids.length === 0) {
    signals.push({ code: 'no-services', weight: -0.2 });
  }

  if (svcUuids.includes(RADAR_SVC_FFF0)) {
    // Both devices may expose 0xFFF0; slightly favor Radar where it's most documented.
    radarScore += 0.25;
    chronoScore += 0.1;
    signals.push({ code: 'svc-fff0', weight: 0.25 });
  }

  if (svcUuids.includes(NORDIC_LBS)) {
    // Nordic LBS / UART seen on early FX Chrono firmware reports.
    chronoScore += 0.25;
    signals.push({ code: 'svc-1523-nordic', weight: 0.25 });
  }

  if (svcUuids.includes(SVC_BATTERY)) {
    // Both devices expose battery service — neutral but informative.
    radarScore += 0.05;
    chronoScore += 0.05;
    signals.push({ code: 'svc-battery', weight: 0.05 });
  }

  if (svcUuids.includes(SVC_DEVICE_INFO)) {
    radarScore += 0.05;
    chronoScore += 0.05;
    signals.push({ code: 'svc-device-info', weight: 0.05 });
  }

  // Cap at 0.85 — never claim certainty.
  const cap = (n: number) => Math.max(0, Math.min(0.85, n));
  radarScore = cap(radarScore);
  chronoScore = cap(chronoScore);

  if (radarScore === 0 && chronoScore === 0) {
    return { model: 'unknown', confidence: 0, signals };
  }

  if (radarScore >= chronoScore) {
    return { model: 'fx-radar', confidence: radarScore, signals };
  }
  return { model: 'fx-chrono', confidence: chronoScore, signals };
}

/** Confidence bucket for UI styling — kept here so the UI stays declarative. */
export type ConfidenceBucket = 'low' | 'medium' | 'high';

export function bucketConfidence(c: number): ConfidenceBucket {
  if (c < 0.3) return 'low';
  if (c < 0.6) return 'medium';
  return 'high';
}
