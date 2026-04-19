/**
 * Tranche P — Carte UI Point Blank Range (PBR / MPBR).
 *
 * Pure présentation : reçoit la trajectoire déjà calculée et un diamètre
 * de zone vitale local (saisi par l'utilisateur). Calcule le PBR via le
 * helper pur `computePointBlankRange` et l'affiche sobrement. Aucun
 * recalcul moteur, aucune persistance globale du diamètre.
 */
import { useEffect, useMemo, useState } from 'react';
import { Target } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useUnits } from '@/hooks/use-units';
import { usePbrPrefs, DEFAULT_PBR_VITAL_ZONE_M } from '@/hooks/use-pbr-prefs';
import { cn } from '@/lib/utils';
import type { BallisticResult } from '@/lib/types';
import { computePointBlankRange } from '@/lib/pbr';

interface Props {
  rows: BallisticResult[];
  /**
   * Initial vital-zone diameter in metres. **Optional** — if omitted, the
   * card uses the locally persisted preference (Tranche Q). Provided value
   * is only used to seed the persisted preference if none exists yet.
   */
  initialVitalZoneM?: number;
  className?: string;
  /** Optional callback when the user changes the vital zone (advanced use). */
  onVitalZoneChange?: (m: number) => void;
}

export function PbrCard({
  rows,
  initialVitalZoneM,
  className,
  onVitalZoneChange,
}: Props) {
  const { t } = useI18n();
  const { display, toRef, symbol } = useUnits();
  const { vitalZoneM: persistedM, setVitalZoneM: setPersistedM } = usePbrPrefs();
  const distSym = symbol('distance');
  const lengthSym = symbol('length');

  // Tranche Q — la valeur persistée fait foi. `initialVitalZoneM` ne sert que
  // de seed lors du tout premier rendu si une valeur explicite est fournie.
  // L'input local (en unité d'affichage) suit la persistance.
  const [vitalDisplay, setVitalDisplay] = useState<number>(() => {
    const seedM = Number.isFinite(initialVitalZoneM as number) && (initialVitalZoneM as number) > 0
      ? (initialVitalZoneM as number)
      : persistedM ?? DEFAULT_PBR_VITAL_ZONE_M;
    return Number(display('length', seedM).toFixed(2));
  });

  // Resync l'input affiché si la persistance change (autre onglet, reset).
  useEffect(() => {
    const next = Number(display('length', persistedM).toFixed(2));
    setVitalDisplay(prev => (Math.abs(prev - next) < 1e-6 ? prev : next));
  }, [persistedM, display]);

  const vitalZoneM = useMemo(() => {
    const m = toRef('length', vitalDisplay);
    return Number.isFinite(m) && m > 0 ? m : 0;
  }, [vitalDisplay, toRef]);

  const pbr = useMemo(
    () => computePointBlankRange(rows, vitalZoneM),
    [rows, vitalZoneM],
  );

  const fmtDist = (m: number) => `${display('distance', m).toFixed(1)} ${distSym}`;
  const fmtLen = (mm: number) => `${display('length', mm / 1000).toFixed(1)} ${lengthSym}`;

  const handleVitalChange = (raw: string) => {
    const v = Number(raw);
    if (Number.isFinite(v) && v >= 0) {
      setVitalDisplay(v);
      const meters = toRef('length', v);
      if (Number.isFinite(meters) && meters > 0) {
        // Tranche Q — toute saisie valide est persistée localement.
        setPersistedM(meters);
        onVitalZoneChange?.(meters);
      }
    }
  };

  return (
    <section
      data-testid="pbr-card"
      aria-label={t('pbr.title')}
      className={cn('rounded-xl border border-border bg-card/60 p-3', className)}
    >
      <header className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Target className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden />
          <h3 className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">
            {t('pbr.title')}
          </h3>
        </div>
        <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span>
            {t('pbr.vitalZone')} ({lengthSym})
          </span>
          <input
            type="number"
            min={0}
            step={0.5}
            value={vitalDisplay}
            onChange={e => handleVitalChange(e.target.value)}
            data-testid="pbr-vital-input"
            className="w-16 bg-muted/40 border border-border rounded-md px-1.5 py-0.5 text-xs font-mono text-right focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </label>
      </header>

      {pbr.missingReason === 'insufficient' && (
        <p
          data-testid="pbr-empty"
          className="text-[11px] italic text-muted-foreground/80"
        >
          {t('pbr.unavailable')}
        </p>
      )}

      {pbr.missingReason === 'never-entered' && (
        <p
          data-testid="pbr-never-entered"
          className="text-[11px] italic text-muted-foreground/80"
        >
          {t('pbr.notDeterminable')}
        </p>
      )}

      {pbr.missingReason == null && (
        <div className="space-y-1.5">
          <div className="grid grid-cols-3 gap-2">
            <Slot
              label={t('pbr.range')}
              value={pbr.range != null ? fmtDist(pbr.range) : '—'}
              testId="pbr-range"
              emphasis
            />
            <Slot
              label={t('pbr.start')}
              value={pbr.startDistance != null ? fmtDist(pbr.startDistance) : '—'}
              testId="pbr-start"
            />
            <Slot
              label={t('pbr.end')}
              value={pbr.endDistance != null ? fmtDist(pbr.endDistance) : '—'}
              testId="pbr-end"
              suffix={
                pbr.limitedByComputedRange
                  ? t('pbr.limitedByComputedRange')
                  : undefined
              }
            />
          </div>
          {pbr.maxOrdinateDistance != null && pbr.maxOrdinateMm != null && (
            <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-border/30">
              <Slot
                label={t('pbr.maxOrdinate')}
                value={fmtLen(pbr.maxOrdinateMm)}
                testId="pbr-max-ordinate"
                muted
              />
              <Slot
                label={t('pbr.maxOrdinateDistance')}
                value={fmtDist(pbr.maxOrdinateDistance)}
                testId="pbr-max-ordinate-distance"
                muted
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
}

interface SlotProps {
  label: string;
  value: string;
  testId: string;
  emphasis?: boolean;
  muted?: boolean;
  suffix?: string;
}

function Slot({ label, value, testId, emphasis, muted, suffix }: SlotProps) {
  return (
    <div className="flex flex-col min-w-0">
      <span className="text-[9px] uppercase tracking-wide text-muted-foreground/80">
        {label}
      </span>
      <span
        data-testid={testId}
        className={cn(
          'font-mono truncate',
          emphasis ? 'text-sm font-semibold text-foreground' : 'text-xs',
          muted && 'text-muted-foreground',
        )}
        title={suffix ? `${value} (${suffix})` : value}
      >
        {value}
      </span>
      {suffix && (
        <span
          data-testid={`${testId}-suffix`}
          className="text-[9px] italic text-muted-foreground/70 truncate"
        >
          {suffix}
        </span>
      )}
    </div>
  );
}
