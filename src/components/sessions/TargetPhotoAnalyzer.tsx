/**
 * TargetPhotoAnalyzer — 3-step UI to analyse a paper target photo with the
 * `target-photo-analyzer` AI agent.
 *
 * Steps:
 *  1. Upload + distance entry
 *  2. Loading (preparation → AI call → parsing)
 *  3. Result panel (group size, suggested corrections, warnings)
 *
 * The image stays client-side: it is base64-encoded and sent to the AI
 * dispatcher (via queryAIWithCache) but never persisted. Only the JSON
 * result can optionally be linked to a session as a field measurement.
 */
import { useCallback, useRef, useState } from 'react';
import { Loader2, Upload, RefreshCw, Copy, Link2, AlertTriangle, ImageIcon, Camera, Database } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import {
  prepareTargetPhoto,
  parseTargetAnalysis,
  type TargetAnalysisResult,
  type PreparedPhoto,
} from '@/lib/target-photo';
import { queryAIWithCache } from '@/lib/ai/agent-cache';
import { saveFieldMeasurement } from '@/lib/field-measurements-repo';

const ACCEPTED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const WARN_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

type Stage = 'idle' | 'preparing' | 'sending' | 'parsing';

interface Props {
  sessionId?: string;
  distanceM?: number;
  onAnalysis?: (result: TargetAnalysisResult) => void;
}

