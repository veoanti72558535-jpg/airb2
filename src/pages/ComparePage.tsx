import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeftRight, ArrowLeft, Download, FileJson, FileText,
  Image as ImageIcon, Play, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { toPng } from 'html-to-image';
import { useI18n } from '@/lib/i18n';
import { sessionStore } from '@/lib/storage';
import { Session } from '@/lib/types';
import { normalizeSession } from '@/lib/session-normalize';
import {
  SessionDiffEntry,
  buildComparisonRows,
  defaultRange,
  diffSessions,
  downloadBlob,
  exportComparisonCsv,
  exportComparisonJson,
  exportSessionCsv,
  exportSessionJson,
  safeFilename,
} from '@/lib/compare';
import { SessionSummary } from '@/components/compare/SessionSummary';
import { DifferencesList } from '@/components/compare/DifferencesList';
import { ComparisonTable } from '@/components/compare/ComparisonTable';
import { BallisticTable } from '@/components/compare/BallisticTable';
import { PbrZeroReadout } from '@/components/compare/PbrZeroReadout';

/**
 * Dedicated, bookmarkable comparison view for two sessions.
 * URL contract: /compare?a=<sessionId>&b=<sessionId>
 *
 * - Reads both sessions from localStorage via sessionStore.
 * - Tolerates legacy sessions (missing zeroWeather, missing optic, etc.)
 *   thanks to the safe fallbacks in `compare.ts` and the summary card.
 * - Range bounds for the comparison table are user-configurable with
 *   sensible "Target" / "Extended" presets so casual users get a useful
 *   table immediately without touching the controls.
 */
