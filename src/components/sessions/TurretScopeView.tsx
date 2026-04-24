import { useMemo, useState } from 'react';
import { Crosshair, RotateCcw, Target } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import ReticleViewer from '@/components/reticles/ReticleViewer';
import type { Optic, Reticle, Session } from '@/lib/types';

/**
 * Vue lunette interactive — Tranche UI réticule.
 *
 * Rend le `ReticleViewer` avec un POI calculé pour une distance choisie
 * dans la SESSION, et expose deux contrôles (élévation / dérive) en MOA
 * pilotant `turretElevationMoa` / `turretWindageMoa`. Mise à jour
 * instantanée (state local), aucune mutation SESSION.
 *
 * Bouton « Snap sur croix » : calcule les valeurs MOA qui ramènent le
 * POI exactement au centre du réticule pour la distance choisie. C'est
 * un raccourci PRESENTATION — il ne modifie ni la SESSION ni la table
 * balistique stockée.
 *
 * IMPORTANT — Ce composant ne touche pas au moteur balistique : il ne
 * fait que mapper drop/drift (mm) → MOA via la même formule que
 * `ReticleViewer.poiNode`, garantissant que le snap ramène le point au
 * centre exact (delta ≤ flottants).
 */

interface Props {
  session: Session;
  optic: Optic;
  reticle: Reticle | null;
}

const STEP = 0.25; // 1/4 MOA, valeur tourelle standard
const MAX_TURRET_MOA = 60; // bornes UI raisonnables : ±60 MOA

/** Conversion linéaire mm @ distanceM → MOA (1 MOA ≈ 1.047 inch @ 100 yd ≈ 3437.75 mrad·mm). */
function mmToMoa(mm: number, distanceM: number): number {
  if (distanceM <= 0) return 0;
  return Math.atan(mm / 1000 / distanceM) * 3437.75;
}

function quantize(v: number, step: number): number {
  return Math.round(v / step) * step;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function fmtMoa(v: number): string {
  if (Math.abs(v) < 0.01) return '0.00';
  return v >= 0 ? `+${v.toFixed(2)}` : v.toFixed(2);
}

export function TurretScopeView({ session, optic, reticle }: Props) {
  const { t } = useI18n();

  // Distances valides issues des résultats SESSION (>0).
  const validDistances = useMemo(
    () => session.results.filter(r => r.range > 0).map(r => r.range),
    [session.results],
  );

  const defaultDistance =
    validDistances.find(d => d === session.input.zeroRange) ??
    validDistances[Math.floor(validDistances.length / 2)] ??
    validDistances[0];

  const [distanceM, setDistanceM] = useState<number>(defaultDistance ?? 0);
  const [elevationMoa, setElevationMoa] = useState<number>(0);
  const [windageMoa, setWindageMoa] = useState<number>(0);

  if (!defaultDistance || validDistances.length === 0) {
    return (
      <div className="surface-card p-6 text-center text-xs text-muted-foreground">
        {t('turretScope.unsupported')}
      </div>
    );
  }

  const row = session.results.find(r => r.range === distanceM) ?? session.results[0];

  // POI MOA brut pour la distance — sans application des tourelles.
  const dropMoaRaw = mmToMoa(row.drop, row.range);
  const driftMoaRaw = mmToMoa(row.windDrift, row.range);

  // POI résiduel (ce que le viewer affichera réellement) en MOA.
  const residualDropMoa = dropMoaRaw - elevationMoa;
  const residualDriftMoa = driftMoaRaw - windageMoa;

  // Approximation viewport : le viewer générique cadre ±10 MIL = ±34.4 MOA.
  const VIEWPORT_MOA = 34.4;
  const poiOff =
    Math.abs(residualDropMoa) > VIEWPORT_MOA ||
    Math.abs(residualDriftMoa) > VIEWPORT_MOA;

  const onSnap = () => {
    setElevationMoa(clamp(quantize(dropMoaRaw, STEP), -MAX_TURRET_MOA, MAX_TURRET_MOA));
    setWindageMoa(clamp(quantize(driftMoaRaw, STEP), -MAX_TURRET_MOA, MAX_TURRET_MOA));
  };

  const onReset = () => {
    setElevationMoa(0);
    setWindageMoa(0);
  };

  return (
    <div className="surface-card p-4 space-y-4" data-testid="turret-scope-view">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Target className="h-3.5 w-3.5 text-primary shrink-0" />
          <div className="min-w-0">
            <h3 className="text-sm font-heading font-semibold truncate">
              {t('turretScope.title')}
            </h3>
            <p className="text-[11px] text-muted-foreground leading-snug">
              {t('turretScope.subtitle')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onSnap}
            title={t('turretScope.snapHint')}
            className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20"
          >
            <Crosshair className="h-3 w-3" />
            {t('turretScope.snap')}
          </button>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40"
          >
            <RotateCcw className="h-3 w-3" />
            {t('turretScope.reset')}
          </button>
        </div>
      </div>

      {/* Scope view */}
      <div className="flex justify-center">
        <div className="rounded-md overflow-hidden border border-border bg-background">
          <ReticleViewer
            reticle={reticle ?? {
              pattern_type: 'mildot',
              focal_plane: optic.focalPlane,
              click_units: optic.clickUnit,
              click_vertical: optic.clickValue,
              illuminated: false,
              true_magnification: optic.magCalibration ?? null,
              name: optic.name,
            }}
            size={280}
            darkMode
            currentMagnification={optic.magCalibration ?? undefined}
            turretElevationMoa={elevationMoa}
            turretWindageMoa={windageMoa}
            showPoiAt={{
              distanceM: row.range,
              dropMm: row.drop,
              driftMm: row.windDrift,
            }}
          />
        </div>
      </div>

      {poiOff && (
        <div className="text-[11px] text-amber-500 dark:text-amber-400 text-center">
          {t('turretScope.poiOff')}
        </div>
      )}

      {/* Controls */}
      <div className="space-y-3">
        {/* Distance */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <label className="text-muted-foreground uppercase tracking-wide">
              {t('turretScope.distance')}
            </label>
            <span className="font-mono font-semibold tabular-nums">{distanceM} m</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {validDistances.map(d => (
              <button
                key={d}
                type="button"
                onClick={() => setDistanceM(d)}
                aria-pressed={d === distanceM}
                className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded font-mono tabular-nums border transition-colors',
                  d === distanceM
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:text-foreground hover:bg-muted/40',
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Elevation turret */}
        <TurretControl
          label={t('turretScope.elevation')}
          value={elevationMoa}
          onChange={setElevationMoa}
          residual={residualDropMoa}
        />

        {/* Windage turret */}
        <TurretControl
          label={t('turretScope.windage')}
          value={windageMoa}
          onChange={setWindageMoa}
          residual={residualDriftMoa}
        />
      </div>
    </div>
  );
}

function TurretControl({
  label,
  value,
  onChange,
  residual,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  residual: number;
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px]">
        <label className="text-muted-foreground uppercase tracking-wide">{label}</label>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'font-mono font-semibold tabular-nums',
              Math.abs(residual) < 0.05 ? 'text-primary' : 'text-foreground',
            )}
          >
            {fmtMoa(value)} {t('turretScope.units')}
          </span>
          <span className="text-[10px] text-muted-foreground tabular-nums">
            (Δ {fmtMoa(residual)})
          </span>
        </div>
      </div>
      <Slider
        value={[value]}
        min={-MAX_TURRET_MOA}
        max={MAX_TURRET_MOA}
        step={STEP}
        onValueChange={v => onChange(v[0] ?? 0)}
        aria-label={label}
      />
    </div>
  );
}