export function TargetPhotoAnalyzer({ sessionId, distanceM: initialDistance, onAnalysis }: Props) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [distance, setDistance] = useState<string>(
    initialDistance != null && Number.isFinite(initialDistance) ? String(initialDistance) : '',
  );
  const [stage, setStage] = useState<Stage>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TargetAnalysisResult | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [linked, setLinked] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptFile = useCallback((f: File) => {
    setError(null);
    if (!ACCEPTED_MIME.includes(f.type) && !/\.heic$/i.test(f.name)) {
      setError(t('target.errInvalidType' as any));
      return;
    }
    if (f.size > MAX_FILE_BYTES) {
      setError(t('target.errTooLarge' as any));
      return;
    }
    setFile(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    try {
      setPreviewUrl(URL.createObjectURL(f));
    } catch {
      setPreviewUrl(null);
    }
  }, [previewUrl, t]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) acceptFile(f);
  };
  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) acceptFile(f);
  };
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();

  const reset = () => {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    setStage('idle');
    setLinked(false);
    setFromCache(false);
  };

  const analyze = useCallback(async () => {
    if (!file) return;
    const dist = Number(distance);
    if (!Number.isFinite(dist) || dist <= 0) {
      setError(t('target.errDistance' as any));
      return;
    }
    setError(null);
    setStage('preparing');

    let prepared: PreparedPhoto;
    try {
      prepared = await prepareTargetPhoto(file);
    } catch (e: unknown) {
      setStage('idle');
      setError(t('target.errPrepare' as any));
      return;
    }

    setStage('sending');
    const userPrompt = `Distance de tir : ${dist} m. Analyse la cible.`;
    const ai = await queryAIWithCache(
      {
        agent_slug: 'target-photo-analyzer',
        prompt: userPrompt,
        image_base64: prepared.base64,
        image_mime: prepared.mime,
      },
      user?.id ?? '',
    );

    if (ai.ok !== true) {
      setStage('idle');
      setError(ai.error || t('target.errAi' as any));
      return;
    }

    setStage('parsing');
    const parsed = parseTargetAnalysis(ai.data.text);
    if (!parsed) {
      setStage('idle');
      setError(t('target.errParse' as any));
      return;
    }
    setResult(parsed);
    setFromCache(ai.data.fromCache);
    setStage('idle');
    onAnalysis?.(parsed);
  }, [file, distance, t, user?.id, onAnalysis]);

  const linkToSession = useCallback(async () => {
    if (!result || !sessionId || !user?.id) return;
    const dist = Number(distance);
    const res = await saveFieldMeasurement(
      {
        sessionId,
        distanceM: dist,
        measuredDropMm: result.centerOffsetYmm * -1, // drop = -vertical offset
        measuredWindageMm: result.centerOffsetXmm,
        notes: `[target-photo-analyzer] ${result.notes}`.slice(0, 500),
        conditions: {
          source: 'target-photo-analyzer',
          confidence: result.confidence,
          groupSizeMm: result.groupSizeMm,
          shotCount: result.shotCount,
        },
      },
      user.id,
    );
    if (res.ok) {
      setLinked(true);
      toast.success(t('target.linkedToast' as any));
    } else {
      toast.error(t('target.linkError' as any));
    }
  }, [result, sessionId, user?.id, distance, t]);

  const copyCorrections = useCallback(async () => {
    if (!result) return;
    const text = [
      `Group size : ${result.groupSizeMm.toFixed(1)} mm (${result.groupSizeMoa.toFixed(2)} MOA / ${result.groupSizeMrad.toFixed(2)} MRAD)`,
      `Horizontal correction : ${result.correctionMoa.horizontal.toFixed(2)} MOA / ${result.correctionMrad.horizontal.toFixed(2)} MRAD`,
      `Vertical correction   : ${result.correctionMoa.vertical.toFixed(2)} MOA / ${result.correctionMrad.vertical.toFixed(2)} MRAD`,
      result.notes,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t('target.copied' as any));
    } catch {
      toast.error('Clipboard unavailable');
    }
  }, [result, t]);

  /* ----------------- render ----------------- */

  if (result) {
    const lowConf = result.confidence < 0.5;
    return (
      <div data-testid="target-result" className="space-y-3">
        <div
          className={cn(
            'rounded-md border p-3 space-y-3',
            lowConf
              ? 'border-destructive/40 bg-destructive/5'
              : 'border-primary/30 bg-primary/5',
          )}
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">{t('target.analysed' as any)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {fromCache && (
                <span
                  data-testid="target-cache-badge"
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wide bg-muted border border-border text-muted-foreground"
                >
                  <Database className="h-2.5 w-2.5" />
                  {t('agentButton.fromCache' as any)}
                </span>
              )}
              <span
                data-testid="target-confidence"
                className={cn(
                  'inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wide border',
                  lowConf
                    ? 'bg-destructive/15 text-destructive border-destructive/30'
                    : 'bg-primary/15 text-primary border-primary/30',
                )}
              >
                {t('target.confidence' as any)} : {Math.round(result.confidence * 100)}%
              </span>
            </div>
          </div>

          {lowConf && (
            <div
              data-testid="target-low-conf"
              className="flex items-start gap-2 rounded border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive"
            >
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{t('target.lowConf' as any)}</span>
            </div>
          )}

          {result.warnings.length > 0 && (
            <div data-testid="target-warnings" className="flex flex-wrap gap-1.5">
              {result.warnings.map((w, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-warning/15 text-warning-foreground border border-warning/40"
                >
                  <AlertTriangle className="h-2.5 w-2.5" />
                  {w}
                </span>
              ))}
            </div>
          )}

          {/* Group size */}
          <div className="rounded-md border border-border bg-card p-2.5">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
              {t('target.groupSize' as any)}
            </div>
            <div className="font-mono text-base font-semibold">
              {result.groupSizeMm.toFixed(1)} <span className="text-muted-foreground text-xs">mm</span>
            </div>
            <div className="font-mono text-xs text-muted-foreground mt-0.5">
              {result.groupSizeMoa.toFixed(2)} MOA · {result.groupSizeMrad.toFixed(2)} MRAD
            </div>
          </div>

          {/* Corrections */}
          <div className="rounded-md border border-border bg-card p-2.5 space-y-1.5">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {t('target.corrections' as any)}
            </div>
            <CorrectionLine
              label={t('target.horizontal' as any)}
              moa={result.correctionMoa.horizontal}
              mrad={result.correctionMrad.horizontal}
              positiveLabel={t('target.right' as any)}
              negativeLabel={t('target.left' as any)}
            />
            <CorrectionLine
              label={t('target.vertical' as any)}
              moa={result.correctionMoa.vertical}
              mrad={result.correctionMrad.vertical}
              positiveLabel={t('target.up' as any)}
              negativeLabel={t('target.down' as any)}
            />
          </div>

          {/* Shots + notes */}
          {result.shotCount != null && (
            <p className="text-xs text-muted-foreground">
              {t('target.shots' as any).replace('{n}', String(result.shotCount))}
            </p>
          )}
          {result.notes && (
            <p className="text-xs italic text-foreground/80 leading-relaxed">{result.notes}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs hover:border-primary/40 hover:bg-primary/5"
          >
            <RefreshCw className="h-3 w-3" />
            {t('target.newPhoto' as any)}
          </button>
          {sessionId && user?.id && (
            <button
              type="button"
              onClick={() => void linkToSession()}
              disabled={linked}
              data-testid="target-link-btn"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs hover:bg-primary/90 disabled:opacity-50"
            >
              <Link2 className="h-3 w-3" />
              {linked ? t('target.linked' as any) : t('target.linkSession' as any)}
            </button>
          )}
          <button
            type="button"
            onClick={() => void copyCorrections()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs hover:border-primary/40 hover:bg-primary/5"
          >
            <Copy className="h-3 w-3" />
            {t('target.copyCorrections' as any)}
          </button>
        </div>
      </div>
    );
  }

  if (stage !== 'idle') {
    return (
      <div data-testid="target-loading" className="rounded-md border border-border bg-card p-4 space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span>{t('target.analyzing' as any)}</span>
        </div>
        <ol className="text-xs space-y-1 text-muted-foreground">
          <li className={stage === 'preparing' ? 'text-primary font-medium' : ''}>
            1. {t('target.stagePrepare' as any)}
          </li>
          <li className={stage === 'sending' ? 'text-primary font-medium' : ''}>
            2. {t('target.stageSend' as any)}
          </li>
          <li className={stage === 'parsing' ? 'text-primary font-medium' : ''}>
            3. {t('target.stageParse' as any)}
          </li>
        </ol>
      </div>
    );
  }

  // Stage 1 — upload
  return (
    <div className="space-y-3">
      <div
        data-testid="target-dropzone"
        onDrop={onDrop}
        onDragOver={onDragOver}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        className="rounded-md border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-colors p-6 text-center cursor-pointer"
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          className="hidden"
          onChange={onInputChange}
          data-testid="target-file-input"
        />
        {previewUrl ? (
          <div className="space-y-2">
            <img
              src={previewUrl}
              alt="target preview"
              className="mx-auto max-h-48 rounded border border-border"
            />
            <p className="text-xs text-muted-foreground">{file?.name}</p>
            {file && file.size > WARN_FILE_BYTES && (
              <p className="text-[11px] text-warning-foreground bg-warning/15 inline-block px-2 py-0.5 rounded">
                {t('target.largeFile' as any)}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Upload className="h-6 w-6" />
            <p className="text-sm">{t('target.upload' as any)}</p>
            <p className="text-[11px]">JPG / PNG / WEBP / HEIC · ≤ 10 MB</p>
          </div>
        )}
      </div>

      <div>
        <label className="text-xs text-muted-foreground" htmlFor="target-distance">
          {t('target.distance' as any)}
        </label>
        <input
          id="target-distance"
          type="number"
          inputMode="decimal"
          min={1}
          max={500}
          value={distance}
          onChange={e => setDistance(e.target.value)}
          className="mt-1 w-full bg-muted border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          data-testid="target-distance-input"
        />
      </div>

      {error && (
        <p data-testid="target-error" className="text-xs text-destructive flex items-start gap-1.5">
          <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      <button
        type="button"
        onClick={() => void analyze()}
        disabled={!file || !distance}
        data-testid="target-analyze-btn"
        className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ImageIcon className="h-4 w-4" />
        {t('target.analyze' as any)}
      </button>
    </div>
  );
}

function CorrectionLine({
  label,
  moa,
  mrad,
  positiveLabel,
  negativeLabel,
}: {
  label: string;
  moa: number;
  mrad: number;
  positiveLabel: string;
  negativeLabel: string;
}) {
  const arrow = moa > 0 ? positiveLabel : moa < 0 ? negativeLabel : '—';
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono font-medium">
        {moa.toFixed(2)} MOA · {mrad.toFixed(2)} MRAD
        <span className="ml-2 text-primary">{arrow}</span>
      </span>
    </div>
  );
}
