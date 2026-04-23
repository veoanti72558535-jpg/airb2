import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/i18n';
import { Download, Plus } from 'lucide-react';
import type { ChronoMeasurement } from '@/lib/chrono/chrono-repo';
import { chronoStats } from '@/lib/chrono/chrono-repo';
import { ChronoStatsInterpreterButton } from '@/components/ai/agents/ChronoStatsInterpreterButton';
import { TuneStabilityCheckButton } from '@/components/ai/agents/TuneStabilityCheckButton';

interface Props {
  measurements: ChronoMeasurement[];
  sessionId?: string;
  onAdd: (m: ChronoMeasurement) => void;
  onLinkSession?: (sessionId: string) => void;
}

function msToFps(ms: number) { return +(ms * 3.28084).toFixed(1); }

export default function ChronoMeasurementsList({ measurements, sessionId, onAdd, onLinkSession }: Props) {
  const { t } = useI18n();
  const [manualV, setManualV] = useState('');
  const stats = useMemo(() => chronoStats(measurements), [measurements]);

  const handleManualAdd = () => {
    const v = parseFloat(manualV);
    if (!v || v <= 0) return;
    onAdd({
      source: 'manual',
      velocityMs: v,
      shotNumber: measurements.length + 1,
      measuredAt: new Date().toISOString(),
    });
    setManualV('');
  };

  const exportCsv = () => {
    const header = 'Shot,Velocity (m/s),Velocity (fps),Source,Time\n';
    const rows = measurements.map((m, i) =>
      `${m.shotNumber ?? i + 1},${m.velocityMs},${msToFps(m.velocityMs)},${m.source},${m.measuredAt ?? ''}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `chrono-${sessionId ?? 'export'}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-4">
      {/* Manual entry */}
      <div className="flex items-center gap-2">
        <Input
          type="number"
          step="0.1"
          min="0"
          placeholder={`${t('chrono.velocity')} (m/s)`}
          value={manualV}
          onChange={e => setManualV(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleManualAdd()}
          className="w-40"
        />
        <Button size="sm" variant="outline" onClick={handleManualAdd}>
          <Plus className="h-4 w-4 mr-1" />
          {t('chrono.addVelocity')}
        </Button>
      </div>

      {/* Stats */}
      {measurements.length > 0 && (
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg bg-muted p-2">
            <div className="text-xs text-muted-foreground">{t('chrono.average')}</div>
            <div className="font-mono font-bold text-sm">{stats.avg} m/s</div>
            <div className="text-xs text-muted-foreground">{msToFps(stats.avg)} fps</div>
          </div>
          <div className="rounded-lg bg-muted p-2">
            <div className="text-xs text-muted-foreground">{t('chrono.es')}</div>
            <div className="font-mono font-bold text-sm">{stats.es} m/s</div>
          </div>
          <div className="rounded-lg bg-muted p-2">
            <div className="text-xs text-muted-foreground">{t('chrono.sd')}</div>
            <div className="font-mono font-bold text-sm">{stats.sd} m/s</div>
          </div>
        </div>
      )}

      {/* Measurements table */}
      {measurements.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">{t('chrono.noMeasurements')}</p>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="px-3 py-2 text-left font-medium">#</th>
                <th className="px-3 py-2 text-right font-medium">m/s</th>
                <th className="px-3 py-2 text-right font-medium">fps</th>
                <th className="px-3 py-2 text-center font-medium">{t('chrono.source.ble')}</th>
              </tr>
            </thead>
            <tbody>
              {measurements.map((m, i) => (
                <tr key={m.id ?? i} className="border-t border-border">
                  <td className="px-3 py-1.5 font-mono text-muted-foreground">{m.shotNumber ?? i + 1}</td>
                  <td className="px-3 py-1.5 text-right font-mono">{m.velocityMs.toFixed(1)}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-muted-foreground">{msToFps(m.velocityMs)}</td>
                  <td className="px-3 py-1.5 text-center text-xs">
                    {m.source === 'ble' ? t('chrono.source.ble') : t('chrono.source.manual')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Actions */}
      {measurements.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="h-4 w-4 mr-1" />
            {t('chrono.exportCsv')}
          </Button>
          {onLinkSession && !sessionId && (
            <Button variant="outline" size="sm" onClick={() => onLinkSession('')}>
              {t('chrono.linkToSession')}
            </Button>
          )}
          {measurements.length >= 5 && (
            <>
              <ChronoStatsInterpreterButton
                esMs={stats.es}
                sdMs={stats.sd}
                avgMs={stats.avg}
                shotCount={measurements.length}
              />
              <TuneStabilityCheckButton
                velocitiesMs={measurements.map(m => m.velocityMs)}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}