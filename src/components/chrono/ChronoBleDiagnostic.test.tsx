import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nProvider } from '@/lib/i18n';
import { ThemeProvider } from '@/lib/theme';
import ChronoBleDiagnostic from './ChronoBleDiagnostic';
import * as bleModule from '@/lib/chrono/fx-radar-ble';
import type { BleDeviceDiagnostic } from '@/lib/chrono/fx-radar-ble';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

function renderWith() {
  return render(
    <ThemeProvider>
      <I18nProvider>
        <ChronoBleDiagnostic />
      </I18nProvider>
    </ThemeProvider>,
  );
}

function snapshot(over: Partial<BleDeviceDiagnostic> = {}): BleDeviceDiagnostic {
  return {
    id: 'dev-abc',
    name: 'My Device',
    connected: true,
    scannedAt: '2026-04-24T08:00:00Z',
    services: [
      {
        uuid: '0000fff0-0000-1000-8000-00805f9b34fb',
        characteristics: [
          {
            uuid: '0000fff1-0000-1000-8000-00805f9b34fb',
            properties: {
              read: false, write: false, writeWithoutResponse: false,
              notify: true, indicate: false,
            },
          },
        ],
      },
    ],
    ...over,
  };
}

beforeEach(() => {
  // Stub Web Bluetooth support detection.
  vi.spyOn(bleModule, 'isWebBluetoothSupported').mockReturnValue(true);
});

describe('ChronoBleDiagnostic', () => {
  it('renders nothing when Web Bluetooth is unsupported', () => {
    vi.spyOn(bleModule, 'isWebBluetoothSupported').mockReturnValue(false);
    const { container } = renderWith();
    expect(container.firstChild).toBeNull();
  });

  it('shows the empty state and a scan button initially', () => {
    renderWith();
    expect(screen.getByTestId('chrono-ble-scan-btn')).toBeInTheDocument();
    expect(screen.getByText(/no device scanned|aucun device scanné/i)).toBeInTheDocument();
  });

  it('lists the scanned device with its name, status and battery', async () => {
    vi.spyOn(bleModule, 'diagnoseBleDevice').mockResolvedValue(
      snapshot({ batteryPct: 87 }),
    );
    renderWith();
    fireEvent.click(screen.getByTestId('chrono-ble-scan-btn'));
    await waitFor(() =>
      expect(screen.getByTestId('chrono-ble-device-dev-abc')).toBeInTheDocument(),
    );
    expect(screen.getByText('My Device')).toBeInTheDocument();
    expect(screen.getByText('87%')).toBeInTheDocument();
    // Service UUID is shown when expanded by default.
    expect(screen.getByText(/0000fff0-/)).toBeInTheDocument();
  });

  it('keeps multiple scanned devices in the list (deduped by id)', async () => {
    const stub = vi
      .spyOn(bleModule, 'diagnoseBleDevice')
      .mockResolvedValueOnce(snapshot({ id: 'dev-1', name: 'Device A' }))
      .mockResolvedValueOnce(snapshot({ id: 'dev-2', name: 'Device B' }))
      .mockResolvedValueOnce(snapshot({ id: 'dev-1', name: 'Device A renamed' }));

    renderWith();
    const btn = screen.getByTestId('chrono-ble-scan-btn');

    fireEvent.click(btn);
    await waitFor(() => screen.getByTestId('chrono-ble-device-dev-1'));
    fireEvent.click(btn);
    await waitFor(() => screen.getByTestId('chrono-ble-device-dev-2'));
    fireEvent.click(btn);
    await waitFor(() => screen.getByText('Device A renamed'));

    // dev-1 must not be duplicated (`-list` wrapper excluded).
    expect(screen.getAllByTestId(/^chrono-ble-device-dev-/)).toHaveLength(2);
    expect(stub).toHaveBeenCalledTimes(3);
  });

  it('silently ignores user cancelling the picker (NotFoundError)', async () => {
    vi.spyOn(bleModule, 'diagnoseBleDevice').mockRejectedValue(
      Object.assign(new Error('cancelled'), { name: 'NotFoundError' }),
    );
    renderWith();
    fireEvent.click(screen.getByTestId('chrono-ble-scan-btn'));
    await waitFor(() =>
      expect(screen.getByTestId('chrono-ble-scan-btn')).not.toBeDisabled(),
    );
    // No error banner.
    expect(screen.queryByText(/cancelled/i)).not.toBeInTheDocument();
  });

  it('surfaces an error when the scan fails for a real reason', async () => {
    vi.spyOn(bleModule, 'diagnoseBleDevice').mockRejectedValue(
      new Error('GATT server unavailable'),
    );
    renderWith();
    fireEvent.click(screen.getByTestId('chrono-ble-scan-btn'));
    await waitFor(() =>
      expect(screen.getByText(/GATT server unavailable/)).toBeInTheDocument(),
    );
  });
});