import { useEffect, useMemo, useState } from 'react';
import { X, GitCompare, Gauge, RotateCcw } from 'lucide-react';
import { Projectile, WeatherSnapshot } from '@/lib/types';
import { calculateTrajectory } from '@/lib/ballistics';
import { useI18n } from '@/lib/i18n';
import { useUnits } from '@/hooks/use-units';
import { cn } from '@/lib/utils';

const MIN_V = 200;
const MAX_V = 380;
const DEFAULT_V = 280;

interface Props {
  projectiles: Projectile[];
  open: boolean;
  onClose: () => void;
  onRemove: (id: string) => void;
  /** Muzzle velocity used for the simulation (m/s). */
  muzzleVelocity?: number;
}

const COMPARE_RANGES = [25, 50, 75, 100] as const;

function neutralWeather(): WeatherSnapshot {
  return {
    temperature: 15,
    humidity: 50,
    pressure: 1013.25,
    altitude: 0,
    windSpeed: 0,
    windAngle: 90,
    source: 'manual',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Side-by-side projectile comparison: weight, BC, drag model, and a quick
 * trajectory preview at 25/50/75/100 m using a neutral atmosphere.
 *
 * Velocity is identical for all projectiles (default 280 m/s) so the drop
 * differences truly reflect ballistic behaviour, not muzzle energy.
 */
export function CompareProjectilesModal({
  projectiles,
  open,
  onClose,
  onRemove,
  muzzleVelocity: initialVelocity = DEFAULT_V,
}: Props) {
  const { t } = useI18n();
  const { symbol } = useUnits();
  const [velocity, setVelocity] = useState<number>(initialVelocity);

  // Reset slider when modal re-opens with a new initial velocity.
  useEffect(() => {
    if (open) setVelocity(initialVelocity);
  }, [open, initialVelocity]);

  const rows = useMemo(() => {
    if (!open || projectiles.length === 0) return [];
    const weather = neutralWeather();
    return projectiles.map(p => {
      const traj = calculateTrajectory({
        muzzleVelocity: velocity,
        bc: p.bc,
        projectileWeight: p.weight,
        sightHeight: 50,
        zeroRange: 30,
        maxRange: 100,
        rangeStep: 25,
        weather,
        dragModel: p.bcModel ?? 'G1',
        customDragTable: p.customDragTable,
      });
      const drops: Record<number, number> = {};
      const vels: Record<number, number> = {};
      const energies: Record<number, number> = {};
      for (const r of traj) {
        if ((COMPARE_RANGES as readonly number[]).includes(r.range)) {
          drops[r.range] = r.drop;
          vels[r.range] = r.velocity;
          energies[r.range] = r.energy;
        }
      }
      return { p, drops, vels, energies };
    });
  }, [projectiles, open, velocity]);

  if (!open) return null;

  const weightSym = symbol('weight');

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4">
      <div className="surface-elevated w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-4 border-b border-border">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-md bg-primary/10 text-primary shrink-0">
              <GitCompare className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-heading font-semibold">{t('projectiles.compareTitle')}</h2>
              <p className="text-[11px] text-muted-foreground">
                {t('projectiles.compareHint', { v: velocity })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground"
            aria-label={t('common.close')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Velocity slider */}
        <div className="px-4 py-3 border-b border-border bg-muted/20 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="compare-velocity"
              className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
            >
              <Gauge className="h-3.5 w-3.5" />
              {t('projectiles.compareVelocity')}
            </label>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-foreground tabular-nums">
                {velocity} m/s
              </span>
              {velocity !== DEFAULT_V && (
                <button
                  type="button"
                  onClick={() => setVelocity(DEFAULT_V)}
                  className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
                  aria-label={t('common.reset')}
                >
                  <RotateCcw className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
          <input
            id="compare-velocity"
            type="range"
            min={MIN_V}
            max={MAX_V}
            step={5}
            value={velocity}
            onChange={e => setVelocity(Number(e.target.value))}
            className="w-full accent-primary cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
            <span>{MIN_V}</span>
            <span className="text-muted-foreground/60">{t('projectiles.compareVelocityHint')}</span>
            <span>{MAX_V}</span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-3 py-2 sticky left-0 bg-muted/40 z-10">
                  {t('projectiles.compareMetric')}
                </th>
                {rows.map(({ p }) => (
                  <th key={p.id} className="text-left font-medium px-3 py-2 min-w-[160px]">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-foreground normal-case truncate">
                          {p.brand} {p.model}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {p.caliber} · {p.bcModel ?? 'G1'}
                        </div>
                      </div>
                      <button
                        onClick={() => onRemove(p.id)}
                        className="p-0.5 rounded hover:bg-muted text-muted-foreground shrink-0"
                        aria-label={t('common.delete')}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {/* Static specs */}
              <tr>
                <td className="px-3 py-2 text-xs text-muted-foreground sticky left-0 bg-card z-10">
                  {t('projectiles.weight')}
                </td>
                {rows.map(({ p }) => (
                  <td key={p.id} className="px-3 py-2 font-mono text-xs">
                    {p.weight} {weightSym}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-3 py-2 text-xs text-muted-foreground sticky left-0 bg-card z-10">
                  BC
                </td>
                {rows.map(({ p }) => (
                  <td key={p.id} className="px-3 py-2 font-mono text-xs">
                    {p.bc}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-3 py-2 text-xs text-muted-foreground sticky left-0 bg-card z-10">
                  {t('projectiles.type')}
                </td>
                {rows.map(({ p }) => (
                  <td key={p.id} className="px-3 py-2 font-mono text-xs">
                    {p.projectileType ?? 'pellet'}
                  </td>
                ))}
              </tr>

              {/* Drop section header */}
              <tr className="bg-muted/20">
                <td colSpan={rows.length + 1} className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                  {t('projectiles.compareDropSection')}
                </td>
              </tr>
              {COMPARE_RANGES.map(r => {
                const best = Math.min(...rows.map(x => Math.abs(x.drops[r] ?? Infinity)));
                return (
                  <tr key={`drop-${r}`}>
                    <td className="px-3 py-2 text-xs text-muted-foreground sticky left-0 bg-card z-10">
                      {t('projectiles.compareDropAt', { r })}
                    </td>
                    {rows.map(({ p, drops }) => {
                      const d = drops[r];
                      const isBest = d !== undefined && Math.abs(d) === best && rows.length > 1;
                      return (
                        <td
                          key={p.id}
                          className={cn(
                            'px-3 py-2 font-mono text-xs',
                            isBest && 'text-tactical font-semibold'
                          )}
                        >
                          {d !== undefined ? `${d.toFixed(1)} mm` : '—'}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {/* Velocity / energy section */}
              <tr className="bg-muted/20">
                <td colSpan={rows.length + 1} className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                  {t('projectiles.compareEnergySection')}
                </td>
              </tr>
              {COMPARE_RANGES.map(r => (
                <tr key={`v-${r}`}>
                  <td className="px-3 py-2 text-xs text-muted-foreground sticky left-0 bg-card z-10">
                    {t('projectiles.compareEnergyAt', { r })}
                  </td>
                  {rows.map(({ p, vels, energies }) => (
                    <td key={p.id} className="px-3 py-2 font-mono text-xs">
                      {vels[r] !== undefined
                        ? `${vels[r].toFixed(0)} m/s · ${energies[r].toFixed(1)} J`
                        : '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border text-[10px] text-muted-foreground">
          {t('projectiles.compareDisclaimer')}
        </div>
      </div>
    </div>
  );
}
