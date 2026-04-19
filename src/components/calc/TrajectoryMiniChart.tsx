/**
 * Tranche P / R — Mini-graphique inline trajectoire vs ligne de visée.
 *
 * Présentation pure : reçoit les `BallisticResult[]` déjà produits par le
 * moteur et trace, dans un SVG sans dépendance, la ligne de visée (axe
 * horizontal à 0) et la courbe de chute (`result.drop` en mm). Les
 * marqueurs Near/Far Zero sont superposés à la position fournie.
 *
 * Tranche R — superpose en plus, si fournis :
 *  - une bande horizontale ± rayon de zone vitale autour de la LOS,
 *  - les bornes verticales de la fenêtre PBR (début / fin),
 *  - un marqueur d'apex (max ordinate) si dans la plage.
 *
 * Aucune physique — uniquement de l'affichage. Mobile-first : ratio fixe,
 * scale linéaire automatique, axes minimalistes.
 */
import { useMemo } from 'react';
import { Crosshair } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useUnits } from '@/hooks/use-units';
import { cn } from '@/lib/utils';
import type { BallisticResult } from '@/lib/types';

interface PbrOverlay {
  /** Diamètre de zone vitale (m). Trace la bande ± diameter/2 autour de LOS. */
  vitalZoneM: number;
  /** Début de la fenêtre PBR (m). Null si non déterminable. */
  startDistance: number | null;
  /** Fin de la fenêtre PBR (m). Null si non déterminable. */
  endDistance: number | null;
  /** Distance de l'apex (m) ; null si non disponible. */
  apexDistance?: number | null;
  /** Hauteur de l'apex en mm au-dessus de LOS ; null si non disponible. */
  apexMm?: number | null;
  /** True si la fin est limitée par la plage calculée — l'extrémité de la bande
   *  ne doit alors pas être dessinée comme une borne dure. */
  limitedByComputedRange?: boolean;
}

interface Props {
  rows: BallisticResult[];
  /** Near Zero distance in metres (matches engine units). */
  nearZeroDistance?: number | null;
  /** Far Zero distance in metres. */
  farZeroDistance?: number | null;
  /** Tranche R — overlay PBR optionnel. Absent ou invalide → pas de bande. */
  pbr?: PbrOverlay | null;
  /** Optional collapse / expand title override. */
  title?: string;
  className?: string;
}

const VIEW_W = 320;
const VIEW_H = 120;
const PAD_L = 28;
const PAD_R = 8;
const PAD_T = 8;
const PAD_B = 18;

