import React, { useState, useCallback } from 'react';
import { ChevronDown, ChevronRight, Bluetooth, AlertTriangle, Battery, RefreshCw, Trash2, HelpCircle, Sparkles, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useI18n } from '@/lib/i18n';
import {
  diagnoseBleDevice,
  isWebBluetoothSupported,
  type BleDeviceDiagnostic,
} from '@/lib/chrono/fx-radar-ble';
import {
  guessFxModel,
  bucketConfidence,
  type FxModelGuess,
  type FxModelSignal,
} from '@/lib/chrono/fx-model-heuristic';

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
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string };
      // User cancelled the picker — silent.
      if (e?.name === 'NotFoundError') {
        return;
      }
      setError(e?.message ?? String(err));
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
  };

  if (!supported) return null;

  // Translation helper for signal codes — keeps the JSX terse.
  const signalLabel = (s: FxModelSignal): string => {
    const key = `chrono.diag.fxGuess.signal.${s.code}` as Parameters<typeof t>[0];
    return t(key);
  };

  const modelLabel = (g: FxModelGuess): string => {
    if (g.model === 'fx-radar') return t('chrono.diag.fxGuess.modelRadar');
    if (g.model === 'fx-chrono') return t('chrono.diag.fxGuess.modelChrono');
    return t('chrono.diag.fxGuess.modelUnknown');
  };

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
        <>
        <ul className="space-y-2" data-testid="chrono-ble-device-list">
          {devices.map((d) => {
            const isOpen = expanded.has(d.id);
            const guess = guessFxModel(d);
            const bucket = bucketConfidence(guess.confidence);
            const showGuess = guess.model !== 'unknown';
            const bucketClass =
              bucket === 'high'
                ? 'bg-primary/15 text-primary border-primary/40'
                : bucket === 'medium'
                  ? 'bg-accent/15 text-accent-foreground border-accent/40'
                  : 'bg-muted text-muted-foreground border-border';
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
                      {showGuess && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Badge
                              variant="outline"
                              className={`text-[9px] px-1.5 py-0 h-4 inline-flex items-center gap-0.5 cursor-help ${bucketClass}`}
                              onClick={(e) => e.stopPropagation()}
                              data-testid={`chrono-ble-guess-${d.id}`}
                            >
                              <Sparkles className="h-2.5 w-2.5" />
                              {t('chrono.diag.fxGuess.probable')}: {modelLabel(guess)}
                              <HelpCircle className="h-2.5 w-2.5 opacity-60" />
                            </Badge>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-72 text-xs space-y-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="space-y-1">
                              <p className="font-semibold">
                                {modelLabel(guess)}{' '}
                                <span className="font-normal text-muted-foreground">
                                  ({Math.round(guess.confidence * 100)}%)
                                </span>
                              </p>
                              <p className="text-muted-foreground">
                                {t('chrono.diag.fxGuess.disclaimer')}
                              </p>
                            </div>
                            {guess.signals.length > 0 && (
                              <div className="space-y-1">
                                <p className="font-medium text-[11px]">
                                  {t('chrono.diag.fxGuess.signalsTitle')}
                                </p>
                                <ul className="space-y-0.5">
                                  {guess.signals.map((s, i) => (
                                    <li
                                      key={`${s.code}-${i}`}
                                      className="flex items-start justify-between gap-2 text-[11px]"
                                    >
                                      <span className="text-foreground">
                                        {signalLabel(s)}
                                      </span>
                                      <span
                                        className={`font-mono shrink-0 ${
                                          s.weight >= 0
                                            ? 'text-primary'
                                            : 'text-destructive'
                                        }`}
                                      >
                                        {s.weight >= 0 ? '+' : ''}
                                        {s.weight.toFixed(2)}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </PopoverContent>
                        </Popover>
                      )}
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
        <div className="pt-1 flex justify-center">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleScan}
            disabled={scanning}
            data-testid="chrono-ble-retry-btn"
            className="gap-1.5"
          >
            <RotateCw className={`h-3.5 w-3.5 ${scanning ? 'animate-spin' : ''}`} />
            {scanning ? t('chrono.diag.scanning') : t('chrono.diag.retry')}
          </Button>
        </div>
        </>
      )}
    </section>
  );
}