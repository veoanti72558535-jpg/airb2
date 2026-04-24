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
  // Always start without a saved default and clear any previous spies.
  try { localStorage.clear(); } catch { /* noop */ }
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

  describe('FX guardrail when setting default device', () => {
    it('saves a valid FX device directly (known FX service UUID present)', async () => {
      vi.spyOn(bleModule, 'diagnoseBleDevice').mockResolvedValue(
        snapshot({ id: 'dev-fx', name: 'FX Radar' }),
      );
      renderWith();
      fireEvent.click(screen.getByTestId('chrono-ble-scan-btn'));
      await waitFor(() => screen.getByTestId('chrono-ble-device-dev-fx'));

      fireEvent.click(screen.getByTestId('chrono-ble-set-default-dev-fx'));

      // No guardrail panel should appear.
      expect(screen.queryByTestId('chrono-ble-guard-dev-fx')).toBeNull();
      // Saved badge + banner should now be visible.
      expect(screen.getByTestId('chrono-ble-saved-badge-dev-fx')).toBeInTheDocument();
      expect(screen.getByTestId('chrono-ble-default-banner')).toHaveTextContent(/FX Radar/);
      expect(localStorage.getItem('fx_radar_device_id')).toBe('dev-fx');
    });

    it('blocks save and shows guardrail panel for a non-FX device', async () => {
      vi.spyOn(bleModule, 'diagnoseBleDevice').mockResolvedValue(
        snapshot({
          id: 'dev-headset',
          name: 'Random Headset',
          services: [
            {
              uuid: '0000180a-0000-1000-8000-00805f9b34fb', // device_information
              characteristics: [],
            },
          ],
        }),
      );
      renderWith();
      fireEvent.click(screen.getByTestId('chrono-ble-scan-btn'));
      await waitFor(() => screen.getByTestId('chrono-ble-device-dev-headset'));

      fireEvent.click(screen.getByTestId('chrono-ble-set-default-dev-headset'));

      // Guardrail must appear and nothing must be persisted yet.
      expect(screen.getByTestId('chrono-ble-guard-dev-headset')).toBeInTheDocument();
      expect(localStorage.getItem('fx_radar_device_id')).toBeNull();
      expect(screen.queryByTestId('chrono-ble-saved-badge-dev-headset')).toBeNull();
    });

    it('cancelling the guardrail leaves no default saved', async () => {
      vi.spyOn(bleModule, 'diagnoseBleDevice').mockResolvedValue(
        snapshot({ id: 'dev-x', name: 'Watch', services: [] }),
      );
      renderWith();
      fireEvent.click(screen.getByTestId('chrono-ble-scan-btn'));
      await waitFor(() => screen.getByTestId('chrono-ble-device-dev-x'));

      fireEvent.click(screen.getByTestId('chrono-ble-set-default-dev-x'));
      expect(screen.getByTestId('chrono-ble-guard-dev-x')).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('chrono-ble-guard-cancel-dev-x'));

      expect(screen.queryByTestId('chrono-ble-guard-dev-x')).toBeNull();
      expect(localStorage.getItem('fx_radar_device_id')).toBeNull();
    });

    it('forcing through the guardrail persists the device with a destructive button', async () => {
      vi.spyOn(bleModule, 'diagnoseBleDevice').mockResolvedValue(
        snapshot({ id: 'dev-x', name: 'Watch', services: [] }),
      );
      renderWith();
      fireEvent.click(screen.getByTestId('chrono-ble-scan-btn'));
      await waitFor(() => screen.getByTestId('chrono-ble-device-dev-x'));

      fireEvent.click(screen.getByTestId('chrono-ble-set-default-dev-x'));
      fireEvent.click(screen.getByTestId('chrono-ble-guard-force-dev-x'));

      expect(localStorage.getItem('fx_radar_device_id')).toBe('dev-x');
      expect(screen.getByTestId('chrono-ble-saved-badge-dev-x')).toBeInTheDocument();
    });

    it('forget action clears the saved default', async () => {
      vi.spyOn(bleModule, 'diagnoseBleDevice').mockResolvedValue(
        snapshot({ id: 'dev-fx2', name: 'FX Radar 2' }),
      );
      renderWith();
      fireEvent.click(screen.getByTestId('chrono-ble-scan-btn'));
      await waitFor(() => screen.getByTestId('chrono-ble-device-dev-fx2'));
      fireEvent.click(screen.getByTestId('chrono-ble-set-default-dev-fx2'));
      expect(localStorage.getItem('fx_radar_device_id')).toBe('dev-fx2');

      fireEvent.click(screen.getByTestId('chrono-ble-forget-default-btn'));
      expect(localStorage.getItem('fx_radar_device_id')).toBeNull();
      expect(screen.queryByTestId('chrono-ble-default-banner')).toBeNull();
    });
  });
});