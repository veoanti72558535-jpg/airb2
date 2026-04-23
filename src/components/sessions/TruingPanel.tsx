import React, { useMemo, useState } from 'react';
import { Target, AlertTriangle, CheckCircle, RotateCcw, Save, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';
import { calibrateBC, type CalibrationResult } from '@/lib/calibration';
import { calculateTrajectory } from '@/lib/ballistics';
import { projectileStore } from '@/lib/storage';
import type { Session } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

// ── Validation constants ────────────────────────────────────────────────
const DIST_MIN = 5;
const DIST_MAX = 500;
const DROP_MIN = -50_000;
const DROP_MAX = 5_000;
/** Round to 0.1 mm — reject anything with more decimals. */
function dropPrecisionOk(v: number): boolean {
  return Math.abs(v * 10 - Math.round(v * 10)) < 1e-9;
}

interface TruingPanelProps {
  session: Session;
  onBcCorrected: (correctedBc: number, projectileId?: string, calibrationEntry?: import('@/lib/types').CalibrationHistoryEntry) => void;
}

type Step = 'input' | 'result' | 'apply';

function factorBadge(factor: number, t: (k: string) => string) {
  if (factor >= 0.95 && factor <= 1.05)
    return { color: 'bg-green-500/15 text-green-400 border-green-500/30', label: t('truing.bcStable') };
  if (factor >= 0.8 && factor < 0.95)
    return { color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30', label: t('truing.bcReduced') };
  if (factor > 1.05 && factor <= 1.2)
    return { color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30', label: t('truing.bcIncreased') };
  if (factor < 0.8)
    return { color: 'bg-orange-500/15 text-orange-400 border-orange-500/30', label: t('truing.bcReduced') };
  return { color: 'bg-orange-500/15 text-orange-400 border-orange-500/30', label: t('truing.bcIncreased') };
}

function enginePrediction(session: Session, distance: number): number | null {
  if (distance <= 0 || distance > 1000) return null;
  try {
    const results = calculateTrajectory({
      ...session.input,
      maxRange: distance,
      rangeStep: distance,
    });
    const row = results.find(r => r.range === distance);
    return row ? row.drop : null;
  } catch {
    return null;
  }
}

export function TruingPanel({ session, onBcCorrected }: TruingPanelProps) {
  const { t } = useI18n();
  const [step, setStep] = useState<Step>('input');
  const [distanceRaw, setDistanceRaw] = useState('50');
  const [dropMm, setDropMm] = useState('');
  const [result, setResult] = useState<CalibrationResult | null>(null);
  const [confirmExtreme, setConfirmExtreme] = useState(false);
  const [errors, setErrors] = useState<{ distance?: string; drop?: string }>({});

  const distance = parseFloat(distanceRaw) || 0;

  const predicted = useMemo(() => enginePrediction(session, distance), [session, distance]);

  /** Validate both fields, return true if valid. */
  const validate = (): boolean => {
    const next: { distance?: string; drop?: string } = {};
    // Distance
    const d = parseFloat(distanceRaw);
    if (!Number.isFinite(d)) {
      next.distance = t('truing.errDistRequired');
    } else if (d < DIST_MIN) {
      next.distance = t('truing.errDistMin');
    } else if (d > DIST_MAX) {
      next.distance = t('truing.errDistMax');
    } else if (d <= session.input.zeroRange) {
      next.distance = t('truing.errDistBeyondZero').replace('{zero}', String(session.input.zeroRange));
    }
    // Drop
    const m = parseFloat(dropMm);
    if (!dropMm.trim() || !Number.isFinite(m)) {
      next.drop = t('truing.errDropRequired');
    } else if (m < DROP_MIN) {
      next.drop = t('truing.errDropMin');
    } else if (m > DROP_MAX) {
      next.drop = t('truing.errDropMax');
    } else if (!dropPrecisionOk(m)) {
      next.drop = t('truing.errDropPrecision');
    }
    setErrors(next);
    return !next.distance && !next.drop;
  };

  const handleCalculate = () => {
    if (!validate()) return;
    const measured = Math.round(parseFloat(dropMm) * 10) / 10;
    try {
      const r = calibrateBC({ session, measuredDistance: distance, measuredDropMm: measured });
      setResult(r);
      setStep('result');
      setConfirmExtreme(false);
    } catch (e: any) {
      toast.error(e.message ?? 'Calibration error');
    }
  };

  const handleSaveNewProjectile = () => {
    if (!result) return;
    const original = session.projectileId
      ? projectileStore.getById(session.projectileId)
      : null;
    const date = new Date().toISOString().slice(0, 10);
    const baseName = original ? `${original.brand} ${original.model}` : 'Projectile';
    const newProj = projectileStore.create({
      brand: original?.brand ?? '',
      model: original ? `${original.model} (truing ${date})` : `Truing ${date}`,
      weight: original?.weight ?? session.input.projectileWeight,
      bc: result.correctedBc,
      caliber: original?.caliber ?? '',
      projectileType: original?.projectileType,
      shape: original?.shape,
      length: original?.length,
      diameter: original?.diameter,
      notes: `BC calibré depuis ${baseName}. Facteur ×${result.factor.toFixed(3)}`,
    });
    toast.success(t('truing.created'));
    const entry: import('@/lib/types').CalibrationHistoryEntry = {
      date: new Date().toISOString(),
      originalBc: result.originalBc,
      correctedBc: result.correctedBc,
      factor: result.factor,
      measuredDistance: distance,
      measuredDropMm: parseFloat(dropMm),
      derivedProjectileId: newProj.id,
    };
    onBcCorrected(result.correctedBc, newProj.id, entry);
  };

  const handleApplySession = () => {
    if (!result) return;
    const entry: import('@/lib/types').CalibrationHistoryEntry = {
      date: new Date().toISOString(),
      originalBc: result.originalBc,
      correctedBc: result.correctedBc,
      factor: result.factor,
      measuredDistance: distance,
      measuredDropMm: parseFloat(dropMm),
    };
    onBcCorrected(result.correctedBc, undefined, entry);
  };

  const handleRestart = () => {
    setStep('input');
    setResult(null);
    setDropMm('');
    setConfirmExtreme(false);
  };

  const pctChange = result ? ((result.factor - 1) * 100).toFixed(1) : '';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">{t('truing.title')}</h3>
      </div>
      <p className="text-xs text-muted-foreground">{t('truing.subtitle')}</p>

      {/* Step 1: Input */}
      {step === 'input' && (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium">{t('truing.measuredDist')}</label>
            <input
              type="number"
              min={10}
              max={500}
              value={distance}
              onChange={e => setDistance(Math.max(10, Math.min(500, parseInt(e.target.value) || 10)))}
              className="mt-1 w-full bg-muted border border-border rounded-md px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-xs font-medium">{t('truing.measuredDrop')}</label>
            <input
              type="number"
              step="0.1"
              value={dropMm}
              onChange={e => setDropMm(e.target.value)}
              placeholder="-120"
              className="mt-1 w-full bg-muted border border-border rounded-md px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <p className="text-[10px] text-muted-foreground mt-1">{t('truing.dropHint')}</p>
          </div>
          {predicted !== null && (
            <div className="text-xs font-mono text-muted-foreground bg-muted/50 rounded px-3 py-2">
              {t('truing.enginePredicts')} <span className="text-foreground font-semibold">{predicted.toFixed(1)} mm</span> {t('truing.atDistance')}
            </div>
          )}
          <button
            type="button"
            onClick={handleCalculate}
            disabled={!dropMm || !Number.isFinite(parseFloat(dropMm))}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40"
          >
            <ArrowRight className="h-3.5 w-3.5" />
            {t('truing.calculate')}
          </button>
        </div>
      )}

      {/* Step 2: Result */}
      {step === 'result' && result && (
        <div className="space-y-3">
          {/* Factor badge */}
          {(() => {
            const b = factorBadge(result.factor, t);
            return (
              <Badge variant="outline" className={`${b.color} text-xs`}>
                {b.label} — ×{result.factor.toFixed(3)} ({pctChange}%)
              </Badge>
            );
          })()}

          {/* Data grid */}
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="bg-muted rounded px-2 py-1.5">
              <span className="text-muted-foreground">{t('truing.originalBc')}</span>
              <div className="font-semibold">{result.originalBc.toFixed(4)}</div>
            </div>
            <div className="bg-muted rounded px-2 py-1.5">
              <span className="text-muted-foreground">{t('truing.correctedBc')}</span>
              <div className="font-semibold">{result.correctedBc.toFixed(4)}</div>
            </div>
            <div className="bg-muted rounded px-2 py-1.5">
              <span className="text-muted-foreground">{t('truing.predictedBefore')}</span>
              <div>{result.predictedDropMm.toFixed(1)} mm</div>
            </div>
            <div className="bg-muted rounded px-2 py-1.5">
              <span className="text-muted-foreground">{t('truing.predictedAfter')}</span>
              <div>{result.achievedDropMm.toFixed(1)} mm</div>
            </div>
            <div className="bg-muted rounded px-2 py-1.5">
              <span className="text-muted-foreground">{t('truing.measured')}</span>
              <div>{parseFloat(dropMm).toFixed(1)} mm</div>
            </div>
            <div className="bg-muted rounded px-2 py-1.5">
              <span className="text-muted-foreground">{t('truing.converged')}</span>
              <div>{result.iterations}</div>
            </div>
          </div>

          {/* Warnings */}
          {result.warning === 'extreme' && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p>{t('truing.warnExtreme')}</p>
                {!confirmExtreme && (
                  <button
                    type="button"
                    onClick={() => setConfirmExtreme(true)}
                    className="mt-1 underline text-[10px]"
                  >
                    {t('truing.confirmExtreme')}
                  </button>
                )}
              </div>
            </div>
          )}
          {result.warning === 'noConvergence' && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <p>{t('truing.warnNoConv')}</p>
            </div>
          )}

          {/* Action buttons */}
          {(!result.warning || result.warning === 'extreme' && confirmExtreme) && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleSaveNewProjectile}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
              >
                <Save className="h-3.5 w-3.5" />
                {t('truing.saveNew')}
              </button>
              <button
                type="button"
                onClick={handleApplySession}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-border text-sm font-medium hover:bg-muted"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                {t('truing.applySession')}
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleRestart}
            className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md border border-dashed border-border text-[11px] text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5"
          >
            <RotateCcw className="h-3 w-3" />
            {t('truing.restart')}
          </button>
        </div>
      )}
    </div>
  );
}