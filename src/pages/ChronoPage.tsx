import React, { useState, useCallback } from 'react';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth-context';
import ChronoConnectButton from '@/components/chrono/ChronoConnectButton';
import ChronoMeasurementsList from '@/components/chrono/ChronoMeasurementsList';
import type { ChronoMeasurement } from '@/lib/chrono/chrono-repo';
import { saveChronoMeasurements } from '@/lib/chrono/chrono-repo';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import { toast } from 'sonner';

export default function ChronoPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [measurements, setMeasurements] = useState<ChronoMeasurement[]>([]);
  const [saved, setSaved] = useState(false);

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
    if (!user || measurements.length === 0) return;
    await saveChronoMeasurements(measurements, user.id);
    setSaved(true);
    toast.success(t('chrono.saved' as any) || 'Saved!');
  }, [user, measurements, t]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-heading font-bold">{t('chrono.title')}</h1>

      <ChronoConnectButton onVelocity={handleVelocity} />

      <ChronoMeasurementsList
        measurements={measurements}
        onAdd={handleAdd}
      />

      {measurements.length > 0 && user && !saved && (
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          {t('chrono.save' as any) || 'Save to cloud'}
        </Button>
      )}
    </div>
  );
}