import React, { useState, useCallback, useMemo } from 'react';
import {
  ChevronDown, ChevronRight, Bluetooth, AlertTriangle, Battery,
  RefreshCw, Trash2, CheckCircle2, XCircle, Activity, Star, ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n';
import {
  diagnoseBleDevice,
  isWebBluetoothSupported,
  validateFxRadarCandidate,
  saveFxRadarDeviceById,
  forgetSavedFxRadarDevice,
  getSavedFxRadarDevice,
  type BleDeviceDiagnostic,
  type FxRadarValidation,
} from '@/lib/chrono/fx-radar-ble';
import { toast } from 'sonner';

type LastGattState =
  | { kind: 'idle' }
  | { kind: 'connected'; deviceName: string; at: string }
  | { kind: 'disconnected'; deviceName: string; at: string }
  | { kind: 'error'; message: string; at: string };

/**
 * Diagnostic BLE — affiche les devices scannés successivement par
 * l'utilisateur (nom, id, statut connexion, services + caractéristiques)
 * pour aider à identifier un FX Radar mal nommé ou un peripheral
 * concurrent.
 *
 * Limites Web Bluetooth honnêtement surfacées :
 *  - le RSSI n'est PAS exposé pour un device déjà connecté ;
 *  - il n'existe pas d'API de scan passif → l'utilisateur doit
 *    sélectionner manuellement chaque device dans le picker natif.
 */
export default function ChronoBleDiagnostic() {
  const { t } = useI18n();
  const supported = isWebBluetoothSupported();
  const [devices, setDevices] = useState<BleDeviceDiagnostic[]>([]);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string>('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [successCount, setSuccessCount] = useState(0);
  const [failCount, setFailCount] = useState(0);
  const [lastState, setLastState] = useState<LastGattState>({ kind: 'idle' });
  const [savedId, setSavedId] = useState<string | null>(
    () => getSavedFxRadarDevice()?.id ?? null,
  );
  const [savedName, setSavedName] = useState<string | null>(
    () => getSavedFxRadarDevice()?.name ?? null,
  );
  /** Devices for which the user explicitly chose to bypass the FX guardrail. */
  const [forcePending, setForcePending] = useState<string | null>(null);

  /** Memoized validation per device — keyed by id. */
  const validations = useMemo(() => {
    const map = new Map<string, FxRadarValidation>();
    for (const d of devices) map.set(d.id, validateFxRadarCandidate(d));
    return map;
  }, [devices]);

  const handleScan = useCallback(async () => {
    setError('');
    setScanning(true);
    try {
      const snapshot = await diagnoseBleDevice();
      setDevices((prev) => {
        const others = prev.filter((d) => d.id !== snapshot.id);
        return [snapshot, ...others];
      });
      setExpanded((prev) => new Set(prev).add(snapshot.id));
      setSuccessCount((n) => n + 1);
      const label = snapshot.name || snapshot.id;
      setLastState(
        snapshot.connected
          ? { kind: 'connected', deviceName: label, at: snapshot.scannedAt }
          : { kind: 'disconnected', deviceName: label, at: snapshot.scannedAt },
      );
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string };
      // User cancelled the picker — silent.
      if (e?.name === 'NotFoundError') {
        return;
      }
      const msg = e?.message ?? String(err);
      setError(msg);
      setFailCount((n) => n + 1);
      setLastState({ kind: 'error', message: msg, at: new Date().toISOString() });
    } finally {
      setScanning(false);
    }
  }, []);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleClear = () => {
    setDevices([]);
    setExpanded(new Set());
    setError('');
    setSuccessCount(0);
    setFailCount(0);
    setLastState({ kind: 'idle' });
    setForcePending(null);
  };

  const persistDefault = useCallback(
    (d: BleDeviceDiagnostic) => {
      const ok = saveFxRadarDeviceById(d.id, d.name || null);
      if (!ok) {
        toast.error(t('chrono.diag.saveFailed'));
        return;
      }
      setSavedId(d.id);
      setSavedName(d.name || null);
      setForcePending(null);
      toast.success(t('chrono.diag.savedToast', { name: d.name || d.id }));
    },
    [t],
  );

  const handleSetDefault = useCallback(
    (d: BleDeviceDiagnostic) => {
      const v = validations.get(d.id);
      if (v && !v.ok) {
        // Guardrail: do NOT save silently. Surface the warning and ask the
        // user to explicitly confirm a force-save.
        setForcePending(d.id);
        return;
      }
      persistDefault(d);
    },
    [validations, persistDefault],
  );

  const handleForceDefault = useCallback(
    (d: BleDeviceDiagnostic) => {
      persistDefault(d);
    },
    [persistDefault],
  );

  const handleForget = useCallback(() => {
    forgetSavedFxRadarDevice();
    setSavedId(null);
    setSavedName(null);
    toast.success(t('chrono.diag.forgottenToast'));
  }, [t]);

  if (!supported) return null;

  return (
    <section
      className="surface-elevated p-4 space-y-3"
      data-testid="chrono-ble-diagnostic"
    >
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <Bluetooth className="h-4 w-4 text-primary" />
            {t('chrono.diag.title')}
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {t('chrono.diag.desc')}
          </p>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleScan}
            disabled={scanning}
            data-testid="chrono-ble-scan-btn"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 mr-1 ${scanning ? 'animate-spin' : ''}`}
            />
            {scanning ? t('chrono.diag.scanning') : t('chrono.diag.scan')}
          </Button>
          {devices.length > 0 && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleClear}
              data-testid="chrono-ble-clear-btn"
              aria-label={t('chrono.diag.clear')}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </header>

      {/* Compteurs + dernier état GATT */}
      <div
        className="flex flex-wrap items-center gap-1.5"
        data-testid="chrono-ble-stats"
      >
        <Badge
          variant="outline"
          className="text-[10px] px-1.5 py-0 h-5 inline-flex items-center gap-1 border-primary/40 text-primary"
          data-testid="chrono-ble-stat-success"
        >
          <CheckCircle2 className="h-3 w-3" />
          {t('chrono.diag.stats.success')}: {successCount}
        </Badge>
        <Badge
          variant="outline"
          className="text-[10px] px-1.5 py-0 h-5 inline-flex items-center gap-1 border-destructive/40 text-destructive"
          data-testid="chrono-ble-stat-fail"
        >
          <XCircle className="h-3 w-3" />
          {t('chrono.diag.stats.fail')}: {failCount}
        </Badge>
        <Badge
          variant="secondary"
          className="text-[10px] px-1.5 py-0 h-5 inline-flex items-center gap-1"
          data-testid="chrono-ble-stat-last"
        >
          <Activity className="h-3 w-3" />
          {t('chrono.diag.stats.lastState')}:{' '}
          {lastState.kind === 'idle' && (
            <span className="text-muted-foreground italic">
              {t('chrono.diag.stats.idle')}
            </span>
          )}
          {lastState.kind === 'connected' && (
            <span className="text-primary">
              {t('chrono.diag.connected')} · {lastState.deviceName}
            </span>
          )}
          {lastState.kind === 'disconnected' && (
            <span>
              {t('chrono.diag.disconnected')} · {lastState.deviceName}
            </span>
          )}
          {lastState.kind === 'error' && (
            <span className="text-destructive truncate max-w-[180px]">
              {t('chrono.diag.stats.error')} ·{' '}
              {lastState.message}
            </span>
          )}
        </Badge>
      </div>

      <p className="text-[10px] text-muted-foreground italic border-l-2 border-border pl-2">
        {t('chrono.diag.rssiNote')}
      </p>

      {error && (
        <div className="flex items-start gap-2 p-2 rounded bg-destructive/10 text-destructive text-xs">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {devices.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">
          {t('chrono.diag.empty')}
        </p>
      ) : (
        <ul className="space-y-2" data-testid="chrono-ble-device-list">
          {devices.map((d) => {
            const isOpen = expanded.has(d.id);
            return (
              <li
                key={d.id}
                className="rounded border border-border bg-muted/30"
                data-testid={`chrono-ble-device-${d.id}`}
              >
                <button
                  type="button"
                  onClick={() => toggleExpand(d.id)}
                  className="w-full flex items-start gap-2 p-2 text-left hover:bg-muted/60 rounded"
                  aria-expanded={isOpen}
                >
                  {isOpen ? (
                    <ChevronDown className="h-3.5 w-3.5 mt-0.5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 mt-0.5 text-muted-foreground" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">
                      {d.name || (
                        <span className="italic text-muted-foreground">
                          {t('chrono.diag.noName')}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground truncate">
                      {d.id}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <Badge
                        variant={d.connected ? 'default' : 'secondary'}
                        className="text-[9px] px-1.5 py-0 h-4"
                      >
                        {d.connected
                          ? t('chrono.diag.connected')
                          : t('chrono.diag.disconnected')}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1.5 py-0 h-4"
                      >
                        {t('chrono.diag.servicesCount', {
                          n: d.services.length,
                        })}
                      </Badge>
                      {typeof d.batteryPct === 'number' && (
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1.5 py-0 h-4 inline-flex items-center gap-0.5"
                        >
                          <Battery className="h-2.5 w-2.5" />
                          {d.batteryPct}%
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-border p-2 space-y-2">
                    {d.error && (
                      <div className="text-[11px] text-destructive flex items-start gap-1">
                        <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                        <span>{d.error}</span>
                      </div>
                    )}
                    {d.services.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground italic">
                        {t('chrono.diag.noServices')}
                      </p>
                    ) : (
                      <ul className="space-y-1.5">
                        {d.services.map((svc) => (
                          <li
                            key={svc.uuid}
                            className="text-[11px] font-mono"
                          >
                            <div className="text-foreground break-all">
                              <span className="text-muted-foreground">svc:</span>{' '}
                              {svc.uuid}
                            </div>
                            <ul className="ml-3 mt-0.5 space-y-0.5">
                              {svc.characteristics.map((c) => (
                                <li
                                  key={c.uuid}
                                  className="text-muted-foreground break-all"
                                >
                                  <span>↳ {c.uuid}</span>
                                  <span className="ml-2 text-[9px] uppercase tracking-wide">
                                    {[
                                      c.properties.read && 'R',
                                      c.properties.write && 'W',
                                      c.properties.writeWithoutResponse && 'Wnr',
                                      c.properties.notify && 'N',
                                      c.properties.indicate && 'I',
                                    ]
                                      .filter(Boolean)
                                      .join(' ') || '—'}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="text-[9px] text-muted-foreground">
                      {t('chrono.diag.scannedAt')}:{' '}
                      {new Date(d.scannedAt).toLocaleString()}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}