export default function ComparePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const aId = params.get('a') ?? '';
  const bId = params.get('b') ?? '';

  // Normalise at the boundary — every downstream component receives a fully-
  // shaped session even if it was saved by an earlier build.
  const a = useMemo<Session | undefined>(() => {
    const raw = aId ? sessionStore.getById(aId) : undefined;
    return raw ? normalizeSession(raw) : undefined;
  }, [aId]);
  const b = useMemo<Session | undefined>(() => {
    const raw = bId ? sessionStore.getById(bId) : undefined;
    return raw ? normalizeSession(raw) : undefined;
  }, [bId]);

  // Range controls — defaults based on the two sessions' max ranges.
  const initial = useMemo(() => (a && b ? defaultRange(a, b) : { start: 0, end: 50, step: 10 }), [a, b]);
  const [start, setStart] = useState<number>(initial.start);
  const [end, setEnd] = useState<number>(initial.end);
  const [step, setStep] = useState<number>(initial.step);

  // Reset range bounds when the underlying sessions change (deep link reload).
  useEffect(() => {
    setStart(initial.start);
    setEnd(initial.end);
    setStep(initial.step);
  }, [initial.start, initial.end, initial.step]);

  // PNG capture ref must be declared before any early return so hook order stays stable.
  const captureRef = useRef<HTMLDivElement>(null);

  const swap = () => {
    if (!a || !b) return;
    const next = new URLSearchParams(params);
    next.set('a', b.id);
    next.set('b', a.id);
    setParams(next, { replace: true });
  };

  const removeSide = (side: 'a' | 'b') => {
    const next = new URLSearchParams(params);
    next.delete(side);
    setParams(next, { replace: true });
  };

  if (!aId && !bId) {
    return <EmptyState onBack={() => navigate('/sessions')} />;
  }

  if ((aId && !a) || (bId && !b)) {
    return <MissingState onBack={() => navigate('/sessions')} />;
  }

  if (!a || !b) {
    // One side is missing on purpose — let the user pick from /sessions.
    return <PartialState session={a ?? b!} onBack={() => navigate('/sessions')} />;
  }

  const diff: SessionDiffEntry[] = diffSessions(a, b);
  const rows = buildComparisonRows(a, b, { start, end, step });

  // Click unit fallback: prefer A's, then B's, then MRAD.
  const clickUnit: 'MOA' | 'MRAD' = a.input.clickUnit ?? b.input.clickUnit ?? 'MRAD';

  const handlePng = async () => {
    if (!captureRef.current) return;
    try {
      const dataUrl = await toPng(captureRef.current, {
        cacheBust: true,
        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--background')
          ? undefined
          : '#ffffff',
        pixelRatio: 2,
      });
      const a2 = document.createElement('a');
      a2.href = dataUrl;
      a2.download = `compare-${safeFilename(a.name)}-vs-${safeFilename(b.name)}.png`;
      document.body.appendChild(a2);
      a2.click();
      document.body.removeChild(a2);
      toast.success(t('compare.exportPngDone'));
    } catch (e) {
      console.error(e);
      toast.error(t('compare.exportError'));
    }
  };

  const handleCsv = () => {
    downloadBlob(
      `compare-${safeFilename(a.name)}-vs-${safeFilename(b.name)}.csv`,
      exportComparisonCsv(a, b, rows),
      'text/csv',
    );
    toast.success(t('compare.exportDone'));
  };

  const handleJson = () => {
    downloadBlob(
      `compare-${safeFilename(a.name)}-vs-${safeFilename(b.name)}.json`,
      exportComparisonJson(a, b, rows, diff),
      'application/json',
    );
    toast.success(t('compare.exportDone'));
  };

  const handleSessionCsv = (s: Session) => {
    downloadBlob(`session-${safeFilename(s.name)}.csv`, exportSessionCsv(s), 'text/csv');
    toast.success(t('compare.exportDone'));
  };

  const handleSessionJson = (s: Session) => {
    downloadBlob(
      `session-${safeFilename(s.name)}.json`,
      exportSessionJson(s),
      'application/json',
    );
    toast.success(t('compare.exportDone'));
  };

  const applyPreset = (preset: 'target' | 'extended') => {
    if (preset === 'target') {
      // Use the smaller session's distance — mirrors the saved scenarios.
      const targetEnd = Math.min(a.input.maxRange, b.input.maxRange) || initial.end;
      const presetStep = Math.max(5, Math.round(Math.min(a.input.rangeStep, b.input.rangeStep) || 10));
      setStart(0);
      setEnd(targetEnd);
      setStep(presetStep);
    } else {
      setStart(0);
      setEnd(Math.max(a.input.maxRange, b.input.maxRange) || initial.end);
      setStep(10);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 pb-8">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <ArrowLeftRight className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-heading font-bold">{t('compare.title')}</h1>
          </div>
          <p className="text-xs text-muted-foreground font-mono">{t('compare.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Link
            to="/sessions"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border text-xs hover:bg-muted/40"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('compare.backToSessions')}
          </Link>
          <button
            type="button"
            onClick={swap}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border text-xs hover:bg-muted/40"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            {t('compare.swap')}
          </button>
        </div>
      </header>

      <div ref={captureRef} className="space-y-5 bg-background">
        {/* Mixed-profile honesty banner — must sit inside captureRef so the
            PNG export carries the same warning the user saw on screen. */}
        {((a.profileId ?? 'legacy') !== (b.profileId ?? 'legacy')) && (
          <div
            role="alert"
            className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300"
          >
            ⚠ {t('compare.profilesMixedWarning')}
          </div>
        )}

        {/* Bloc A — Summary cards side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <SessionSummary session={a} letter="A" />
          <SessionSummary session={b} letter="B" />
        </div>

        {/* Bloc A.bis — Tranche S : lecture comparative zero / near / far / PBR */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <PbrZeroReadout session={a} letter="A" />
          <PbrZeroReadout session={b} letter="B" />
        </div>

        {/* Bloc B — Differences */}
        <DifferencesList diff={diff} />

        {/* Range controls — drive both the comparison table and downstream exports */}
        <div className="surface-card p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-sm font-heading font-semibold">{t('compare.range')}</h3>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => applyPreset('target')}
                title={t('compare.rangePresetTargetHint')}
                className="text-[11px] px-2 py-1 rounded-md border border-border text-muted-foreground hover:bg-muted/40"
              >
                {t('compare.rangePresetTarget')}
              </button>
              <button
                type="button"
                onClick={() => applyPreset('extended')}
                title={t('compare.rangePresetExtendedHint')}
                className="text-[11px] px-2 py-1 rounded-md border border-border text-muted-foreground hover:bg-muted/40"
              >
                {t('compare.rangePresetExtended')}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <NumberField label={t('compare.rangeStart')} value={start} onChange={setStart} step={5} min={0} />
            <NumberField label={t('compare.rangeEnd')} value={end} onChange={setEnd} step={5} min={start + step} />
            <NumberField label={t('compare.rangeStep')} value={step} onChange={setStep} step={1} min={1} />
          </div>
        </div>

        {/* Bloc C/D — Comparison table per range */}
        <ComparisonTable rows={rows} clickUnit={clickUnit} />

        {/* Per-session enriched ballistic tables */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <BallisticTable rows={a.results ?? []} clickUnit={clickUnit} title={t('compare.tableA')} />
          <BallisticTable rows={b.results ?? []} clickUnit={clickUnit} title={t('compare.tableB')} />
        </div>
      </div>

      {/* Exports + per-session quick actions — outside the capture area so the
          PNG doesn't show the toolbar buttons. */}
      <section className="surface-card p-4 space-y-3">
        <h3 className="text-sm font-heading font-semibold">{t('compare.exportCsv').replace(' CSV', '')}</h3>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleCsv} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-primary/40 text-primary bg-primary/5 text-xs hover:bg-primary/10">
            <FileText className="h-3.5 w-3.5" />
            {t('compare.exportCsv')}
          </button>
          <button onClick={handleJson} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-primary/40 text-primary bg-primary/5 text-xs hover:bg-primary/10">
            <FileJson className="h-3.5 w-3.5" />
            {t('compare.exportJson')}
          </button>
          <button onClick={handlePng} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-primary/40 text-primary bg-primary/5 text-xs hover:bg-primary/10">
            <ImageIcon className="h-3.5 w-3.5" />
            {t('compare.exportPng')}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t border-border/40">
          <SessionActions session={a} letter="A" onCsv={() => handleSessionCsv(a)} onJson={() => handleSessionJson(a)} onRemove={() => removeSide('a')} />
          <SessionActions session={b} letter="B" onCsv={() => handleSessionCsv(b)} onJson={() => handleSessionJson(b)} onRemove={() => removeSide('b')} />
        </div>
      </section>
    </motion.div>
  );
}

function NumberField({
  label, value, onChange, step, min,
}: { label: string; value: number; onChange: (n: number) => void; step?: number; min?: number }) {
  return (
    <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
      {label}
      <input
        type="number"
        value={value}
        onChange={e => {
          const n = Number(e.target.value);
          if (!Number.isNaN(n)) onChange(n);
        }}
        step={step}
        min={min}
        className="bg-muted border border-border rounded-md px-2 py-1 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </label>
  );
}

function SessionActions({
  session, letter, onCsv, onJson, onRemove,
}: {
  session: Session;
  letter: 'A' | 'B';
  onCsv: () => void;
  onJson: () => void;
  onRemove: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="rounded-lg border border-border/60 p-2.5 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold truncate">
          <span className="text-muted-foreground mr-1">{letter}.</span>{session.name}
        </span>
        <button
          type="button"
          onClick={onRemove}
          title={t('common.clear')}
          className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Link
          to={`/calc?session=${session.id}`}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/40"
        >
          <Play className="h-3 w-3" />
          {t('compare.openInCalc')}
        </Link>
        <button onClick={onCsv} className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/40">
          <FileText className="h-3 w-3" />
          {t('compare.exportSessionCsv')}
        </button>
        <button onClick={onJson} className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/40">
          <FileJson className="h-3 w-3" />
          {t('compare.exportSessionJson')}
        </button>
      </div>
    </div>
  );
}

function EmptyState({ onBack }: { onBack: () => void }) {
  const { t } = useI18n();
  return (
    <div className="surface-card p-8 text-center space-y-3">
      <ArrowLeftRight className="h-8 w-8 text-muted-foreground mx-auto" />
      <p className="text-sm text-muted-foreground">{t('compare.selectExactlyTwo')}</p>
      <button onClick={onBack} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs hover:bg-muted/40">
        <ArrowLeft className="h-3.5 w-3.5" />
        {t('compare.backToSessions')}
      </button>
    </div>
  );
}

function MissingState({ onBack }: { onBack: () => void }) {
  const { t } = useI18n();
  return (
    <div className="surface-card p-8 text-center space-y-3">
      <p className="text-sm font-semibold text-destructive">{t('compare.missingSession')}</p>
      <p className="text-xs text-muted-foreground">{t('compare.missingHint')}</p>
      <button onClick={onBack} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs hover:bg-muted/40">
        <ArrowLeft className="h-3.5 w-3.5" />
        {t('compare.backToSessions')}
      </button>
    </div>
  );
}

function PartialState({ session, onBack }: { session: Session; onBack: () => void }) {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      <SessionSummary session={session} letter="A" />
      <div className="surface-card p-6 text-center space-y-3">
        <p className="text-sm text-muted-foreground">{t('compare.selectExactlyTwo')}</p>
        <button onClick={onBack} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs hover:bg-muted/40">
          <ArrowLeft className="h-3.5 w-3.5" />
          {t('compare.backToSessions')}
        </button>
      </div>
    </div>
  );
}

// keep import lint happy when Download is unused if we drop the section header icon
void Download;
