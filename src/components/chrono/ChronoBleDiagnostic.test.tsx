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
  // Reset the saved-default localStorage between tests.
  try {
    localStorage.removeItem('fx_radar_device_id');
    localStorage.removeItem('fx_radar_device_name');
  } catch {
    /* noop */
  }
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
      expect(screen.getAllByText(/GATT server unavailable/).length).toBeGreaterThan(0),
    );
  });

  it('increments success/fail counters and surfaces the last GATT state', async () => {
    const stub = vi
      .spyOn(bleModule, 'diagnoseBleDevice')
      .mockResolvedValueOnce(snapshot({ id: 'dev-ok-1', name: 'Radar OK' }))
      .mockRejectedValueOnce(new Error('GATT timeout'))
      .mockResolvedValueOnce(
        snapshot({ id: 'dev-ok-2', name: 'Radar OK 2', connected: false }),
      );

    renderWith();
    const btn = screen.getByTestId('chrono-ble-scan-btn');

    fireEvent.click(btn);
    await waitFor(() => screen.getByTestId('chrono-ble-device-dev-ok-1'));
    expect(screen.getByTestId('chrono-ble-stat-success')).toHaveTextContent('1');
    expect(screen.getByTestId('chrono-ble-stat-fail')).toHaveTextContent('0');
    expect(screen.getByTestId('chrono-ble-stat-last')).toHaveTextContent(/Radar OK/);

    fireEvent.click(btn);
    await waitFor(() =>
      expect(screen.getByTestId('chrono-ble-stat-fail')).toHaveTextContent('1'),
    );
    expect(screen.getByTestId('chrono-ble-stat-last')).toHaveTextContent(/GATT timeout/);

    fireEvent.click(btn);
    await waitFor(() => screen.getByTestId('chrono-ble-device-dev-ok-2'));
    expect(screen.getByTestId('chrono-ble-stat-success')).toHaveTextContent('2');
    expect(screen.getByTestId('chrono-ble-stat-last')).toHaveTextContent(/Radar OK 2/);

    expect(stub).toHaveBeenCalledTimes(3);
  });

  it('resets counters and last state when clearing the list', async () => {
    vi.spyOn(bleModule, 'diagnoseBleDevice').mockResolvedValue(snapshot());
    renderWith();
    fireEvent.click(screen.getByTestId('chrono-ble-scan-btn'));
    await waitFor(() =>
      expect(screen.getByTestId('chrono-ble-stat-success')).toHaveTextContent('1'),
    );
    fireEvent.click(screen.getByTestId('chrono-ble-clear-btn'));
    expect(screen.getByTestId('chrono-ble-stat-success')).toHaveTextContent('0');
    expect(screen.getByTestId('chrono-ble-stat-fail')).toHaveTextContent('0');
  });

  it('persists the device as default and shows a saved banner + per-row badge', async () => {
    vi.spyOn(bleModule, 'diagnoseBleDevice').mockResolvedValue(
      snapshot({ id: 'fx-1', name: 'FX Radar' }),
    );
    renderWith();

    // No banner before scanning.
    expect(screen.queryByTestId('chrono-ble-saved-banner')).toBeNull();

    fireEvent.click(screen.getByTestId('chrono-ble-scan-btn'));
    await waitFor(() => screen.getByTestId('chrono-ble-device-fx-1'));

    // Save button visible inside the (auto-expanded) panel.
    const saveBtn = screen.getByTestId('chrono-ble-save-fx-1');
    fireEvent.click(saveBtn);

    // localStorage updated.
    expect(localStorage.getItem('fx_radar_device_id')).toBe('fx-1');
    expect(localStorage.getItem('fx_radar_device_name')).toBe('FX Radar');

    // Banner + per-row badge appear.
    expect(screen.getByTestId('chrono-ble-saved-banner')).toBeInTheDocument();
    expect(screen.getByTestId('chrono-ble-device-fx-1-saved')).toBeInTheDocument();
    // Save button replaced by Forget button.
    expect(screen.queryByTestId('chrono-ble-save-fx-1')).toBeNull();
    expect(screen.getByTestId('chrono-ble-forget-fx-1')).toBeInTheDocument();
  });

  it('forgets the default device from the banner', async () => {
    // Pre-seed a saved default.
    localStorage.setItem('fx_radar_device_id', 'fx-old');
    localStorage.setItem('fx_radar_device_name', 'Old Radar');

    renderWith();
    const banner = screen.getByTestId('chrono-ble-saved-banner');
    expect(banner).toHaveTextContent('fx-old');

    fireEvent.click(screen.getByTestId('chrono-ble-forget-default-btn'));

    expect(localStorage.getItem('fx_radar_device_id')).toBeNull();
    expect(screen.queryByTestId('chrono-ble-saved-banner')).toBeNull();
  });
});