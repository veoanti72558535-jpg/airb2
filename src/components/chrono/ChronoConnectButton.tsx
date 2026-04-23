import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bluetooth, BluetoothOff, Loader2, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import {
  isWebBluetoothSupported,
  connectFxRadar,
  startVelocityStream,
  disconnect,
} from '@/lib/chrono/fx-radar-ble';

type BleState = 'unsupported' | 'disconnected' | 'scanning' | 'connected' | 'error';

interface ChronoConnectButtonProps {
  onVelocity: (v: number) => void;
  onStateChange?: (state: BleState) => void;
}

export default function ChronoConnectButton({ onVelocity, onStateChange }: ChronoConnectButtonProps) {
  const { t } = useI18n();
  const [state, setState] = useState<BleState>(
    isWebBluetoothSupported() ? 'disconnected' : 'unsupported',
  );
  const [error, setError] = useState<string>('');
  const [device, setDevice] = useState<BluetoothDevice | null>(null);
  const [stopFn, setStopFn] = useState<(() => void) | null>(null);

  const updateState = useCallback((s: BleState) => {
    setState(s);
    onStateChange?.(s);
  }, [onStateChange]);

  const handleConnect = useCallback(async () => {
    updateState('scanning');
    setError('');
    try {
      const dev = await connectFxRadar();
      setDevice(dev);
      const stop = await startVelocityStream(
        dev,
        (v) => onVelocity(v),
        (err) => {
          setError(err.message);
          updateState('error');
        },
      );
      setStopFn(() => stop);
      updateState('connected');
    } catch (err: any) {
      if (err?.name === 'NotFoundError') {
        // User cancelled the picker
        updateState('disconnected');
        return;
      }
      setError(err?.message ?? String(err));
      updateState('error');
    }
  }, [onVelocity, updateState]);

  const handleDisconnect = useCallback(async () => {
    stopFn?.();
    if (device) await disconnect(device);
    setDevice(null);
    setStopFn(null);
    updateState('disconnected');
  }, [device, stopFn, updateState]);

  if (state === 'unsupported') {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
        <BluetoothOff className="h-4 w-4 shrink-0" />
        <span>{t('chrono.unsupported')}</span>
      </div>
    );
  }

  if (state === 'connected') {
    return (
      <div className="flex items-center gap-3">
        <Badge variant="default" className="bg-green-600 text-white gap-1.5">
          <Wifi className="h-3 w-3" />
          {t('chrono.connected')}
        </Badge>
        <Button variant="outline" size="sm" onClick={handleDisconnect}>
          <WifiOff className="h-4 w-4 mr-1" />
          {t('chrono.disconnect')}
        </Button>
      </div>
    );
  }

  if (state === 'scanning') {
    return (
      <Button disabled>
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        {t('chrono.scanning')}
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={handleConnect}>
        <Bluetooth className="h-4 w-4 mr-2" />
        {t('chrono.connect')}
      </Button>
      {state === 'error' && (
        <div className="flex items-center gap-2 p-2 rounded bg-destructive/10 text-destructive text-xs">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          <span>{error}</span>
          <Button variant="ghost" size="sm" className="ml-auto h-6 text-xs" onClick={handleConnect}>
            ↻
          </Button>
        </div>
      )}
    </div>
  );
}