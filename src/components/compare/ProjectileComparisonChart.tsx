import { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Legend,
} from 'recharts';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useI18n } from '@/lib/i18n';
import type { ComparisonEntry } from './ProjectileComparisonTable';

const COLORS = ['#3B82F6', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6'];

type Metric = 'drop' | 'velocity' | 'energy';

export function ProjectileComparisonChart({ results }: { results: ComparisonEntry[] }) {
  const { t } = useI18n();
  const [metric, setMetric] = useState<Metric>('drop');

  const chartData = useMemo(() => {
    if (results.length === 0) return [];
    // Build unified distance array from first trajectory
    const distances = results[0].trajectory.filter(r => r.range > 0).map(r => r.range);
    return distances.map(d => {
      const point: Record<string, number> = { range: d };
      results.forEach(({ projectile, trajectory }) => {
        const row = trajectory.find(r => r.range === d);
        if (row) {
          point[`${projectile.id}_drop`] = row.drop;
          point[`${projectile.id}_velocity`] = row.velocity;
          point[`${projectile.id}_energy`] = row.energy;
        }
      });
      return point;
    });
  }, [results]);

  if (results.length === 0) return null;

  const yLabel = metric === 'drop' ? 'mm' : metric === 'velocity' ? 'm/s' : 'J';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold">
          {t('compareProjectiles.dropCurve' as any) || 'Comparison chart'}
        </h3>
        <ToggleGroup type="single" value={metric} onValueChange={(v) => v && setMetric(v as Metric)} size="sm">
          <ToggleGroupItem value="drop" className="text-xs">
            {t('chart.advanced.drop' as any) || 'Drop'}
          </ToggleGroupItem>
          <ToggleGroupItem value="velocity" className="text-xs">
            {t('chrono.velocity')}
          </ToggleGroupItem>
          <ToggleGroupItem value="energy" className="text-xs">
            {t('chart.advanced.energy' as any) || 'Energy'}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <XAxis dataKey="range" tick={{ fontSize: 10 }} label={{ value: 'm', position: 'insideBottomRight', fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} label={{ value: yLabel, angle: -90, position: 'insideLeft', fontSize: 10 }} />
            <Tooltip
              contentStyle={{ fontSize: 11, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
              labelFormatter={(v) => `${v} m`}
            />
            {metric === 'drop' && <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />}
            <Legend wrapperStyle={{ fontSize: 10 }} />
            {results.map(({ projectile }, i) => (
              <Line
                key={projectile.id}
                dataKey={`${projectile.id}_${metric}`}
                name={`${projectile.brand} ${projectile.model}`}
                stroke={COLORS[i % COLORS.length]}
                dot={false}
                strokeWidth={2}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}