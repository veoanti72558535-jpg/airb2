/**
 * Tranche S — Lecture comparative compacte zero / near / far / PBR.
 *
 * Pure présentation : reçoit une session déjà calculée et dérive uniquement
 * via les helpers existants (`computeZeroIntersections`, `computePointBlankRange`).
 * Aucun recalcul moteur, aucune nouvelle physique, aucune persistance globale.
 *
 * - Zero principal = `session.input.zeroRange` (ce que l'utilisateur a saisi).
 * - Near / Far Zero = dérivés des `BallisticResult[]` de la session.
 * - PBR start / end / window = dérivés via le diamètre de zone vitale
 *   actuellement persisté localement (préférence Tranche Q) — partagé entre
 *   les deux sessions de la comparaison pour rester cohérent.
 *
 * Cas d'absence (résultats vides, near/far hors plage, jamais dans la zone
 * vitale, …) → fallback `—` avec libellé i18n explicite, jamais de valeur
 * inventée.
 */
import { Crosshair, Target } from 'lucide-react';
import { useMemo } from 'react';
import { useI18n } from '@/lib/i18n';
import { useUnits } from '@/hooks/use-units';
import { usePbrPrefs } from '@/hooks/use-pbr-prefs';
import { computeZeroIntersections } from '@/lib/zero-intersections';
import { computePointBlankRange } from '@/lib/pbr';
import type { Session } from '@/lib/types';
import { cn } from '@/lib/utils';
import { UnitTagSurface } from '@/components/devtools/UnitTagSurface';

interface Props {
  session: Session;
  /** Either 'A' or 'B' — colour-matches the SessionSummary letter badge. */
  letter: 'A' | 'B';
}

export function PbrZeroReadout({ session, letter }: Props) {
  const { t } = useI18n();
  const { display, symbol } = useUnits();
  const { vitalZoneM } = usePbrPrefs();

  const distSym = symbol('distance');
  const lengthSym = symbol('length');

  const zeros = useMemo(
    () => computeZeroIntersections(session.results),
    [session.results],
  );
  const pbr = useMemo(
    () => computePointBlankRange(session.results, vitalZoneM),
    [session.results, vitalZoneM],
  );

  const fmtDist = (m: number | null | undefined): string =>
    m == null || !Number.isFinite(m)
      ? '—'
      : `${display('distance', m).toFixed(1)} ${distSym}`;

  const vitalDisplay = `${display('length', vitalZoneM).toFixed(1)} ${lengthSym}`;

  const pbrAvailable = pbr.missingReason == null;
  const pbrFallbackLabel =
    pbr.missingReason === 'never-entered'
      ? t('pbr.notDeterminable')
      : pbr.missingReason === 'insufficient'
        ? t('pbr.unavailable')
        : null;

  return (
    <section
      data-testid={`pbr-zero-readout-${letter.toLowerCase()}`}
      aria-label={`${letter} — ${t('compare.pbrZeroTitle')}`}
      className="surface-elevated p-3 space-y-2"
    >
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={cn(
              'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded font-heading font-bold text-[10px] border',
              letter === 'A'
                ? 'bg-primary/15 text-primary border-primary/30'
                : 'bg-secondary/15 text-secondary-foreground border-secondary/30',
            )}
            aria-hidden
          >
            {letter}
          </span>
          <h4 className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground truncate">
            {t('compare.pbrZeroTitle')}
          </h4>
          <UnitTagSurface categories={['distance', 'length']} label="PbrZeroReadout" />
        </div>
        <span className="text-[10px] text-muted-foreground/80 font-mono whitespace-nowrap">
          {t('pbr.vitalZone')}: {vitalDisplay}
        </span>
      </header>

      <div className="grid grid-cols-3 gap-2">
        <Slot
          icon={<Crosshair className="h-3 w-3" aria-hidden />}
          label={t('compare.zeroRange')}
          value={fmtDist(session.input.zeroRange)}
          testId={`readout-${letter.toLowerCase()}-zero`}
          emphasis
        />
        <Slot
          label={t('zeroIntersections.nearZero')}
          value={fmtDist(zeros.nearZeroDistance)}
          testId={`readout-${letter.toLowerCase()}-near`}
          suffix={
            zeros.nearZeroDistance == null
              ? t('zeroIntersections.outOfRange')
              : zeros.nearExactSample
                ? t('zeroIntersections.exactSample')
                : undefined
          }
        />
        <Slot
          label={t('zeroIntersections.farZero')}
          value={fmtDist(zeros.farZeroDistance)}
          testId={`readout-${letter.toLowerCase()}-far`}
          suffix={
            zeros.farZeroDistance == null
              ? t('zeroIntersections.outOfRange')
              : zeros.farExactSample
                ? t('zeroIntersections.exactSample')
                : undefined
          }
        />
      </div>

      <div className="pt-2 border-t border-border/40">
        {pbrAvailable ? (
          <div className="grid grid-cols-3 gap-2">
            <Slot
              icon={<Target className="h-3 w-3" aria-hidden />}
              label={t('pbr.range')}
              value={fmtDist(pbr.range)}
              testId={`readout-${letter.toLowerCase()}-pbr-window`}
              emphasis
            />
            <Slot
              label={t('pbr.start')}
              value={fmtDist(pbr.startDistance)}
              testId={`readout-${letter.toLowerCase()}-pbr-start`}
            />
            <Slot
              label={t('pbr.end')}
              value={fmtDist(pbr.endDistance)}
              testId={`readout-${letter.toLowerCase()}-pbr-end`}
              suffix={
                pbr.limitedByComputedRange
                  ? t('pbr.limitedByComputedRange')
                  : undefined
              }
            />
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[11px] italic text-muted-foreground/80">
            <Target className="h-3 w-3 shrink-0" aria-hidden />
            <span data-testid={`readout-${letter.toLowerCase()}-pbr-empty`}>
              {pbrFallbackLabel}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

interface SlotProps {
  label: string;
  value: string;
  testId: string;
  icon?: React.ReactNode;
  emphasis?: boolean;
  suffix?: string;
}

function Slot({ label, value, testId, icon, emphasis, suffix }: SlotProps) {
  return (
    <div className="flex flex-col min-w-0">
      <span className="flex items-center gap-1 text-[9px] uppercase tracking-wide text-muted-foreground/80">
        {icon}
        <span className="truncate">{label}</span>
      </span>
      <span
        data-testid={testId}
        className={cn(
          'font-mono truncate',
          emphasis ? 'text-sm font-semibold text-foreground' : 'text-xs',
        )}
        title={suffix ? `${value} (${suffix})` : value}
      >
        {value}
      </span>
      {suffix && (
        <span className="text-[9px] italic text-muted-foreground/70 truncate">
          {suffix}
        </span>
      )}
    </div>
  );
}