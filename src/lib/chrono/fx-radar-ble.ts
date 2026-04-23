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
    filters: [{ namePrefix: 'FX' }],
    optionalServices: [CANDIDATE_SERVICE],
    // acceptAllDevices + optionalServices is the fallback if filters fail
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
      // FX Radar typically sends velocity as a 16-bit or 32-bit float.
      // Try float32 first (4 bytes), fallback to uint16
      let velocity: number;
      if (value.byteLength >= 4) {
        velocity = value.getFloat32(0, true); // little-endian
      } else if (value.byteLength >= 2) {
        velocity = value.getUint16(0, true) / 10; // often tenths of m/s
      } else {
        velocity = value.getUint8(0);
      }
      if (velocity > 0 && velocity < 500) { // sanity: airgun range
        onVelocity(velocity);
      } else {
        console.warn('[FX Radar] Unexpected velocity value:', velocity,
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