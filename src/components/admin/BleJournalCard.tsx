import { useState, useCallback } from 'react';
import { Bluetooth, Download, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n';
import {
  isWebBluetoothSupported,
  connectFxRadar,
  discoverServices,
} from '@/lib/chrono/fx-radar-ble';
import type { BleDiscoveryLog } from '@/lib/chrono/fx-radar-ble';

export function BleJournalCard() {
  const { t } = useI18n();
  const supported = isWebBluetoothSupported();
  const [scanning, setScanning] = useState(false);
  const [logs, setLogs] = useState<BleDiscoveryLog[]>([]);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScan = useCallback(async () => {
    setScanning(true);
    setError(null);
    setLogs([]);
    setDeviceName(null);
    try {
      const device = await connectFxRadar();
      setDeviceName(device.name ?? device.id);
      const discovered = await discoverServices(device);
      setLogs(discovered);
      device.gatt?.disconnect();
    } catch (err: any) {
      if (err?.name !== 'NotFoundError') {
        setError(err?.message ?? String(err));
      }
    } finally {
      setScanning(false);
    }
  }, []);

  const exportJson = useCallback(() => {
    const payload = { device: deviceName, discoveredAt: new Date().toISOString(), services: logs };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ble-discovery-${new Date().toISOString().slice(0, 19).replace(/:/g, '')}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [logs, deviceName]);

  const totalChars = logs.reduce((n, l) => n + l.characteristics.length, 0);

  return (
    <div className="surface-elevated p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-md bg-primary/10 text-primary shrink-0">
          <Bluetooth className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium">{t('admin.ble.title' as any) || 'BLE Journal'}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {t('admin.ble.desc' as any) || 'Scan a BLE device and list all GATT services/characteristics for diagnosis'}
          </div>
        </div>
      </div>

      {!supported && (
        <div className="flex items-center gap-2 p-2 rounded bg-destructive/10 text-destructive text-xs">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          {t('chrono.unsupported')}
        </div>
      )}

      {supported && (
        <Button size="sm" variant="outline" onClick={handleScan} disabled={scanning}>
          {scanning ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Bluetooth className="h-4 w-4 mr-1" />}
          {scanning
            ? (t('chrono.scanning') || 'Scanning...')
            : (t('admin.ble.scan' as any) || 'Scan device')}
        </Button>
      )}

      {error && (
        <div className="flex items-center gap-2 p-2 rounded bg-destructive/10 text-destructive text-xs">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          {error}
        </div>
      )}

      {logs.length > 0 && (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            {deviceName && (
              <Badge variant="secondary" className="text-xs font-mono">{deviceName}</Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {logs.length} service(s) · {totalChars} characteristic(s)
            </span>
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-3 py-1.5 text-left font-medium">Service UUID</th>
                  <th className="px-3 py-1.5 text-left font-medium">Characteristics</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.service} className="border-t border-border align-top">
                    <td className="px-3 py-1.5 font-mono text-primary break-all">{log.service}</td>
                    <td className="px-3 py-1.5">
                      {log.characteristics.length === 0 ? (
                        <span className="text-muted-foreground italic">—</span>
                      ) : (
                        <ul className="space-y-0.5">
                          {log.characteristics.map((c) => (
                            <li key={c} className="font-mono text-muted-foreground break-all">{c}</li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button size="sm" variant="outline" onClick={exportJson}>
            <Download className="h-4 w-4 mr-1" />
            {t('admin.ble.exportJson' as any) || 'Export UUIDs JSON'}
          </Button>
        </>
      )}
    </div>
  );
}