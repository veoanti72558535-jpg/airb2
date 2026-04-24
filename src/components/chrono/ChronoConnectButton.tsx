import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bluetooth, Loader2, AlertTriangle, Wifi, WifiOff, X, Info, CheckCircle2, Circle, XCircle } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import {
  isWebBluetoothSupported,
  connectFxRadar,
  startVelocityStream,
  disconnect,
  saveFxRadarDevice,
  forgetSavedFxRadarDevice,
  getSavedFxRadarDevice,
  tryReconnectSavedFxRadar,
} from '@/lib/chrono/fx-radar-ble';
import type {
  BleParseConfig,
  GattStage,
  GattStageEvent,
  GattStageStatus,
} from '@/lib/chrono/fx-radar-ble';
import { DEFAULT_BLE_PARSE_CONFIG } from '@/lib/chrono/fx-radar-ble';
import { detectWebBluetoothSupport } from '@/lib/chrono/web-bluetooth-support';
import WebBluetoothCompatGuide from './WebBluetoothCompatGuide';
import GattStageTimeline from './GattStageTimeline';

type BleState = 'unsupported' | 'disconnected' | 'scanning' | 'connected' | 'error';

/** Ordered list used to render the stage timeline. */
const STAGE_ORDER: GattStage[] = [
  'request-device',
  'connect-gatt',
  'discover-services',
  'find-characteristic',
  'start-notifications',
  'streaming',
];

interface ChronoConnectButtonProps {
  onVelocity: (v: number) => void;
  onStateChange?: (state: BleState) => void;
  bleConfig?: BleParseConfig;
}

