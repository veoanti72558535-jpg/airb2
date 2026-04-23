import { useMemo } from 'react';
import { useI18n } from '@/lib/i18n';
import { Badge } from '@/components/ui/badge';
import type { Projectile, BallisticResult } from '@/lib/types';

export interface ComparisonEntry {
  projectile: Projectile;
  trajectory: BallisticResult[];
}

interface Props {
  results: ComparisonEntry[];
  compareDistance: number;
}

/** Find the result row closest to the target distance. */
function rowAt(traj: BallisticResult[], d: number): BallisticResult | null {
  if (traj.length === 0) return null;
  let best = traj[0];
  for (const r of traj) {
    if (Math.abs(r.range - d) < Math.abs(best.range - d)) best = r;
  }
  return best;
}

export function ProjectileComparisonTable({ results, compareDistance }: Props) {
  const { t } = useI18n();

  const data = useMemo(() => {
    return results.map(({ projectile, trajectory }) => {
      const r = rowAt(trajectory, compareDistance);
      return {
        projectile,
        drop: r?.drop ?? 0,
        velocity: r?.velocity ?? 0,
        energy: r?.energy ?? 0,
        windDrift: r?.windDrift ?? 0,
        tof: r?.tof ?? 0,
      };
    });
  }, [results, compareDistance]);

  const winners = useMemo(() => {
    if (data.length < 2) return { drop: '', velocity: '', energy: '', windDrift: '', tof: '', best: '' };
    const bestDrop = data.reduce((a, b) => (Math.abs(a.drop) < Math.abs(b.drop) ? a : b)).projectile.id;
    const bestVel = data.reduce((a, b) => (a.velocity > b.velocity ? a : b)).projectile.id;
    const bestEn = data.reduce((a, b) => (a.energy > b.energy ? a : b)).projectile.id;
    const bestWd = data.reduce((a, b) => (Math.abs(a.windDrift) < Math.abs(b.windDrift) ? a : b)).projectile.id;
    const bestTof = data.reduce((a, b) => (a.tof < b.tof ? a : b)).projectile.id;
    // Best compromise = most wins
    const scores: Record<string, number> = {};
    [bestDrop, bestVel, bestEn, bestWd, bestTof].forEach(id => { scores[id] = (scores[id] ?? 0) + 1; });
    const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
    return { drop: bestDrop, velocity: bestVel, energy: bestEn, windDrift: bestWd, tof: bestTof, best };
  }, [data]);

  if (data.length === 0) return null;

  const isWinner = (id: string, field: string) => winners[field as keyof typeof winners] === id;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">
        {t('compareProjectiles.atDistance' as any, { d: compareDistance }) || `At ${compareDistance}m`}
      </h3>
      <div className="rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="px-3 py-2 text-left font-medium">Projectile</th>
              <th className="px-3 py-2 text-right font-medium">Drop (mm)</th>
              <th className="px-3 py-2 text-right font-medium">{t('chrono.velocity')} (m/s)</th>
              <th className="px-3 py-2 text-right font-medium">{t('chart.advanced.energy' as any) || 'Energy'} (J)</th>
              <th className="px-3 py-2 text-right font-medium">{t('chart.advanced.windage' as any) || 'Drift'} (mm)</th>
              <th className="px-3 py-2 text-right font-medium">TOF (s)</th>
            </tr>
          </thead>
          <tbody>
            {data.map(({ projectile: p, drop, velocity, energy, windDrift, tof }) => (
              <tr key={p.id} className="border-t border-border">
                <td className="px-3 py-1.5">
                  <div className="font-medium text-xs">{p.brand} {p.model}</div>
                  <div className="text-[10px] text-muted-foreground">{p.weight}gr · BC {p.bc}</div>
                  {winners.best === p.id && (
                    <Badge variant="default" className="mt-0.5 text-[9px] bg-primary/20 text-primary">
                      {t('compareProjectiles.bestCompromise' as any) || 'Best compromise'}
                    </Badge>
                  )}
                </td>
                <td className={`px-3 py-1.5 text-right font-mono ${isWinner(p.id, 'drop') ? 'text-primary font-bold' : ''}`}>
                  {drop.toFixed(1)}
                </td>
                <td className={`px-3 py-1.5 text-right font-mono ${isWinner(p.id, 'velocity') ? 'text-primary font-bold' : ''}`}>
                  {velocity.toFixed(0)}
                </td>
                <td className={`px-3 py-1.5 text-right font-mono ${isWinner(p.id, 'energy') ? 'text-primary font-bold' : ''}`}>
                  {energy.toFixed(1)}
                </td>
                <td className={`px-3 py-1.5 text-right font-mono ${isWinner(p.id, 'windDrift') ? 'text-primary font-bold' : ''}`}>
                  {windDrift.toFixed(1)}
                </td>
                <td className={`px-3 py-1.5 text-right font-mono ${isWinner(p.id, 'tof') ? 'text-primary font-bold' : ''}`}>
                  {tof.toFixed(3)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}