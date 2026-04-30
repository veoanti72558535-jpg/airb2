import { TrendingDown, Wind, Zap, Clock, Crosshair, Compass, Cloud, AlertTriangle, Globe2, Info } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { BallisticResult, OpticFocalPlane, WeatherSnapshot } from '@/lib/types';
import { useUnits } from '@/hooks/use-units';
import { cn } from '@/lib/utils';
import { UnitTagSurface } from '@/components/devtools/UnitTagSurface';
import type { EngineProvenance } from '@/lib/ballistics';

interface Props {
  result: BallisticResult;
  rows?: BallisticResult[];
  clickUnit: 'MOA' | 'MRAD';
  focalPlane?: OpticFocalPlane;
  currentMag?: number;
  magCalibration?: number;
  advanced?: boolean;
  /** Weather actually used in the calculation — surfaced as a traceability strip. */
  weather?: WeatherSnapshot;
  /** Optional separate zeroing weather snapshot — flagged when present. */
  zeroWeather?: WeatherSnapshot;
  /**
   * Configured energy alert threshold in Joules. When the muzzle (range = 0)
   * energy exceeds this, a destructive banner is shown. `null` disables the
   * warning entirely. `undefined` falls back to a sensible default.
   */
  energyThresholdJ?: number | null;
  /**
   * Centralised engine provenance produced alongside `result`
   * (cf. `getLastEngineProvenance` / `buildEngineProvenance`).
   *
   * Single source of truth for which models / guard-rails were active —
   * the "D'où vient la dérive ?" panel reads it instead of re-deriving
   * the state, so the UI cannot drift from the engine.
   */
  provenance?: EngineProvenance | null;
}

