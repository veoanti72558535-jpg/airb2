/**
 * AIImportModal — IA-1 (Strelok Pro screenshot → rows JSON, revue humaine).
 *
 * Flux strict (cf. plan §7) :
 *   1. consentement explicite,
 *   2. upload 1 image (PNG/JPEG/WEBP, max ~4 Mo),
 *   3. analyse,
 *   4. PANNEAU DE REVUE OBLIGATOIRE (édition ligne par ligne + suppression),
 *   5. confirmation explicite — alors seulement on `onConfirm()` côté parent.
 *
 * Garde-fous :
 *   - aucune persistance avant clic "Confirmer" ;
 *   - bandeau permanent "Brouillon IA non vérifié" ;
 *   - confiance plafonnée à `'C'` côté schéma utilisateur (forcé en aval).
 *
 * Le composant ne touche JAMAIS le moteur balistique. Il n'écrit pas en
 * localStorage : c'est `CrossValidationPage` qui décide d'attacher le
 * brouillon validé à un cas existant ou d'en créer un nouveau.
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Loader2, AlertTriangle, Upload, Trash2, X, Check, ShieldAlert, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useI18n } from '@/lib/i18n';
import { toast } from 'sonner';
import {
  AIExtractionError,
  aiDraftRowsToUserRows,
  buildAINotes,
  extractStrelokRowsFromScreenshot,
  type AIDraft,
  type AIDraftRow,
  type AIExtractionMeta,
} from '@/lib/ai/strelok-rows';
import type {
  UserReference,
  UserReferenceMeta,
} from '@/lib/cross-validation/user-case-schema';

type Step = 'consent' | 'upload' | 'analyzing' | 'review';

export interface AIImportConfirmPayload {
  reference: UserReference;
  meta: AIExtractionMeta;
  draft: AIDraft;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: AIImportConfirmPayload) => void;
  /** Version Strelok Pro à figer dans `meta.version` (saisie manuelle). */
  defaultStrelokVersion?: string;
  operator?: string;
}

const MAX_BYTES = 4 * 1024 * 1024;

function confidenceColor(score: number | undefined): string {
  if (score === undefined) return 'bg-muted text-muted-foreground';
  if (score >= 0.85) return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400';
  if (score >= 0.6) return 'bg-amber-500/15 text-amber-700 dark:text-amber-400';
  return 'bg-destructive/15 text-destructive';
}

