/// <reference types="web-bluetooth" />
/**
 * FX Radar Chronograph — Web Bluetooth LE service.
 *
 * The exact BLE UUIDs for the FX Radar are not publicly documented with
 * certainty. This module uses a DISCOVERY strategy: it connects to any
 * device whose name contains "FX" and enumerates all services/characteristics
 * to find one that emits velocity data.
 *
 * Known candidate UUIDs (from community reverse-engineering):
 *   Service:        0000fff0-0000-1000-8000-00805f9b34fb
 *   Characteristic: 0000fff1-0000-1000-8000-00805f9b34fb
 *
 * If discovery finds different UUIDs, they are logged to console for
 * identification during the first real-device test.
 */

// Candidate UUIDs — will be tried first, then full discovery as fallback
const CANDIDATE_SERVICE = '0000fff0-0000-1000-8000-00805f9b34fb';
const CANDIDATE_CHAR    = '0000fff1-0000-1000-8000-00805f9b34fb';

/** localStorage key for the last-paired FX Radar device id. */
const SAVED_DEVICE_KEY = 'fx_radar_device_id';
/** localStorage key for the last-paired FX Radar device name (display only). */
const SAVED_DEVICE_NAME_KEY = 'fx_radar_device_name';

export interface SavedFxRadarDevice {
  id: string;
  name: string | null;
}

/** Read the previously-saved FX Radar device id, if any. */
export function getSavedFxRadarDevice(): SavedFxRadarDevice | null {
  try {
    const id = localStorage.getItem(SAVED_DEVICE_KEY);
    if (!id) return null;
    return { id, name: localStorage.getItem(SAVED_DEVICE_NAME_KEY) };
  } catch {
    return null;
  }
}

/** Persist the chosen FX Radar device for future silent reconnects. */
export function saveFxRadarDevice(device: BluetoothDevice): void {
  try {
    localStorage.setItem(SAVED_DEVICE_KEY, device.id);
    if (device.name) {
      localStorage.setItem(SAVED_DEVICE_NAME_KEY, device.name);
    } else {
      localStorage.removeItem(SAVED_DEVICE_NAME_KEY);
    }
  } catch {
    // ignore persistence errors (private mode, quota)
  }
}

/** Forget the saved FX Radar device (next connect will show the picker again). */
export function forgetSavedFxRadarDevice(): void {
  try {
    localStorage.removeItem(SAVED_DEVICE_KEY);
    localStorage.removeItem(SAVED_DEVICE_NAME_KEY);
  } catch {
    // ignore
  }
}

/**
 * Try to silently reconnect to the previously-paired FX Radar without
 * showing the chooser. Requires `navigator.bluetooth.getDevices()` (Chrome
 * desktop / Android with the experimental Web Bluetooth flag, or Bluetooth
 * permissions already granted). Returns null if unavailable, no saved id,
 * or the device is not currently in range / no longer authorized.
 */
export async function tryReconnectSavedFxRadar(): Promise<BluetoothDevice | null> {
  const saved = getSavedFxRadarDevice();
  if (!saved) return null;
  if (typeof navigator === 'undefined' || !navigator.bluetooth) return null;
  // getDevices() may not exist in all Chromium versions
  const getDevices = (navigator.bluetooth as unknown as {
    getDevices?: () => Promise<BluetoothDevice[]>;
  }).getDevices;
  if (typeof getDevices !== 'function') return null;
  try {
    const devices = await getDevices.call(navigator.bluetooth);
    const match = devices.find(d => d.id === saved.id);
    if (!match) return null;
    // Try to connect GATT silently. If the device is out of range this throws.
    await match.gatt?.connect();
    return match;
  } catch (err) {
    console.info('[FX Radar] Silent reconnect failed:', err);
    return null;
  }
}

export type BleDataFormat = 'float32' | 'uint16' | 'uint8' | 'auto';
export type BleEndian = 'little' | 'big';

export interface BleParseConfig {
  format: BleDataFormat;
  endian: BleEndian;
  /** Divisor applied after reading raw value (e.g. 10 for tenths of m/s) */
  divisor: number;
}

export const DEFAULT_BLE_PARSE_CONFIG: BleParseConfig = {
  format: 'auto',
  endian: 'little',
  divisor: 1,
};

