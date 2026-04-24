import { useMemo, useState } from 'react';
import { Activity, ChevronDown, ChevronUp, TriangleAlert } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { calculateTrajectory } from '@/lib/ballistics';
import type { BallisticInput, BallisticResult, Session } from '@/lib/types';
import type { Integrator } from '@/lib/ballistics/types';

/**
 * Side-by-side comparison Euler ↔ Heun pour une SESSION existante.
 *
 * Le bouton de bascule recalcule la trajectoire avec l'intégrateur
 * "opposé" à celui figé dans la SESSION. Aucune mutation : les `results`
 * stockés et les `input` ne sont jamais modifiés. La carte sert
 * uniquement à exposer l'erreur numérique de l'intégrateur sur drop /
 * dérive / vitesse pour quelques distances échantillonnées.
 *
 * Avancé uniquement, pour ne pas polluer la vue SESSION standard.
 */

interface Props {
  session: Session;
}

/** Choisit l'intégrateur "alternatif" en fonction de celui de la SESSION. */
function pickAlternate(current: Integrator): Integrator {
  // Trapezoidal et Heun sont tous deux RK2 — on bascule vers Euler.
  if (current === 'euler') return 'heun';
  return 'euler';
}

function integratorLabel(i: Integrator): string {
  if (i === 'heun') return 'Heun (RK2)';
  if (i === 'trapezoidal') return 'Trapezoidal (RK2)';
  return 'Euler';
}

/** Échantillonne ~6 distances en se calant sur la grille existante. */
function pickSampleRanges(rows: BallisticResult[], maxRange: number): number[] {
  if (rows.length === 0) return [];
  const targets = [10, 25, 50, 75, 100, 150, 200, 250, 300, 400, 500].filter(
    r => r <= maxRange,
  );
  const grid = new Set(rows.map(r => r.range));
  const out = targets.filter(r => grid.has(r));
  // Fallback : 6 distances équidistantes dans la table si rien ne matche.
  if (out.length < 3) {
    const step = Math.max(1, Math.floor(rows.length / 6));
    return rows.filter((_, idx) => idx % step === 0).map(r => r.range).slice(0, 6);
  }
  return out.slice(0, 8);
}

function fmt(n: number | undefined, digits: number): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toFixed(digits);
}

function fmtSigned(n: number | undefined, digits: number): string {
  if (n == null || !Number.isFinite(n) || Math.abs(n) < 10 ** -digits) return '0';
  const v = n.toFixed(digits);
  return n > 0 ? `+${v}` : v;
}

