import { TrendingDown, Wind, Zap, Clock, Crosshair, Compass } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { BallisticResult, OpticFocalPlane } from '@/lib/types';
import { useUnits } from '@/hooks/use-units';

interface Props {
  result: BallisticResult;
  rows?: BallisticResult[];
  clickUnit: 'MOA' | 'MRAD';
  focalPlane?: OpticFocalPlane;
  currentMag?: number;
  magCalibration?: number;
  advanced?: boolean;
}

function Stat({
  icon: Icon,
  label,
  value,
  unit,
  emphasis,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  unit?: string;
  emphasis?: boolean;
  sub?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-border/60 bg-background/40 p-3 ${
        emphasis ? 'ring-1 ring-primary/40' : ''
      }`}
    >
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="font-mono font-semibold text-base text-foreground">{value}</span>
        {unit && <span className="text-[10px] text-muted-foreground font-mono">{unit}</span>}
      </div>
      {sub && <div className="text-[10px] text-muted-foreground/80 font-mono mt-0.5">{sub}</div>}
    </div>
  );
}

export function ResultsCard({
  result,
  rows,
  clickUnit,
  focalPlane = 'FFP',
  currentMag,
  magCalibration,
  advanced,
}: Props) {
  const { t } = useI18n();
  const { symbol } = useUnits();
  const distUnit = symbol('distance');
  const lengthUnit = symbol('length');
  const velUnit = symbol('velocity');
  const energyUnit = symbol('energy');

  const elevDir = result.holdover >= 0 ? t('calc.up') : t('calc.down');
  const windDir = result.windDrift >= 0 ? t('calc.right') : t('calc.left');

  const trueElev = clickUnit === 'MOA' ? result.holdover : result.holdoverMRAD;
  const trueWind = clickUnit === 'MOA' ? result.windDriftMOA : result.windDriftMRAD;
  const reticleElev =
    clickUnit === 'MOA' ? result.reticleHoldoverMOA : result.reticleHoldoverMRAD;
  const reticleWind =
    clickUnit === 'MOA' ? result.reticleWindMOA : result.reticleWindMRAD;

  const sfpActive =
    focalPlane === 'SFP' &&
    magCalibration != null &&
    currentMag != null &&
    currentMag > 0 &&
    Math.abs(currentMag - magCalibration) > 0.01;

  return (
    <section className="rounded-xl border border-primary/30 bg-gradient-to-br from-card via-card/80 to-primary/5 p-4 space-y-4 shadow-lg">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-heading font-bold uppercase tracking-wide text-primary">
            {t('calc.heroTitle')}
          </h2>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">
            {t('calc.atDistance', { dist: result.range, unit: distUnit })}
            {sfpActive && currentMag && (
              <span className="ml-2 text-warning">
                · {t('calc.atSfpMag', { mag: currentMag })}
              </span>
            )}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2">
        <Stat
          icon={TrendingDown}
          label={t('calc.drop')}
          value={result.drop.toFixed(1)}
          unit={lengthUnit}
          emphasis
        />
        <Stat
          icon={Crosshair}
          label={t('calc.holdover')}
          value={`${Math.abs(trueElev).toFixed(2)} ${elevDir}`}
          unit={clickUnit}
          emphasis
          sub={
            sfpActive && reticleElev != null
              ? `${t('calc.reticleHold')}: ${Math.abs(reticleElev).toFixed(2)} ${clickUnit}`
              : undefined
          }
        />
        <Stat
          icon={Wind}
          label={t('calc.windDrift')}
          value={`${Math.abs(result.windDrift).toFixed(1)} ${windDir}`}
          unit={lengthUnit}
        />
        <Stat
          icon={Crosshair}
          label={t('calc.elevation')}
          value={result.clicksElevation != null ? `${result.clicksElevation}` : '—'}
          unit="clicks"
        />
        <Stat
          icon={Zap}
          label={t('calc.remainingVelocity')}
          value={result.velocity.toFixed(0)}
          unit={velUnit}
        />
        <Stat
          icon={Zap}
          label={t('calc.remainingEnergy')}
          value={result.energy.toFixed(1)}
          unit={energyUnit}
        />
        <Stat
          icon={Clock}
          label={t('calc.tof')}
          value={result.tof.toFixed(3)}
          unit="s"
        />
        <Stat
          icon={Crosshair}
          label={t('calc.windage')}
          value={result.clicksWindage != null ? `${result.clicksWindage}` : '—'}
          unit="clicks"
        />
      </div>

      {advanced && (result.spinDrift != null || sfpActive) && (
        <div className="rounded-lg border border-border/40 bg-background/20 p-3 space-y-2">
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t('calc.advancedResults')}
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {result.spinDrift != null && Math.abs(result.spinDrift) > 0.05 && (
              <Stat
                icon={Compass}
                label={t('calc.spinDrift')}
                value={result.spinDrift.toFixed(1)}
                unit={lengthUnit}
              />
            )}
            {sfpActive && reticleWind != null && (
              <Stat
                icon={Wind}
                label={t('calc.reticleHold')}
                value={Math.abs(reticleWind).toFixed(2)}
                unit={clickUnit}
                sub={`${t('calc.angularTrue')}: ${Math.abs(trueWind).toFixed(2)}`}
              />
            )}
          </div>
        </div>
      )}

      {rows && rows.length > 1 && (
        <div className="pt-2 border-t border-border/40">
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            {t('calc.rangeBreakdown')}
          </h4>
          <div className="overflow-x-auto -mx-1 px-1">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="text-[10px] uppercase text-muted-foreground border-b border-border/40">
                  <th className="text-left py-1.5 pr-2">{t('calc.range')}</th>
                  <th className="text-right py-1.5 px-2">{t('calc.drop')}</th>
                  <th className="text-right py-1.5 px-2">{clickUnit}</th>
                  <th className="text-right py-1.5 px-2">{t('calc.windDrift')}</th>
                  <th className="text-right py-1.5 pl-2">{t('calc.velocity')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr
                    key={r.range}
                    className={`border-b border-border/20 ${
                      r.range === result.range ? 'bg-primary/10 font-semibold' : ''
                    }`}
                  >
                    <td className="py-1.5 pr-2">{r.range}{distUnit}</td>
                    <td className="text-right py-1.5 px-2">{r.drop.toFixed(1)}</td>
                    <td className="text-right py-1.5 px-2">
                      {(clickUnit === 'MOA' ? r.holdover : r.holdoverMRAD).toFixed(2)}
                    </td>
                    <td className="text-right py-1.5 px-2">{r.windDrift.toFixed(1)}</td>
                    <td className="text-right py-1.5 pl-2">{r.velocity.toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