export function parseVelocityValue(value: DataView, config: BleParseConfig): number | null {
  const le = config.endian === 'little';
  let raw: number;

  if (config.format === 'auto') {
    if (value.byteLength >= 4) {
      raw = value.getFloat32(0, le);
    } else if (value.byteLength >= 2) {
      raw = value.getUint16(0, le) / 10;
    } else {
      raw = value.getUint8(0);
    }
  } else if (config.format === 'float32') {
    if (value.byteLength < 4) return null;
    raw = value.getFloat32(0, le);
  } else if (config.format === 'uint16') {
    if (value.byteLength < 2) return null;
    raw = value.getUint16(0, le);
  } else {
    raw = value.getUint8(0);
  }

  const velocity = config.divisor !== 1 && config.format !== 'auto'
    ? raw / config.divisor
    : (config.format === 'auto' ? raw : raw);

  if (velocity > 0 && velocity < 500) return velocity;
  return null;
}

export interface BleDiscoveryLog {
  service: string;
  characteristics: string[];
}

export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined'
    && 'bluetooth' in navigator
    && typeof navigator.bluetooth?.requestDevice === 'function'
    && window.isSecureContext === true;
}

export async function connectFxRadar(): Promise<BluetoothDevice> {
  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: [
      CANDIDATE_SERVICE,
      '00001523-1212-efde-1523-785feabcd123',
      'battery_service',
      'generic_access',
    ],
  });
  return device;
}

/**
 * Discover all GATT services and characteristics on the device.
 * Useful for first-time identification of the correct UUIDs.
 */
export async function discoverServices(
  device: BluetoothDevice,
): Promise<BleDiscoveryLog[]> {
  const server = device.gatt;
  if (!server || !server.connected) {
    await server?.connect();
  }
  const gatt = device.gatt!;
  if (!gatt.connected) await gatt.connect();

  const services = await gatt.getPrimaryServices();
  const logs: BleDiscoveryLog[] = [];

  for (const svc of services) {
    const chars = await svc.getCharacteristics();
    const entry: BleDiscoveryLog = {
      service: svc.uuid,
      characteristics: chars.map(c => c.uuid),
    };
    logs.push(entry);
    console.info('[FX Radar] Service:', svc.uuid,
      'Characteristics:', entry.characteristics.join(', '));
  }
  return logs;
}

/**
 * Start listening for velocity notifications.
 * Tries the candidate characteristic first; if not found, runs full discovery.
 *
 * Returns a stop() function to unsubscribe.
 */
export async function startVelocityStream(
  device: BluetoothDevice,
  onVelocity: (velocityMs: number) => void,
  onError: (error: Error) => void,
  config: BleParseConfig = DEFAULT_BLE_PARSE_CONFIG,
): Promise<() => void> {
  try {
    const gatt = device.gatt!;
    if (!gatt.connected) await gatt.connect();

    let characteristic: BluetoothRemoteGATTCharacteristic | null = null;

    // Try candidate UUID first
    try {
      const service = await gatt.getPrimaryService(CANDIDATE_SERVICE);
      characteristic = await service.getCharacteristic(CANDIDATE_CHAR);
      console.info('[FX Radar] Using candidate characteristic', CANDIDATE_CHAR);
    } catch {
      console.warn('[FX Radar] Candidate UUID not found, running discovery...');
      const logs = await discoverServices(device);
      // Try to find any notifiable characteristic
      for (const log of logs) {
        const svc = await gatt.getPrimaryService(log.service);
        for (const charUuid of log.characteristics) {
          const c = await svc.getCharacteristic(charUuid);
          if (c.properties.notify) {
            characteristic = c;
            console.info('[FX Radar] Using discovered characteristic', charUuid,
              'from service', log.service);
            break;
          }
        }
        if (characteristic) break;
      }
    }

    if (!characteristic) {
      throw new Error('No notifiable characteristic found on FX Radar');
    }

    const handler = (event: Event) => {
      const value = (event.target as BluetoothRemoteGATTCharacteristic).value;
      if (!value) return;
      const velocity = parseVelocityValue(value, config);
      if (velocity !== null) {
        onVelocity(velocity);
      } else {
        console.warn('[FX Radar] Unexpected velocity value:',
          'raw bytes:', new Uint8Array(value.buffer));
      }
    };

    characteristic.addEventListener('characteristicvaluechanged', handler);
    await characteristic.startNotifications();

    // Disconnection listener
    const onDisconnect = () => {
      onError(new Error('FX Radar disconnected'));
    };
    device.addEventListener('gattserverdisconnected', onDisconnect);

    // Return stop function
    return () => {
      characteristic!.removeEventListener('characteristicvaluechanged', handler);
      device.removeEventListener('gattserverdisconnected', onDisconnect);
      characteristic!.stopNotifications().catch(() => {});
      gatt.disconnect();
    };
  } catch (err) {
    onError(err instanceof Error ? err : new Error(String(err)));
    return () => {};
  }
}

export async function disconnect(device: BluetoothDevice): Promise<void> {
  try {
    device.gatt?.disconnect();
  } catch {
    // ignore
  }
}