function Stat({
  icon: Icon,
  label,
  value,
  unit,
  emphasis,
  sub,
  danger,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  unit?: string;
  emphasis?: boolean;
  sub?: string;
  /** When true, paints the cell with the destructive token to flag a threshold breach. */
  danger?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border p-3',
        danger
          ? 'border-destructive/50 bg-destructive/10 ring-1 ring-destructive/40'
          : cn('border-border/60 bg-background/40', emphasis && 'ring-1 ring-primary/40'),
      )}
    >
      <div
        className={cn(
          'flex items-center gap-1.5 text-[10px] uppercase tracking-wide',
          danger ? 'text-destructive' : 'text-muted-foreground',
        )}
      >
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span
          className={cn(
            'font-mono font-semibold text-base',
            danger ? 'text-destructive' : 'text-foreground',
          )}
        >
          {value}
        </span>
        {unit && (
          <span
            className={cn(
              'text-[10px] font-mono',
              danger ? 'text-destructive/80' : 'text-muted-foreground',
            )}
          >
            {unit}
          </span>
        )}
      </div>
      {sub && (
        <div
          className={cn(
            'text-[10px] font-mono mt-0.5',
            danger ? 'text-destructive/80' : 'text-muted-foreground/80',
          )}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

/** Human-readable age of an ISO timestamp ("just now", "12 min ago", date fallback). */
function formatAge(iso: string | undefined, locale: 'fr' | 'en'): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff) || diff < 0) return '';
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return locale === 'fr' ? "à l'instant" : 'just now';
  if (mins < 60) return locale === 'fr' ? `il y a ${mins} min` : `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return locale === 'fr' ? `il y a ${hours} h` : `${hours}h ago`;
  return new Date(iso).toLocaleDateString(locale);
}

export function ResultsCard({
  result,
  rows,
  clickUnit,
  focalPlane = 'FFP',
  currentMag,
  magCalibration,
  advanced,
  weather,
  zeroWeather,
  energyThresholdJ,
  provenance,
}: Props) {
  const { t, locale } = useI18n();
  const { display, symbol } = useUnits();
  const distUnit = symbol('distance');
  const lengthUnit = symbol('length');
  const velUnit = symbol('velocity');
  const energyUnit = symbol('energy');

  // Initial (muzzle) energy is needed for the threshold check. The trajectory
  // table starts at range 0 in QuickCalc, so the first row carries the muzzle
  // value. When no rows are passed (single hero result) we fall back to the
  // hero energy itself — the next-best approximation.
  const initialEnergy = rows && rows.length > 0 ? rows[0].energy : result.energy;
  const energyOverThreshold =
    energyThresholdJ != null && energyThresholdJ > 0 && initialEnergy > energyThresholdJ;

  // ── Useful range estimation ─────────────────────────────────────────────
  // Last range step where the projectile still carries ≥ threshold energy.
  // - undefined   → no threshold configured / no rows to scan
  // - 'none'      → energy already below threshold at muzzle (warning case)
  // - 'beyond'    → still above threshold at the last computed range
  // - number (m)  → last qualifying range from the table
  type UsefulRange = number | 'none' | 'beyond' | undefined;
  const usefulRange: UsefulRange = (() => {
    if (energyThresholdJ == null || energyThresholdJ <= 0) return undefined;
    if (!rows || rows.length === 0) return undefined;
    if (rows[0].energy < energyThresholdJ) return 'none';
    let last = rows[0].range;
    for (const r of rows) {
      if (r.energy >= energyThresholdJ) last = r.range;
      else break;
    }
    return last === rows[rows.length - 1].range ? 'beyond' : last;
  })();

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

  // ── Weather traceability strip ──────────────────────────────────────────
  // Shows the source (auto/mixed/manual), provider & location label, age,
  // and a hint when a separate zeroing snapshot was used. Helps users trust
  // (and audit) the inputs that produced the displayed numbers.
  const wSource = weather?.source ?? 'manual';
  const sourceLabel =
    wSource === 'auto' ? t('weather.sourceAuto') :
    wSource === 'mixed' ? t('weather.sourceMixed') :
    t('weather.sourceManual');
  const sourceClass =
    wSource === 'auto' ? 'bg-primary/15 text-primary border-primary/30' :
    wSource === 'mixed' ? 'bg-amber-500/15 text-amber-500 border-amber-500/30 dark:text-amber-400' :
    'bg-muted text-muted-foreground border-border';
  const providerLabel = weather?.location ?? weather?.provider;
  const ageLabel = wSource !== 'manual' ? formatAge(weather?.timestamp, locale) : '';

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
        <UnitTagSurface
          categories={['distance', 'velocity', 'energy', 'length', 'windSpeed']}
          label="Results"
        />
      </header>

      {/* Energy threshold warning — surfaced prominently right under the
          header so users notice it before reading the numbers. Uses the
          destructive token (red) to match the comparison-modal convention. */}
      {energyOverThreshold && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-2.5 text-destructive"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold font-mono">
              {t('calc.energyOverWarning', {
                j: initialEnergy.toFixed(1),
                threshold: energyThresholdJ!.toFixed(2),
              })}
            </p>
            <p className="text-[10px] text-destructive/80 mt-0.5">
              {t('calc.energyOverWarningHint')}
            </p>
          </div>
        </div>
      )}

      {weather && (
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
          <span
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded border uppercase tracking-wide',
              sourceClass,
            )}
          >
            <Cloud className="h-3 w-3" />
            {sourceLabel}
          </span>
          {providerLabel && (
            <span className="text-muted-foreground truncate max-w-[60%]">{providerLabel}</span>
          )}
          {ageLabel && <span className="text-muted-foreground">· {ageLabel}</span>}
          {zeroWeather && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-border/60 text-muted-foreground uppercase tracking-wide">
              {t('sessions.badgeZeroWeather')}
            </span>
          )}
          <span className="text-muted-foreground/70">
            · {weather.temperature.toFixed(0)}°C / {weather.pressure.toFixed(0)}hPa /{' '}
            {weather.humidity.toFixed(0)}% /{' '}
            {display('velocity', weather.windSpeed).toFixed(1)}{symbol('velocity')}
          </span>
        </div>
      )}

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
          danger={
            energyThresholdJ != null && energyThresholdJ > 0 && result.energy > energyThresholdJ
          }
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

      {usefulRange !== undefined && (
        <div
          className={cn(
            'rounded-lg border p-2.5 flex items-start gap-2',
            usefulRange === 'none'
              ? 'border-destructive/40 bg-destructive/10 text-destructive'
              : 'border-primary/30 bg-primary/5 text-foreground',
          )}
        >
          <Zap
            className={cn(
              'h-4 w-4 shrink-0 mt-0.5',
              usefulRange === 'none' ? 'text-destructive' : 'text-primary',
            )}
          />
          <div className="flex-1 min-w-0">
            <div
              className={cn(
                'text-[10px] uppercase tracking-wide',
                usefulRange === 'none' ? 'text-destructive' : 'text-muted-foreground',
              )}
            >
              {t('calc.usefulRange')}
            </div>
            <div className="font-mono font-semibold text-base mt-0.5">
              {usefulRange === 'none'
                ? t('calc.usefulRangeNone')
                : usefulRange === 'beyond'
                  ? t('calc.usefulRangeBeyond', {
                      dist: rows![rows!.length - 1].range,
                      unit: distUnit,
                    })
                  : t('calc.usefulRangeValue', { dist: usefulRange, unit: distUnit })}
            </div>
            <div
              className={cn(
                'text-[10px] font-mono mt-0.5',
                usefulRange === 'none' ? 'text-destructive/80' : 'text-muted-foreground',
              )}
            >
              {t('calc.usefulRangeHint', { threshold: energyThresholdJ!.toFixed(2) })}
            </div>
          </div>
        </div>
      )}

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

      {/* ── Drift breakdown ────────────────────────────────────────────
          "Where does the drift come from?" — splits the total lateral
          deflection (`result.windDrift` in mm) into its three physical
          contributors: pure wind, gyroscopic spin, Coriolis. Surfaces
          the active wind model and the current spin guards so users can
          tell, at a glance, why the column shows a non-zero value at
          0 m/s wind. Only rendered in `advanced` mode and at ranges > 0
          (the muzzle row carries no drift). */}
      {advanced && result.range > 0 && (() => {
        const totalMm = result.windDrift ?? 0;
        const spinMm = result.spinDrift ?? 0;
        const corMm = result.coriolisDrift ?? 0;
        // Pure-wind contribution = total − spin − Coriolis. Engine
        // already rounds each component to 0.1 mm, so this stays
        // numerically clean.
        const windOnlyMm = +(totalMm - spinMm - corMm).toFixed(1);
        const fmtSigned = (mm: number) => {
          const sign = mm >= 0 ? t('calc.driftBreakdown.right') : t('calc.driftBreakdown.left');
          return `${Math.abs(mm).toFixed(1)} ${lengthUnit} ${sign}`;
        };
        // All "is this active?" decisions come from the centralised
        // provenance object — never re-derive locally so UI/engine stay
        // bit-identical. Falls back to safe defaults when the caller
        // didn't supply a provenance snapshot (e.g. a hydrated session
        // displayed without re-running the engine).
        const spinEnabled = provenance?.postProcess.spinDrift.enabled ?? false;
        const spinSource = provenance?.postProcess.spinDrift.source ?? 'default';
        const coriolisEnabled = provenance?.postProcess.coriolis.enabled ?? false;
        const windModel = provenance?.windModel ?? 'lateral-only';
        const userOverride = provenance?.userOverrides.spinDrift;
        const windZero = !weather?.windSpeed || weather.windSpeed === 0;

        return (
          <div className="rounded-lg border border-border/40 bg-background/20 p-3 space-y-2">
            <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <Info className="h-3 w-3" />
              {t('calc.driftBreakdown.title')}
            </h4>
            <div className="grid grid-cols-3 gap-1.5">
              <Stat
                icon={Wind}
                label={t('calc.driftBreakdown.wind')}
                value={fmtSigned(windOnlyMm)}
              />
              <Stat
                icon={Compass}
                label={t('calc.driftBreakdown.spin')}
                value={spinEnabled ? fmtSigned(spinMm) : '—'}
              />
              <Stat
                icon={Globe2}
                label={t('calc.driftBreakdown.coriolis')}
                value={coriolisEnabled ? fmtSigned(corMm) : '—'}
              />
            </div>
            <div className="flex items-baseline justify-between text-[11px] font-mono pt-1 border-t border-border/30">
              <span className="uppercase tracking-wide text-muted-foreground">
                {t('calc.driftBreakdown.total')}
              </span>
              <span className="font-semibold">{fmtSigned(totalMm)}</span>
            </div>
            <ul className="text-[10px] text-muted-foreground/90 space-y-0.5 pt-1">
              <li>
                <span className="uppercase tracking-wide">{t('calc.driftBreakdown.modelLabel')}:</span>{' '}
                {windModel === 'vectorial'
                  ? t('calc.driftBreakdown.modelVectorial')
                  : t('calc.driftBreakdown.modelLateral')}
              </li>
              <li>
                {!spinEnabled
                  ? spinSource === 'user-override'
                    ? t('calc.driftBreakdown.spinForcedOff')
                    : t('calc.driftBreakdown.spinOff')
                  : spinSource === 'user-override'
                    ? `${t('calc.driftBreakdown.spinForcedOn')} — ${t('calc.driftBreakdown.spinModel')}`
                    : t('calc.driftBreakdown.spinModel')}
              </li>
              <li>
                {coriolisEnabled
                  ? t('calc.driftBreakdown.coriolisOn')
                  : t('calc.driftBreakdown.coriolisOff')}
              </li>
              {windZero && (totalMm !== 0) && (
                <li className="text-warning">{t('calc.driftBreakdown.zeroWind')}</li>
              )}
            </ul>
            {/* ── Traceability block ────────────────────────────────────
                Lists the *exact* fields read from the engine output and
                the recomposition formula used to isolate the pure-wind
                contribution. Collapsed by default to keep the panel
                compact; opens for users who want to audit the math
                (or feed it into a cross-check spreadsheet). */}
            <details className="pt-1 border-t border-border/30">
              <summary className="cursor-pointer text-[10px] uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors">
                {t('calc.driftBreakdown.traceability')}
              </summary>
              <div className="mt-1.5 space-y-1 text-[10px] font-mono text-muted-foreground/90">
                <div className="flex justify-between gap-2">
                  <code className="text-foreground/80">result.windDrift</code>
                  <span>
                    {t('calc.driftBreakdown.fieldTotal')} = {totalMm.toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <code className="text-foreground/80">result.spinDrift</code>
                  <span>
                    {t('calc.driftBreakdown.fieldSpin')} = {spinMm.toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <code className="text-foreground/80">result.coriolisDrift</code>
                  <span>
                    {t('calc.driftBreakdown.fieldCoriolis')} = {corMm.toFixed(1)}
                  </span>
                </div>
                <div className="pt-1 border-t border-border/20">
                  <div className="text-muted-foreground uppercase tracking-wide text-[9px]">
                    {t('calc.driftBreakdown.formulaLabel')}
                  </div>
                  <code className="block text-foreground/90 break-all">
                    {t('calc.driftBreakdown.fieldWindOnly')} = result.windDrift − result.spinDrift − result.coriolisDrift
                  </code>
                  <code className="block text-foreground/90">
                    = {totalMm.toFixed(1)} − {spinMm.toFixed(1)} − {corMm.toFixed(1)} = {windOnlyMm.toFixed(1)} mm
                  </code>
                </div>
                {provenance && (
                  <div className="pt-1 border-t border-border/20">
                    <div className="text-muted-foreground uppercase tracking-wide text-[9px] mb-1">
                      EngineProvenance · v{provenance.schemaVersion}
                    </div>
                    <pre className="text-[9.5px] leading-snug text-foreground/80 whitespace-pre-wrap break-all bg-background/40 rounded p-1.5 border border-border/30">
{JSON.stringify(provenance, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          </div>
        );
      })()}

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
                {rows.map(r => {
                  const isSelected = r.range === result.range;
                  const isOverThreshold =
                    energyThresholdJ != null && energyThresholdJ > 0 && r.energy > energyThresholdJ;
                  return (
                    <tr
                      key={r.range}
                      className={cn(
                        'border-b border-border/20',
                        isOverThreshold &&
                          'bg-destructive/10 text-destructive hover:bg-destructive/15',
                        isSelected &&
                          (isOverThreshold
                            ? 'font-semibold ring-1 ring-inset ring-destructive/40'
                            : 'bg-primary/10 font-semibold'),
                      )}
                      title={
                        isOverThreshold
                          ? `${r.energy.toFixed(1)} J > ${energyThresholdJ!.toFixed(2)} J`
                          : undefined
                      }
                    >
                      <td className="py-1.5 pr-2">{r.range}{distUnit}</td>
                      <td className="text-right py-1.5 px-2">{r.drop.toFixed(1)}</td>
                      <td className="text-right py-1.5 px-2">
                        {(clickUnit === 'MOA' ? r.holdover : r.holdoverMRAD).toFixed(2)}
                      </td>
                      <td className="text-right py-1.5 px-2">{r.windDrift.toFixed(1)}</td>
                      <td className="text-right py-1.5 pl-2">{r.velocity.toFixed(0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
