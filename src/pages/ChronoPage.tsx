import React, { useState, useCallback, useMemo } from 'react';
import type { BleParseConfig } from '@/lib/chrono/fx-radar-ble';
import { DEFAULT_BLE_PARSE_CONFIG } from '@/lib/chrono/fx-radar-ble';
import ChronoBleSettings from '@/components/chrono/ChronoBleSettings';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth-context';
import ChronoConnectButton from '@/components/chrono/ChronoConnectButton';
import ChronoMeasurementsList from '@/components/chrono/ChronoMeasurementsList';
import type { ChronoMeasurement } from '@/lib/chrono/chrono-repo';
import { saveChronoMeasurements } from '@/lib/chrono/chrono-repo';
import { Button } from '@/components/ui/button';
import { Save, AlertTriangle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { sessionStore } from '@/lib/storage';
import { toast } from 'sonner';

export default function ChronoPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [measurements, setMeasurements] = useState<ChronoMeasurement[]>([]);
  const [saved, setSaved] = useState(false);
  const [bleConfig, setBleConfig] = useState<BleParseConfig>(DEFAULT_BLE_PARSE_CONFIG);
  const [bleConnected, setBleConnected] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');

  const sessions = useMemo(() => sessionStore.getAll(), []);
  const canSave = measurements.length > 0 && !!selectedSessionId && !!user && !saved;

  const handleVelocity = useCallback((v: number) => {
    setMeasurements(prev => [
      ...prev,
      {
        source: 'ble' as const,
        velocityMs: v,
        shotNumber: prev.length + 1,
        measuredAt: new Date().toISOString(),
      },
    ]);
  }, []);

  const handleAdd = useCallback((m: ChronoMeasurement) => {
    setMeasurements(prev => [...prev, m]);
  }, []);

  const handleSave = useCallback(async () => {
    if (!user || measurements.length === 0 || !selectedSessionId) return;
    await saveChronoMeasurements(measurements, user.id, selectedSessionId);
    setSaved(true);
    toast.success(t('chrono.saved' as any) || 'Saved!');
  }, [user, measurements, selectedSessionId, t]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-heading font-bold">{t('chrono.title')}</h1>

      {/* Session selector — mandatory */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">
          {t('chrono.selectSession' as any) || 'Session liée'} <span className="text-destructive">*</span>
        </Label>
        {sessions.length === 0 ? (
          <div className="flex items-center gap-2 p-2 rounded bg-destructive/10 text-destructive text-xs">
            <AlertTriangle className="h-3 w-3 shrink-0" />
            {t('chrono.noSessions' as any) || 'Aucune session — créez-en une d\'abord'}
          </div>
        ) : (
          <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('chrono.pickSession' as any) || 'Choisir une session...'} />
            </SelectTrigger>
            <SelectContent>
              {sessions.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name || s.id.slice(0, 8)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <ChronoConnectButton
        onVelocity={handleVelocity}
        bleConfig={bleConfig}
        onStateChange={(s) => setBleConnected(s === 'connected')}
      />

      <ChronoBleSettings
        value={bleConfig}
        onChange={setBleConfig}
        disabled={bleConnected}
      />

      <ChronoMeasurementsList
        measurements={measurements}
        onAdd={handleAdd}
      />

      {measurements.length > 0 && user && !saved && (
        <div className="space-y-2">
          {!selectedSessionId && (
            <div className="flex items-center gap-2 p-2 rounded bg-destructive/10 text-destructive text-xs">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              {t('chrono.sessionRequired' as any) || 'Sélectionnez une session avant d\'enregistrer'}
            </div>
          )}
          <Button onClick={handleSave} disabled={!canSave}>
            <Save className="h-4 w-4 mr-2" />
            {t('chrono.save' as any) || 'Save to cloud'}
          </Button>
        </div>
      )}
    </div>
  );
}