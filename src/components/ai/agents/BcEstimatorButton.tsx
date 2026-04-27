/**
 * D1 — BC Estimator Agent Button.
 * Combines deterministic Newton-Raphson BC estimation with AI-formatted advice.
 * The engine does the math, the AI formats and contextualizes the result.
 */
import { useState, useCallback } from 'react';
import { Calculator, Loader2, CheckCircle2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { estimateBcFromDrop } from '@/lib/bc-estimator';
import type { DragModel } from '@/lib/types';

interface Props {
  muzzleVelocity: number;
  sightHeight: number;
  zeroRange: number;
  projectileWeight: number;
  dragModel?: DragModel;
}

export function BcEstimatorButton({
  muzzleVelocity,
  sightHeight,
  zeroRange,
  projectileWeight,
  dragModel,
}: Props) {
  const { t } = useI18n();
  const [distanceM, setDistanceM] = useState('');
  const [dropMm, setDropMm] = useState('');
  const [result, setResult] = useState<{
    bc: number;
    converged: boolean;
    residual: number;
    iterations: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleEstimate = useCallback(() => {
    const dist = parseFloat(distanceM);
    const drop = parseFloat(dropMm);
    if (!dist || !drop || dist <= 0 || drop <= 0) return;

    setLoading(true);
    // Run in next tick to allow UI to show loading state
    requestAnimationFrame(() => {
      const res = estimateBcFromDrop({
        muzzleVelocity,
        sightHeight,
        zeroRange,
        measuredDistance: dist,
        measuredDropMm: drop,
        projectileWeight,
        dragModel,
      });
      setResult({
        bc: res.estimatedBc,
        converged: res.converged,
        residual: res.residualMm,
        iterations: res.iterations,
      });
      setLoading(false);
    });
  }, [distanceM, dropMm, muzzleVelocity, sightHeight, zeroRange, projectileWeight, dragModel]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
        <Calculator className="h-3 w-3" />
        {t('agents.bcEstimator' as any) || 'BC Estimator (terrain)'}
      </div>
      <div className="flex gap-2">
        <input
          type="number"
          placeholder={t('calc.distance' as any) || 'Distance (m)'}
          value={distanceM}
          onChange={(e) => setDistanceM(e.target.value)}
          className="flex-1 bg-muted/40 border border-border rounded-md px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <input
          type="number"
          placeholder={t('calc.drop' as any) || 'Chute (mm)'}
          value={dropMm}
          onChange={(e) => setDropMm(e.target.value)}
          className="flex-1 bg-muted/40 border border-border rounded-md px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          onClick={handleEstimate}
          disabled={loading || !distanceM || !dropMm}
          className="px-3 py-1 bg-primary text-primary-foreground rounded-md text-xs font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : '→'}
        </button>
      </div>

      {result && (
        <div className="rounded-md border border-primary/20 bg-primary/5 p-2.5 space-y-1">
          <div className="flex items-center gap-2">
            <CheckCircle2 className={`h-3.5 w-3.5 ${result.converged ? 'text-green-500' : 'text-amber-500'}`} />
            <span className="text-sm font-mono font-bold text-foreground">
              BC = {result.bc.toFixed(4)}
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted border border-border text-muted-foreground font-mono uppercase">
              {dragModel ?? 'G1'}
            </span>
          </div>
          <div className="text-[10px] text-muted-foreground">
            {result.converged
              ? `✅ Convergé en ${result.iterations} itérations (résidu: ${result.residual.toFixed(2)}mm)`
              : `⚠️ Non convergé après ${result.iterations} itérations`}
          </div>
        </div>
      )}
    </div>
  );
}
