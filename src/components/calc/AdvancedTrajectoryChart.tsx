import React, { useMemo, useState } from 'react';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useI18n } from '@/lib/i18n';
import type { BallisticResult } from '@/lib/types';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

/* ─── colour tokens (HSL strings from the design system) ─────────── */
const COLOR_DROP = 'hsl(210, 80%, 60%)';
const COLOR_WINDAGE = 'hsl(30, 90%, 55%)';
const COLOR_ENERGY = 'hsl(140, 55%, 48%)';

interface PbrOverlay {
  vitalZoneM?: number;
  startDistance?: number | null;
  endDistance?: number | null;
}

export interface AdvancedTrajectoryChartProps {
  results: BallisticResult[];
  zeroRange: number;
  unit?: 'metric' | 'imperial';
  pbr?: PbrOverlay | null;
}

type CurveKey = 'drop' | 'windage' | 'energy';

interface ChartRow {
  distance: number;
  drop: number;
  windage: number;
  energy: number;
  velocity: number;
}

/* ─── custom tooltip ──────────────────────────────────────────────── */
function ChartTooltipContent({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as ChartRow | undefined;
  if (!row) return null;
  return (
    <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl space-y-0.5">
      <p className="font-semibold">{row.distance} m</p>
      <p style={{ color: COLOR_DROP }}>Drop: {row.drop.toFixed(1)} mm</p>
      <p style={{ color: COLOR_WINDAGE }}>Windage: {row.windage.toFixed(1)} mm</p>
      <p style={{ color: COLOR_ENERGY }}>Energy: {row.energy.toFixed(2)} J</p>
      <p className="text-muted-foreground">Velocity: {row.velocity.toFixed(1)} m/s</p>
    </div>
  );
}

export function AdvancedTrajectoryChart({
  results,
  zeroRange,
  unit = 'metric',
  pbr,
}: AdvancedTrajectoryChartProps) {
  const { t } = useI18n();

  const [visible, setVisible] = useState<CurveKey[]>(['drop', 'windage', 'energy']);

  const data = useMemo<ChartRow[]>(
    () =>
      results.map((r) => ({
        distance: r.range,
        drop: r.drop,
        windage: r.windDrift,
        energy: r.energy,
        velocity: r.velocity,
      })),
    [results],
  );

  if (data.length < 2) {
    return (
      <div
        data-testid="advanced-chart-empty"
        className="rounded-lg border border-border/50 bg-card p-4 text-center text-xs text-muted-foreground"
      >
        {t('chart.advanced.title')}
      </div>
    );
  }

  const show = (k: CurveKey) => visible.includes(k);

  /* PBR band clamped to data range */
  const xMin = data[0].distance;
  const xMax = data[data.length - 1].distance;
  const pbrValid =
    pbr &&
    typeof pbr.vitalZoneM === 'number' &&
    pbr.vitalZoneM > 0 &&
    pbr.startDistance != null &&
    pbr.endDistance != null;
  const pbrStart = pbrValid ? Math.max(xMin, pbr!.startDistance as number) : null;
  const pbrEnd = pbrValid ? Math.min(xMax, pbr!.endDistance as number) : null;
  const vitalMm = pbrValid ? (pbr!.vitalZoneM! * 1000) / 2 : 0;

  return (
    <div data-testid="advanced-chart" className="rounded-lg border border-border/50 bg-card p-3 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h4 className="text-xs font-semibold text-foreground">{t('chart.advanced.title')}</h4>
        <ToggleGroup
          type="multiple"
          value={visible}
          onValueChange={(v) => setVisible((v as CurveKey[]).length ? (v as CurveKey[]) : visible)}
          size="sm"
          className="gap-0.5"
        >
          <ToggleGroupItem value="drop" aria-label={t('chart.advanced.toggleDrop')} className="text-[11px] px-2 py-1 data-[state=on]:bg-primary/20">
            <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: COLOR_DROP }} />
            {t('chart.advanced.drop')}
          </ToggleGroupItem>
          <ToggleGroupItem value="windage" aria-label={t('chart.advanced.toggleWindage')} className="text-[11px] px-2 py-1 data-[state=on]:bg-primary/20">
            <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: COLOR_WINDAGE }} />
            {t('chart.advanced.windage')}
          </ToggleGroupItem>
          <ToggleGroupItem value="energy" aria-label={t('chart.advanced.toggleEnergy')} className="text-[11px] px-2 py-1 data-[state=on]:bg-primary/20">
            <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: COLOR_ENERGY }} />
            {t('chart.advanced.energy')}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
          <XAxis
            dataKey="distance"
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            label={{ value: 'm', position: 'insideBottomRight', offset: -4, fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          />
          {/* Left Y — mm (drop + windage) */}
          <YAxis
            yAxisId="mm"
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            label={{ value: 'mm', angle: -90, position: 'insideLeft', offset: 16, fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          />
          {/* Right Y — J (energy) */}
          <YAxis
            yAxisId="energy"
            orientation="right"
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            label={{ value: 'J', angle: 90, position: 'insideRight', offset: 16, fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          />

          <RechartsTooltip content={<ChartTooltipContent />} />

          {/* Sight line y=0 */}
          <ReferenceLine yAxisId="mm" y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="6 3" strokeOpacity={0.6} label={{ value: t('chart.advanced.sightLine'), fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />

          {/* Zero range */}
          {zeroRange > 0 && zeroRange >= xMin && zeroRange <= xMax && (
            <ReferenceLine yAxisId="mm" x={zeroRange} stroke="hsl(var(--primary))" strokeDasharray="4 2" strokeOpacity={0.7} label={{ value: t('chart.advanced.zeroPoint'), fontSize: 9, fill: 'hsl(var(--primary))', position: 'top' }} />
          )}

          {/* PBR band */}
          {pbrStart != null && pbrEnd != null && show('drop') && (
            <ReferenceArea yAxisId="mm" x1={pbrStart} x2={pbrEnd} y1={-vitalMm} y2={vitalMm} fill="hsl(140, 55%, 48%)" fillOpacity={0.08} strokeOpacity={0} />
          )}

          {/* Curves */}
          {show('drop') && (
            <Line yAxisId="mm" type="monotone" dataKey="drop" stroke={COLOR_DROP} strokeWidth={2} dot={false} name={t('chart.advanced.drop')} />
          )}
          {show('windage') && (
            <Line yAxisId="mm" type="monotone" dataKey="windage" stroke={COLOR_WINDAGE} strokeWidth={2} dot={false} name={t('chart.advanced.windage')} />
          )}
          {show('energy') && (
            <Line yAxisId="energy" type="monotone" dataKey="energy" stroke={COLOR_ENERGY} strokeWidth={2} dot={false} name={t('chart.advanced.energy')} />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}