export default function ChronoConnectButton({ onVelocity, onStateChange, bleConfig }: ChronoConnectButtonProps) {
  const { t } = useI18n();
  const support = useMemo(() => detectWebBluetoothSupport(), []);
  const [state, setState] = useState<BleState>(
    support.level === 'supported' || support.level === 'partial'
      ? 'disconnected'
      : 'unsupported',
  );
  const [error, setError] = useState<string>('');
  const [device, setDevice] = useState<BluetoothDevice | null>(null);
  const [stopFn, setStopFn] = useState<(() => void) | null>(null);
  const [savedName, setSavedName] = useState<string | null>(
    () => getSavedFxRadarDevice()?.name ?? null,
  );
  const autoTriedRef = useRef(false);
  /** Latest status per stage — drives the timeline UI. */
  const [stages, setStages] = useState<Record<GattStage, GattStageEvent | undefined>>(
    {} as Record<GattStage, GattStageEvent | undefined>,
  );

  const handleStage = useCallback((ev: GattStageEvent) => {
    setStages(prev => ({ ...prev, [ev.stage]: ev }));
  }, []);

  const resetStages = useCallback(() => {
    setStages({} as Record<GattStage, GattStageEvent | undefined>);
  }, []);

  const updateState = useCallback((s: BleState) => {
    setState(s);
    onStateChange?.(s);
  }, [onStateChange]);

  const startStream = useCallback(async (dev: BluetoothDevice) => {
    setDevice(dev);
    saveFxRadarDevice(dev);
    setSavedName(dev.name ?? null);
    const stop = await startVelocityStream(
      dev,
      (v) => onVelocity(v),
      (err) => {
        setError(err.message);
        updateState('error');
      },
      bleConfig ?? DEFAULT_BLE_PARSE_CONFIG,
      handleStage,
    );
    setStopFn(() => stop);
    updateState('connected');
  }, [bleConfig, onVelocity, updateState, handleStage]);

  const handleConnect = useCallback(async () => {
    resetStages();
    handleStage({
      stage: 'request-device',
      status: 'in-progress',
      at: new Date().toISOString(),
    });
    updateState('scanning');
    setError('');
    try {
      const dev = await connectFxRadar();
      handleStage({
        stage: 'request-device',
        status: 'ok',
        detail: dev.name ?? dev.id,
        at: new Date().toISOString(),
      });
      await startStream(dev);
    } catch (err: any) {
      if (err?.name === 'NotFoundError') {
        // User cancelled the picker
        handleStage({
          stage: 'request-device',
          status: 'error',
          detail: 'user-cancelled',
          at: new Date().toISOString(),
        });
        updateState('disconnected');
        return;
      }
      setError(err?.message ?? String(err));
      handleStage({
        stage: 'request-device',
        status: 'error',
        detail: err?.message ?? String(err),
        at: new Date().toISOString(),
      });
      updateState('error');
    }
  }, [startStream, updateState, handleStage, resetStages]);

  // On mount: attempt silent reconnect to the saved device, if any.
  useEffect(() => {
    if (autoTriedRef.current) return;
    autoTriedRef.current = true;
    if (!isWebBluetoothSupported()) return;
    if (!getSavedFxRadarDevice()) return;
    let cancelled = false;
    (async () => {
      updateState('scanning');
      try {
        const dev = await tryReconnectSavedFxRadar();
        if (cancelled) return;
        if (dev) {
          await startStream(dev);
        } else {
          updateState('disconnected');
        }
      } catch {
        if (!cancelled) updateState('disconnected');
      }
    })();
    return () => { cancelled = true; };
  }, [startStream, updateState]);

  const handleDisconnect = useCallback(async () => {
    stopFn?.();
    if (device) await disconnect(device);
    setDevice(null);
    setStopFn(null);
    updateState('disconnected');
    resetStages();
  }, [device, stopFn, updateState, resetStages]);

  const handleForget = useCallback(() => {
    forgetSavedFxRadarDevice();
    setSavedName(null);
  }, []);

  if (state === 'unsupported') {
    return <WebBluetoothCompatGuide support={support} />;
  }

  if (state === 'connected') {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Badge variant="default" className="bg-primary text-primary-foreground gap-1.5">
            <Wifi className="h-3 w-3" />
            {device?.name ?? savedName ?? t('chrono.connected')}
          </Badge>
          <Button variant="outline" size="sm" onClick={handleDisconnect}>
            <WifiOff className="h-4 w-4 mr-1" />
            {t('chrono.disconnect')}
          </Button>
        </div>
        <GattStageTimeline order={STAGE_ORDER} stages={stages} />
      </div>
    );
  }

  if (state === 'scanning') {
    return (
      <div className="flex flex-col gap-2">
        <Button disabled>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          {t('chrono.scanning')}
        </Button>
        {!savedName && (
          <div className="rounded-md border border-primary/30 bg-primary/5 p-2.5 text-xs flex items-start gap-2">
            <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
            <span className="text-foreground">
              {t('chrono.firstConnect.scanningHint')}
            </span>
          </div>
        )}
        <GattStageTimeline order={STAGE_ORDER} stages={stages} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* First-time onboarding: shown only when no device has been paired yet */}
      {!savedName && (
        <div
          className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs space-y-2"
          data-testid="ble-first-connect-help"
        >
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1 min-w-0">
              <p className="font-semibold text-foreground">
                {t('chrono.firstConnect.title')}
              </p>
              <p className="text-muted-foreground">
                {t('chrono.firstConnect.body')}
              </p>
            </div>
          </div>
          <ol className="ml-6 list-decimal space-y-0.5 text-muted-foreground">
            <li>{t('chrono.firstConnect.step1')}</li>
            <li>{t('chrono.firstConnect.step2')}</li>
            <li>{t('chrono.firstConnect.step3')}</li>
          </ol>
          <p className="ml-6 text-[11px] text-muted-foreground italic">
            {t('chrono.firstConnect.tip')}
          </p>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button onClick={handleConnect}>
          <Bluetooth className="h-4 w-4 mr-2" />
          {savedName ? t('chrono.reconnectSaved') : t('chrono.connect')}
        </Button>
        {savedName && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleForget}
            title={t('chrono.forgetDevice')}
            aria-label={t('chrono.forgetDevice')}
          >
            <X className="h-3 w-3 mr-1" />
            <span className="text-xs text-muted-foreground truncate max-w-[140px]">
              {savedName}
            </span>
          </Button>
        )}
      </div>
      {state === 'error' && (
        <>
          <div className="flex items-center gap-2 p-2 rounded bg-destructive/10 text-destructive text-xs">
            <AlertTriangle className="h-3 w-3 shrink-0" />
            <span className="flex-1">{error}</span>
            <Button variant="ghost" size="sm" className="ml-auto h-6 text-xs" onClick={handleConnect}>
              ↻
            </Button>
          </div>
          <GattStageTimeline order={STAGE_ORDER} stages={stages} error={error} />
        </>
      )}
    </div>
  );
}