export function IntegratorCompareCard({ session }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  const sessionIntegrator: Integrator =
    session.input.engineConfig?.integrator ?? 'euler';
  const altIntegrator = pickAlternate(sessionIntegrator);

  /**
   * Recompute LAZILY — only when the user opens the panel. We clone the
   * input verbatim and override the integrator: every other physics knob
   * stays identical to the SESSION (Cd source, atmosphere, dt, …).
   *
   * Catch errors so a numerically pathological config can't crash the page.
   */
  const altState = useMemo<{ rows: BallisticResult[] | null; error: boolean }>(() => {
    if (!open) return { rows: null, error: false };
    try {
      const altInput: BallisticInput = {
        ...session.input,
        engineConfig: {
          ...(session.input.engineConfig ?? {
            dt: 0.0005,
            atmosphereModel: 'icao-simple',
            windModel: 'lateral-only',
            postProcess: { spinDrift: true, coriolis: false, cant: false, slopeAngle: false },
          }),
          integrator: altIntegrator,
        },
      };
      return { rows: calculateTrajectory(altInput), error: false };
    } catch {
      return { rows: null, error: true };
    }
  }, [open, session.input, altIntegrator]);

  const sampleRanges = useMemo(
    () => pickSampleRanges(session.results, session.input.maxRange),
    [session.results, session.input.maxRange],
  );

  const rows = useMemo(() => {
    if (!altState.rows) return [];
    const altByRange = new Map(altState.rows.map(r => [r.range, r]));
    const baseByRange = new Map(session.results.map(r => [r.range, r]));
    return sampleRanges.map(range => {
      const base = baseByRange.get(range);
      const alt = altByRange.get(range);
      return {
        range,
        base,
        alt,
        dDrop: base && alt ? alt.drop - base.drop : undefined,
        dWind: base && alt ? alt.windDrift - base.windDrift : undefined,
        dVel: base && alt ? alt.velocity - base.velocity : undefined,
      };
    });
  }, [altState.rows, sampleRanges, session.results]);

  const maxAbsDrop = useMemo(() => {
    let m = 0;
    for (const r of rows) {
      if (r.dDrop != null && Math.abs(r.dDrop) > m) m = Math.abs(r.dDrop);
    }
    return m;
  }, [rows]);

  return (
    <div className="surface-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Activity className="h-3.5 w-3.5 text-primary shrink-0" />
          <h3 className="text-sm font-heading font-semibold truncate">
            {t('integratorCompare.title')}
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
          className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
        >
          {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {open ? t('integratorCompare.toggleOff') : t('integratorCompare.toggleOn')}
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap text-[10px]">
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/30 font-medium">
          {t('integratorCompare.sessionUses')}: {integratorLabel(sessionIntegrator)}
        </span>
        <span className="text-muted-foreground">↔</span>
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border font-medium">
          {t('integratorCompare.alt')}: {integratorLabel(altIntegrator)}
        </span>
      </div>

      {!open && (
        <p className="text-[11px] text-muted-foreground leading-snug">
          {t('integratorCompare.hint')}
        </p>
      )}

      {open && altState.error && (
        <div className="flex items-start gap-2 text-[11px] text-destructive border border-destructive/40 bg-destructive/5 rounded-md px-2.5 py-2">
          <TriangleAlert className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{t('integratorCompare.errorRecalc')}</span>
        </div>
      )}

      {open && !altState.error && rows.length > 0 && (
        <>
          <div className="overflow-x-auto -mx-1 px-1">
            <table className="w-full text-xs font-mono border-collapse">
              <thead>
                <tr className="text-[10px] uppercase text-muted-foreground border-b border-border/40">
                  <th rowSpan={2} className="text-left py-1.5 pr-3">
                    {t('integratorCompare.colRange')}
                  </th>
                  <th colSpan={3} className="text-center px-2 py-1 border-l border-border/40">
                    {t('integratorCompare.colDrop')}
                    <span className="text-muted-foreground/70 ml-1">(mm)</span>
                  </th>
                  <th colSpan={3} className="text-center px-2 py-1 border-l border-border/40">
                    {t('integratorCompare.colWind')}
                    <span className="text-muted-foreground/70 ml-1">(mm)</span>
                  </th>
                  <th colSpan={3} className="text-center px-2 py-1 border-l border-border/40">
                    {t('integratorCompare.colVelocity')}
                    <span className="text-muted-foreground/70 ml-1">(m/s)</span>
                  </th>
                </tr>
                <tr className="text-[9px] uppercase text-muted-foreground/80 border-b border-border/40">
                  <SubHeaders />
                  <SubHeaders />
                  <SubHeaders />
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.range} className="border-b border-border/20 hover:bg-muted/20">
                    <td className="py-1.5 pr-3 font-semibold">{r.range}m</td>
                    <Triplet base={r.base?.drop} alt={r.alt?.drop} delta={r.dDrop} digits={1} />
                    <Triplet base={r.base?.windDrift} alt={r.alt?.windDrift} delta={r.dWind} digits={1} />
                    <Triplet base={r.base?.velocity} alt={r.alt?.velocity} delta={r.dVel} digits={0} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-end gap-2 text-[10px] text-muted-foreground">
            <span className="font-medium">{t('integratorCompare.maxAbsDelta')}:</span>
            <span className={cn(
              'font-mono tabular-nums',
              maxAbsDrop > 5 ? 'text-amber-500 dark:text-amber-400' : 'text-foreground',
            )}>
              {fmt(maxAbsDrop, 2)} mm
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function SubHeaders() {
  return (
    <>
      <th className="text-right px-1.5 py-1 border-l border-border/40">A</th>
      <th className="text-right px-1.5 py-1">B</th>
      <th className="text-right px-1.5 py-1">Δ</th>
    </>
  );
}

function Triplet({
  base,
  alt,
  delta,
  digits,
}: {
  base: number | undefined;
  alt: number | undefined;
  delta: number | undefined;
  digits: number;
}) {
  const deltaClass = (() => {
    if (delta == null || Math.abs(delta) < 10 ** -digits) return 'text-muted-foreground';
    return 'text-foreground font-semibold';
  })();
  return (
    <>
      <td className="text-right px-1.5 py-1.5 border-l border-border/40 tabular-nums">
        {fmt(base, digits)}
      </td>
      <td className="text-right px-1.5 py-1.5 tabular-nums">{fmt(alt, digits)}</td>
      <td className={cn('text-right px-1.5 py-1.5 tabular-nums', deltaClass)}>
        {fmtSigned(delta, digits)}
      </td>
    </>
  );
}