export function AIImportModal({
  open,
  onOpenChange,
  onConfirm,
  defaultStrelokVersion,
  operator,
}: Props) {
  const { t } = useI18n();
  const [step, setStep] = useState<Step>('consent');
  const [file, setFile] = useState<File | null>(null);
  const [draftRows, setDraftRows] = useState<AIDraftRow[]>([]);
  const [draftMeta, setDraftMeta] = useState<AIDraft | null>(null);
  const [aiMeta, setAiMeta] = useState<AIExtractionMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [strelokVersion, setStrelokVersion] = useState<string>(defaultStrelokVersion ?? '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setStep('consent');
    setFile(null);
    setDraftRows([]);
    setDraftMeta(null);
    setAiMeta(null);
    setError(null);
    setStrelokVersion(defaultStrelokVersion ?? '');
  }, [defaultStrelokVersion]);

  const handleClose = useCallback(
    (next: boolean) => {
      if (!next) reset();
      onOpenChange(next);
    },
    [onOpenChange, reset],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_BYTES) {
      setError(t('crossValidation.ai.errorTooLarge'));
      return;
    }
    setError(null);
    setFile(f);
  };

  const runExtraction = async () => {
    if (!file) return;
    setStep('analyzing');
    setError(null);
    try {
      const result = await extractStrelokRowsFromScreenshot(file, { maxBytes: MAX_BYTES });
      setDraftRows(result.draft.rows);
      setDraftMeta(result.draft);
      setAiMeta(result.meta);
      setStep('review');
    } catch (e) {
      const msg =
        e instanceof AIExtractionError
          ? `${e.code} — ${e.message}`
          : e instanceof Error
            ? e.message
            : String(e);
      setError(msg);
      setStep('upload');
    }
  };

  const updateRow = (idx: number, patch: Partial<AIDraftRow>) => {
    setDraftRows((rows) => {
      const next = rows.slice();
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  };

  const deleteRow = (idx: number) => {
    setDraftRows((rows) => rows.filter((_, i) => i !== idx));
  };

  const usableCount = draftRows.length;
  const canConfirm = usableCount >= 1 && strelokVersion.trim().length > 0;

  const handleConfirm = () => {
    if (!canConfirm || !aiMeta || !draftMeta) return;
    const meta: UserReferenceMeta = {
      source: 'strelok-pro',
      version: strelokVersion.trim(),
      // Plafonnement strict — IA-1 ne produit jamais mieux que C.
      confidence: 'C',
      extractionMethod: 'screenshot-ai',
      extractedAt: new Date().toISOString(),
      operator,
      assumptions:
        draftMeta.assumptions && draftMeta.assumptions.length > 0
          ? draftMeta.assumptions.slice(0, 20)
          : undefined,
      notes: buildAINotes(
        aiMeta,
        draftMeta.unreadable.length > 0
          ? `Unreadable cells reported by AI:\n- ${draftMeta.unreadable.slice(0, 30).join('\n- ')}`
          : undefined,
      ),
    };
    const reference: UserReference = {
      meta,
      rows: aiDraftRowsToUserRows(draftRows),
    };
    onConfirm({ reference, meta: aiMeta, draft: { ...draftMeta, rows: draftRows } });
    toast.success(t('crossValidation.ai.confirmed'));
    reset();
    onOpenChange(false);
  };

  const headerByStep = useMemo<Record<Step, string>>(
    () => ({
      consent: t('crossValidation.ai.step.consent'),
      upload: t('crossValidation.ai.step.upload'),
      analyzing: t('crossValidation.ai.step.analyzing'),
      review: t('crossValidation.ai.step.review'),
    }),
    [t],
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            {t('crossValidation.ai.title')}
          </DialogTitle>
          <DialogDescription>{headerByStep[step]}</DialogDescription>
        </DialogHeader>

        {/* Step 1 — consentement */}
        {step === 'consent' && (
          <div className="space-y-3">
            <Alert variant="default">
              <ShieldAlert className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {t('crossValidation.ai.consent.body')}
              </AlertDescription>
            </Alert>
            <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-1">
              <li>{t('crossValidation.ai.consent.bullet1')}</li>
              <li>{t('crossValidation.ai.consent.bullet2')}</li>
              <li>{t('crossValidation.ai.consent.bullet3')}</li>
            </ul>
            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => handleClose(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={() => setStep('upload')}>{t('crossValidation.ai.consent.accept')}</Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 2 — upload */}
        {step === 'upload' && (
          <div className="space-y-3">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs break-words">{error}</AlertDescription>
              </Alert>
            )}
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileChange}
              data-testid="ai-import-file-input"
            />
            {file && (
              <Card>
                <CardContent className="p-3 flex items-center justify-between gap-2">
                  <div className="text-xs">
                    <div className="font-medium">{file.name}</div>
                    <div className="text-muted-foreground">
                      {(file.size / 1024).toFixed(0)} KB · {file.type}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            )}
            <p className="text-xs text-muted-foreground">{t('crossValidation.ai.uploadHint')}</p>
            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => handleClose(false)}>
                {t('common.cancel')}
              </Button>
              <Button disabled={!file} onClick={runExtraction}>
                <Upload className="h-4 w-4 mr-1" />
                {t('crossValidation.ai.startAnalysis')}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 3 — analyzing */}
        {step === 'analyzing' && (
          <div className="py-10 flex flex-col items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div>{t('crossValidation.ai.analyzing')}</div>
            <Button variant="ghost" size="sm" onClick={() => handleClose(false)}>
              {t('common.cancel')}
            </Button>
          </div>
        )}

        {/* Step 4 — review */}
        {step === 'review' && draftMeta && aiMeta && (
          <div className="space-y-3">
            <Alert variant="default" className="border-amber-500/40 bg-amber-500/5">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-xs">
                <strong>{t('crossValidation.ai.banner.title')}</strong>
                <span className="ml-1">{t('crossValidation.ai.banner.body')}</span>
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-muted-foreground">{t('crossValidation.ai.providerUsed')}</div>
                <div className="font-medium">
                  {aiMeta.providerUsed} · {aiMeta.modelUsed}
                  {aiMeta.fallbackUsed && (
                    <Badge variant="outline" className="ml-1 text-[10px]">
                      fallback
                    </Badge>
                  )}
                </div>
              </div>
              <div>
                <label className="text-muted-foreground" htmlFor="strelok-version-input">
                  {t('crossValidation.ai.strelokVersion')}
                </label>
                <Input
                  id="strelok-version-input"
                  className="h-7 text-xs mt-0.5"
                  placeholder="ex. Strelok Pro 6.x.x"
                  value={strelokVersion}
                  onChange={(e) => setStrelokVersion(e.target.value)}
                  data-testid="ai-import-version-input"
                />
              </div>
            </div>

            {draftRows.length === 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {t('crossValidation.ai.review.empty')}
                </AlertDescription>
              </Alert>
            )}

            <div className="overflow-x-auto border rounded">
              <table className="w-full text-xs" data-testid="ai-import-table">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-2 py-1 text-left">range (m)</th>
                    <th className="px-2 py-1 text-left">drop (mm)</th>
                    <th className="px-2 py-1 text-left">vel (m/s)</th>
                    <th className="px-2 py-1 text-left">wind (mm)</th>
                    <th className="px-2 py-1 text-left">tof (s)</th>
                    <th className="px-2 py-1 text-left">E (J)</th>
                    <th className="px-2 py-1"></th>
                  </tr>
                </thead>
                <tbody>
                  {draftRows.map((r, idx) => {
                    const cf = (key: keyof AIDraftRow) =>
                      draftMeta.fieldConfidence[`rows[${idx}].${key}`];
                    return (
                      <tr key={idx} className="border-t">
                        {(['range', 'drop', 'velocity', 'windDrift', 'tof', 'energy'] as const).map(
                          (k) => (
                            <td key={k} className="px-1 py-0.5">
                              <Input
                                type="number"
                                step="any"
                                value={r[k] ?? ''}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  updateRow(idx, {
                                    [k]: v === '' ? undefined : Number(v),
                                  } as Partial<AIDraftRow>);
                                }}
                                className={`h-7 text-xs ${confidenceColor(cf(k))}`}
                              />
                            </td>
                          ),
                        )}
                        <td className="px-1 py-0.5 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={() => deleteRow(idx)}
                            data-testid={`ai-import-delete-row-${idx}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {draftMeta.unreadable.length > 0 && (
              <details className="text-xs border rounded p-2 bg-muted/30">
                <summary className="cursor-pointer font-medium">
                  {t('crossValidation.ai.review.unreadable')} ({draftMeta.unreadable.length})
                </summary>
                <ul className="list-disc pl-4 mt-1 space-y-0.5">
                  {draftMeta.unreadable.map((u, i) => (
                    <li key={i}>{u}</li>
                  ))}
                </ul>
              </details>
            )}

            {draftMeta.assumptions.length > 0 && (
              <details className="text-xs border rounded p-2 bg-muted/30">
                <summary className="cursor-pointer font-medium">
                  {t('crossValidation.ai.review.assumptions')} ({draftMeta.assumptions.length})
                </summary>
                <ul className="list-disc pl-4 mt-1 space-y-0.5">
                  {draftMeta.assumptions.map((u, i) => (
                    <li key={i}>{u}</li>
                  ))}
                </ul>
              </details>
            )}

            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => handleClose(false)}>
                {t('crossValidation.ai.abandon')}
              </Button>
              <Button
                disabled={!canConfirm}
                onClick={handleConfirm}
                data-testid="ai-import-confirm"
              >
                <Check className="h-4 w-4 mr-1" />
                {t('crossValidation.ai.confirm')}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}