export function TrajectoryMiniChart({
  rows,
  nearZeroDistance,
  farZeroDistance,
  pbr,
  title,
  className,
}: Props) {
  const { t } = useI18n();
  const { display, symbol } = useUnits();
  const distSym = symbol('distance');
  const lengthSym = symbol('length');

  const geom = useMemo(() => {
    if (!rows || rows.length < 2) return null;
    const xs = rows.map(r => r.range);
    const ys = rows.map(r => r.drop); // mm — 0 = ligne de visée
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    let yMin = Math.min(...ys, 0);
    let yMax = Math.max(...ys, 0);
    // Petite marge verticale pour que la courbe ne colle pas au bord.
    const ySpan = Math.max(1, yMax - yMin);
    yMin -= ySpan * 0.08;
    yMax += ySpan * 0.08;

    const innerW = VIEW_W - PAD_L - PAD_R;
    const innerH = VIEW_H - PAD_T - PAD_B;
    const xSpan = Math.max(1, xMax - xMin);
    const finalYSpan = Math.max(1, yMax - yMin);

    const sx = (x: number) => PAD_L + ((x - xMin) / xSpan) * innerW;
    // Y inversé : `drop` positif = trajectoire AU-DESSUS de la LOS,
    // donc affiché plus haut dans le SVG (Y plus petit).
    const sy = (y: number) => PAD_T + (1 - (y - yMin) / finalYSpan) * innerH;

    const losY = sy(0);
    const path = rows
      .map((r, i) => `${i === 0 ? 'M' : 'L'} ${sx(r.range).toFixed(2)} ${sy(r.drop).toFixed(2)}`)
      .join(' ');

    return { sx, sy, losY, path, xMin, xMax, yMin, yMax, innerW, innerH };
  }, [rows]);

  if (!geom) {
    return (
      <section
        data-testid="trajectory-mini-chart-empty"
        className={cn(
          'rounded-xl border border-border bg-card/60 p-3 text-[11px] text-muted-foreground italic',
          className,
        )}
      >
        {t('trajectoryChart.empty')}
      </section>
    );
  }

  const { sx, sy, losY, path, xMin, xMax, yMin, yMax } = geom;

  const fmtDist = (m: number) => `${display('distance', m).toFixed(0)}${distSym}`;
  const fmtDrop = (mm: number) => `${display('length', mm / 1000).toFixed(1)}${lengthSym}`;

  // Distances utilisateur prêtes pour les ticks et marqueurs.
  const xTicks: number[] = (() => {
    // 4 ticks régulièrement espacés, arrondis à un pas plausible.
    const out: number[] = [];
    for (let i = 0; i <= 4; i++) {
      out.push(xMin + ((xMax - xMin) * i) / 4);
    }
    return out;
  })();

  const renderMarker = (
    distM: number | null | undefined,
    label: string,
    testId: string,
  ) => {
    if (distM == null || !Number.isFinite(distM)) return null;
    if (distM < xMin || distM > xMax) return null;
    const cx = sx(distM);
    return (
      <g data-testid={testId}>
        <line
          x1={cx}
          x2={cx}
          y1={PAD_T}
          y2={VIEW_H - PAD_B}
          stroke="hsl(var(--primary))"
          strokeWidth={1}
          strokeDasharray="3 3"
          opacity={0.55}
        />
        <circle
          cx={cx}
          cy={losY}
          r={3.5}
          fill="hsl(var(--primary))"
          stroke="hsl(var(--background))"
          strokeWidth={1.5}
        />
        <text
          x={cx}
          y={PAD_T + 9}
          textAnchor="middle"
          fontSize={9}
          fontWeight={700}
          fill="hsl(var(--primary))"
        >
          {label}
        </text>
      </g>
    );
  };

  // ----- Tranche R — Overlay PBR (bande vitale + bornes + apex) -----
  // On dessine seulement si la zone vitale est valide. La bande horizontale
  // reste affichée même si la fenêtre PBR n'est pas déterminable, car elle
  // illustre fidèlement la marge verticale tolérée. Les bornes verticales
  // start/end ne sont tracées que si elles existent ET tombent dans la plage.
  const pbrLayer = (() => {
    if (!pbr) return null;
    const vz = pbr.vitalZoneM;
    if (!Number.isFinite(vz) || vz <= 0) return null;

    const radiusMm = (vz / 2) * 1000;
    // Cap visuel : ne pas déborder du domaine Y rendu.
    const yTop = sy(Math.min(radiusMm, yMax));
    const yBot = sy(Math.max(-radiusMm, yMin));
    const bandTop = Math.min(yTop, yBot);
    const bandH = Math.abs(yBot - yTop);

    const start = pbr.startDistance;
    const end = pbr.endDistance;
    const hasWindow =
      start != null &&
      end != null &&
      Number.isFinite(start) &&
      Number.isFinite(end) &&
      end >= start;

    // Sub-bande horizontale colorée sur l'intervalle PBR (clamp à la plage).
    let windowRect: JSX.Element | null = null;
    if (hasWindow) {
      const xs = sx(Math.max(xMin, start!));
      const xe = sx(Math.min(xMax, end!));
      if (xe > xs) {
        windowRect = (
          <rect
            data-testid="trajectory-mini-chart-pbr-window"
            x={xs}
            y={bandTop}
            width={xe - xs}
            height={bandH}
            fill="hsl(var(--primary))"
            opacity={0.12}
          />
        );
      }
    }

    // Bornes verticales : on n'affiche start/end que si dans la plage et,
    // pour `end`, seulement s'il n'est pas borné par la plage calculée
    // (ne pas mentir sur une fin inconnue).
    const startInRange =
      start != null && Number.isFinite(start) && start >= xMin && start <= xMax;
    const endInRange =
      end != null && Number.isFinite(end) && end >= xMin && end <= xMax;
    const showEnd = endInRange && !pbr.limitedByComputedRange;

    // Apex
    const apexD = pbr.apexDistance;
    const apexY = pbr.apexMm;
    const apexInRange =
      apexD != null &&
      Number.isFinite(apexD) &&
      apexD >= xMin &&
      apexD <= xMax &&
      apexY != null &&
      Number.isFinite(apexY);

    return (
      <g data-testid="trajectory-mini-chart-pbr">
        {/* Bande horizontale ± rayon vital autour de LOS. */}
        <rect
          data-testid="trajectory-mini-chart-pbr-band"
          x={PAD_L}
          y={bandTop}
          width={VIEW_W - PAD_L - PAD_R}
          height={bandH}
          fill="hsl(var(--primary))"
          opacity={0.06}
          stroke="hsl(var(--primary))"
          strokeOpacity={0.25}
          strokeDasharray="2 2"
          strokeWidth={0.5}
        />
        {windowRect}
        {startInRange && (
          <line
            data-testid="trajectory-mini-chart-pbr-start"
            x1={sx(start!)}
            x2={sx(start!)}
            y1={PAD_T}
            y2={VIEW_H - PAD_B}
            stroke="hsl(var(--primary))"
            strokeWidth={0.75}
            strokeDasharray="2 2"
            opacity={0.7}
          />
        )}
        {showEnd && (
          <line
            data-testid="trajectory-mini-chart-pbr-end"
            x1={sx(end!)}
            x2={sx(end!)}
            y1={PAD_T}
            y2={VIEW_H - PAD_B}
            stroke="hsl(var(--primary))"
            strokeWidth={0.75}
            strokeDasharray="2 2"
            opacity={0.7}
          />
        )}
        {apexInRange && (
          <circle
            data-testid="trajectory-mini-chart-pbr-apex"
            cx={sx(apexD!)}
            cy={sy(apexY!)}
            r={2.5}
            fill="hsl(var(--primary))"
            stroke="hsl(var(--background))"
            strokeWidth={1}
          />
        )}
      </g>
    );
  })();

  return (
    <section
      data-testid="trajectory-mini-chart"
      aria-label={title ?? t('trajectoryChart.title')}
      className={cn('rounded-xl border border-border bg-card/60 p-3', className)}
    >
      <header className="flex items-center gap-1.5 mb-2">
        <Crosshair className="h-3.5 w-3.5 text-primary" aria-hidden />
        <h3 className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">
          {title ?? t('trajectoryChart.title')}
        </h3>
      </header>

      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full h-auto"
        role="img"
        aria-label={t('trajectoryChart.ariaLabel')}
        preserveAspectRatio="none"
        data-testid="trajectory-mini-chart-svg"
      >
        {/* Cadre */}
        <rect
          x={PAD_L}
          y={PAD_T}
          width={VIEW_W - PAD_L - PAD_R}
          height={VIEW_H - PAD_T - PAD_B}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth={0.5}
          opacity={0.5}
        />

        {/* Bande PBR (sous la trajectoire pour ne pas masquer la courbe). */}
        {pbrLayer}

        {/* Ticks X */}
        {xTicks.map((d, i) => (
          <g key={`xt-${i}`}>
            <line
              x1={sx(d)}
              x2={sx(d)}
              y1={VIEW_H - PAD_B}
              y2={VIEW_H - PAD_B + 3}
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={0.5}
              opacity={0.6}
            />
            <text
              x={sx(d)}
              y={VIEW_H - PAD_B + 12}
              textAnchor="middle"
              fontSize={8}
              fill="hsl(var(--muted-foreground))"
            >
              {fmtDist(d)}
            </text>
          </g>
        ))}

        {/* Labels Y (max + min drop) */}
        <text
          x={PAD_L - 4}
          y={sy(yMax) + 3}
          textAnchor="end"
          fontSize={8}
          fill="hsl(var(--muted-foreground))"
        >
          {fmtDrop(yMax)}
        </text>
        <text
          x={PAD_L - 4}
          y={sy(yMin) + 3}
          textAnchor="end"
          fontSize={8}
          fill="hsl(var(--muted-foreground))"
        >
          {fmtDrop(yMin)}
        </text>

        {/* Ligne de visée — y = 0 mm */}
        <line
          data-testid="trajectory-mini-chart-los"
          x1={PAD_L}
          x2={VIEW_W - PAD_R}
          y1={losY}
          y2={losY}
          stroke="hsl(var(--muted-foreground))"
          strokeWidth={1}
          strokeDasharray="2 3"
          opacity={0.7}
        />
        <text
          x={VIEW_W - PAD_R - 2}
          y={losY - 2}
          textAnchor="end"
          fontSize={8}
          fill="hsl(var(--muted-foreground))"
        >
          {t('trajectoryChart.los')}
        </text>

        {/* Courbe de trajectoire */}
        <path
          data-testid="trajectory-mini-chart-path"
          d={path}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Marqueurs Near / Far Zero */}
        {renderMarker(
          nearZeroDistance,
          t('ballisticTable.nearTag'),
          'trajectory-mini-chart-near',
        )}
        {renderMarker(
          farZeroDistance,
          t('ballisticTable.farTag'),
          'trajectory-mini-chart-far',
        )}
      </svg>

      <div className="mt-1 text-[9px] text-muted-foreground/80 flex items-center justify-between gap-2 flex-wrap">
        <span>{t('trajectoryChart.legend')}</span>
        <span className="flex items-center gap-2">
          {(nearZeroDistance != null || farZeroDistance != null) && (
            <span className="text-primary/80 font-semibold uppercase tracking-wide">
              {nearZeroDistance != null && `NZ ${fmtDist(nearZeroDistance)}`}
              {nearZeroDistance != null && farZeroDistance != null && ' · '}
              {farZeroDistance != null && `FZ ${fmtDist(farZeroDistance)}`}
            </span>
          )}
          {pbr &&
            Number.isFinite(pbr.vitalZoneM) &&
            pbr.vitalZoneM > 0 &&
            pbr.startDistance != null &&
            pbr.endDistance != null && (
              <span
                data-testid="trajectory-mini-chart-pbr-legend"
                className="text-primary/80 font-semibold uppercase tracking-wide"
              >
                PBR {fmtDist(pbr.startDistance)}–{fmtDist(pbr.endDistance)}
                {pbr.limitedByComputedRange ? '+' : ''}
              </span>
            )}
        </span>
      </div>
    </section>
  );
}
