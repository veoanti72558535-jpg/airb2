/**
 * BUILD — Affichage détaillé d'un résultat de comparaison (BUILD-B).
 *
 * Composant de présentation pur :
 *  - prend en entrée le `CaseComparisonResult` produit par `runCaseComparison`,
 *  - n'effectue AUCUN calcul moteur,
 *  - n'invente AUCUNE valeur (les métriques absentes côté référence sont
 *    affichées comme telles, pas masquées),
 *  - reste mobile-first (sections repliables par référence).
 *
 * Tous les libellés de statut sont restitués bruts (PASS / INDICATIVE /
 * FAIL) pour rester cohérents avec le harness — la coloration est faite
 * via les tokens sémantiques du design system.
 */

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Info,
  Download,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useI18n } from '@/lib/i18n';
import type {
  CaseComparisonResult,
  ComparableMetric,
  ComparisonStatus,
  LineComparison,
  MetricSummary,
  ReferenceComparisonResult,
} from '@/lib/cross-validation';
import { cn } from '@/lib/utils';

export interface CrossValidationResultsProps {
  result: CaseComparisonResult;
  /** Titre lisible du cas (sinon caseId). */
  caseTitle?: string;
  /** Horodatage local du run. */
  runAt?: string;
  /** Callback Fermer (efface le panneau côté parent). */
  onClose?: () => void;
  /** Callback Export JSON du résultat brut. */
  onExportJson?: () => void;
}

const ALL_METRICS: ComparableMetric[] = [
  'drop',
  'velocity',
  'tof',
  'windDrift',
  'energy',
];

/** Unités canoniques (alignées sur le harness BUILD-B). */
const METRIC_UNIT: Record<ComparableMetric, string> = {
  drop: 'mm',
  velocity: 'm/s',
  tof: 's',
  windDrift: 'mm',
  energy: 'J',
};

/** Précision d'affichage adaptée à chaque métrique. */
const METRIC_DIGITS: Record<ComparableMetric, number> = {
  drop: 1,
  velocity: 1,
  tof: 4,
  windDrift: 1,
  energy: 2,
};

function fmt(value: number | null | undefined, digits: number): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return value.toFixed(digits);
}

function fmtPct(rel: number | null | undefined): string {
  if (rel === null || rel === undefined || !Number.isFinite(rel)) return '—';
  return `${(rel * 100).toFixed(2)} %`;
}

function statusVariant(status: ComparisonStatus) {
  switch (status) {
    case 'PASS':
      return {
        className: 'bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30',
        Icon: CheckCircle2,
      };
    case 'FAIL':
      return {
        className: 'bg-destructive/15 text-destructive border-destructive/30',
        Icon: XCircle,
      };
    case 'INDICATIVE':
    default:
      return {
        className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
        Icon: AlertTriangle,
      };
  }
}

function StatusBadge({ status }: { status: ComparisonStatus }) {
  const { className, Icon } = statusVariant(status);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-medium',
        className,
      )}
      data-testid={`cv-status-${status}`}
    >
      <Icon className="h-3 w-3" />
      {status}
    </span>
  );
}

/** i18n des `kind` de warning (extensible — fallback = detail brut). */
function describeWarningKind(
  kind: string,
  t: (k: string) => string,
): string {
  switch (kind) {
    case 'no-engine-row-at-range':
      return t('crossValidation.warn.noEngineRow');
    case 'no-comparable-metrics':
      return t('crossValidation.warn.noComparableMetrics');
    case 'no-comparable-rows':
      return t('crossValidation.warn.noComparableRows');
    default:
      return kind;
  }
}

export function CrossValidationResults({
  result,
  caseTitle,
  runAt,
  onClose,
  onExportJson,
}: CrossValidationResultsProps) {
  const { t } = useI18n();

  const totals = useMemo(() => {
    const refs = result.perReference;
    return {
      total: refs.length,
      pass: refs.filter((r) => r.status === 'PASS').length,
      indicative: refs.filter((r) => r.status === 'INDICATIVE').length,
      fail: refs.filter((r) => r.status === 'FAIL').length,
      warnings: refs.reduce((s, r) => s + r.warnings.length, 0),
    };
  }, [result]);

  return (
    <Card data-testid="cv-results-panel">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
              <span className="truncate">
                {t('crossValidation.results.title')} — {caseTitle ?? result.caseId}
              </span>
              <StatusBadge status={result.status} />
            </CardTitle>
            <p className="text-[11px] text-muted-foreground font-mono mt-0.5 truncate">
              {result.caseId}
              {runAt ? ` · ${runAt}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {onExportJson && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2"
                onClick={onExportJson}
                data-testid="cv-results-export"
                title={t('crossValidation.results.exportJson')}
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
            )}
            {onClose && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2"
                onClick={onClose}
                data-testid="cv-results-close"
                title={t('crossValidation.results.close')}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-3 pt-0">
        {/* Résumé global */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <Stat
            label={t('crossValidation.results.refsCount')}
            value={String(totals.total)}
          />
          <Stat label="PASS" value={String(totals.pass)} tone="ok" />
          <Stat label="INDIC" value={String(totals.indicative)} tone="warn" />
          <Stat label="FAIL" value={String(totals.fail)} tone="bad" />
        </div>

        {totals.warnings > 0 && (
          <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
            <Info className="h-3 w-3" />
            {t('crossValidation.results.warningsCount').replace(
              '{n}',
              String(totals.warnings),
            )}
          </div>
        )}

        {result.perReference.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {t('crossValidation.results.noReferences')}
          </p>
        ) : (
          <div className="space-y-2">
            {result.perReference.map((ref, idx) => (
              <ReferenceBlock key={idx} index={idx} reference={ref} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'ok' | 'warn' | 'bad';
}) {
  const toneClass =
    tone === 'ok'
      ? 'text-green-600 dark:text-green-400'
      : tone === 'warn'
        ? 'text-amber-600 dark:text-amber-400'
        : tone === 'bad'
          ? 'text-destructive'
          : 'text-foreground';
  return (
    <div className="rounded border border-border bg-muted/30 p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={cn('text-sm font-medium tabular-nums', toneClass)}>{value}</div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Référence (collapsible)
// ----------------------------------------------------------------------------

function ReferenceBlock({
  index,
  reference,
}: {
  index: number;
  reference: ReferenceComparisonResult;
}) {
  const { t } = useI18n();
  // Replié par défaut sauf si statut FAIL (l'utilisateur veut voir ce qui casse).
  const [open, setOpen] = useState(reference.status === 'FAIL');

  const linesCompared = reference.lines.filter((l) => l.metrics.length > 0).length;
  const totalMetricCmps = reference.metricSummaries.reduce((s, m) => s + m.count, 0);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card
        className="border-border/60"
        data-testid={`cv-results-ref-${index}`}
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full text-left p-3 flex items-start justify-between gap-2 hover:bg-muted/40 transition-colors rounded-t"
          >
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                {open ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                )}
                <span className="text-sm font-medium truncate">
                  {reference.source}
                </span>
                <Badge variant="outline" className="text-[10px]">
                  v{reference.version}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {t('crossValidation.results.confidence')} {reference.confidence}
                </Badge>
                <StatusBadge status={reference.status} />
              </div>
              <div className="text-[11px] text-muted-foreground">
                {t('crossValidation.results.linesCompared').replace(
                  '{n}',
                  String(linesCompared),
                )}
                {' · '}
                {t('crossValidation.results.metricsCompared').replace(
                  '{n}',
                  String(totalMetricCmps),
                )}
                {reference.warnings.length > 0 && (
                  <>
                    {' · '}
                    <span className="text-amber-600 dark:text-amber-400">
                      {reference.warnings.length}{' '}
                      {t('crossValidation.results.warnings')}
                    </span>
                  </>
                )}
              </div>
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-3">
            {reference.warnings.length > 0 && (
              <WarningsList
                warnings={reference.warnings.map((w) => ({
                  kind: w.kind,
                  detail: w.detail,
                }))}
              />
            )}

            {reference.confidence === 'C' && (
              <p
                className="text-[11px] text-amber-600 dark:text-amber-400 flex items-start gap-1.5"
                data-testid={`cv-results-ref-${index}-confC-note`}
              >
                <Info className="h-3 w-3 mt-0.5 shrink-0" />
                {t('crossValidation.results.confCNote')}
              </p>
            )}

            {reference.metricSummaries.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                {t('crossValidation.results.noMetricsComparable')}
              </p>
            ) : (
              <>
                <MetricSummaryTable summaries={reference.metricSummaries} />
                <LinesTable lines={reference.lines} />
              </>
            )}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// ----------------------------------------------------------------------------
// Résumé par métrique
// ----------------------------------------------------------------------------

function MetricSummaryTable({ summaries }: { summaries: MetricSummary[] }) {
  const { t } = useI18n();
  return (
    <div className="rounded border border-border overflow-hidden">
      <div className="px-2 py-1.5 bg-muted/40 text-[11px] font-medium text-muted-foreground">
        {t('crossValidation.results.metricSummary')}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="h-8 px-2 text-[11px]">
              {t('crossValidation.results.col.metric')}
            </TableHead>
            <TableHead className="h-8 px-2 text-[11px] text-right">
              {t('crossValidation.results.col.count')}
            </TableHead>
            <TableHead className="h-8 px-2 text-[11px] text-right">
              {t('crossValidation.results.col.failures')}
            </TableHead>
            <TableHead className="h-8 px-2 text-[11px] text-right">
              {t('crossValidation.results.col.maxAbs')}
            </TableHead>
            <TableHead className="h-8 px-2 text-[11px] text-right">
              {t('crossValidation.results.col.maxRel')}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {summaries.map((s) => (
            <TableRow key={s.metric} data-testid={`cv-metric-summary-${s.metric}`}>
              <TableCell className="p-2 text-xs font-mono">
                {s.metric}
                <span className="text-[10px] text-muted-foreground ml-1">
                  ({METRIC_UNIT[s.metric]})
                </span>
              </TableCell>
              <TableCell className="p-2 text-xs text-right tabular-nums">
                {s.count}
              </TableCell>
              <TableCell
                className={cn(
                  'p-2 text-xs text-right tabular-nums',
                  s.failures > 0 && 'text-destructive font-medium',
                )}
              >
                {s.failures}
              </TableCell>
              <TableCell className="p-2 text-xs text-right tabular-nums">
                {fmt(s.maxAbsDelta, METRIC_DIGITS[s.metric])}
              </TableCell>
              <TableCell className="p-2 text-xs text-right tabular-nums">
                {fmtPct(s.maxRelDelta)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Détail par distance — un sous-tableau par métrique présente
// ----------------------------------------------------------------------------

function LinesTable({ lines }: { lines: LineComparison[] }) {
  const { t } = useI18n();

  // Détecter quelles métriques sont effectivement présentes au moins une
  // fois dans la référence — on ne crée pas de colonnes vides.
  const presentMetrics = useMemo(() => {
    const set = new Set<ComparableMetric>();
    for (const line of lines) {
      for (const m of line.metrics) set.add(m.metric);
    }
    return ALL_METRICS.filter((m) => set.has(m));
  }, [lines]);

  if (presentMetrics.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {presentMetrics.map((metric) => (
        <MetricLinesTable key={metric} metric={metric} lines={lines} />
      ))}
      {lines.some((l) => !l.engineRowFound) && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-start gap-1.5">
          <Info className="h-3 w-3 mt-0.5 shrink-0" />
          {t('crossValidation.results.someEngineRowsMissing')}
        </p>
      )}
    </div>
  );
}

function MetricLinesTable({
  metric,
  lines,
}: {
  metric: ComparableMetric;
  lines: LineComparison[];
}) {
  const { t } = useI18n();
  const digits = METRIC_DIGITS[metric];
  const unit = METRIC_UNIT[metric];

  return (
    <div className="rounded border border-border overflow-hidden">
      <div className="px-2 py-1.5 bg-muted/40 text-[11px] font-medium font-mono">
        {metric}{' '}
        <span className="text-muted-foreground">({unit})</span>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-8 px-2 text-[11px]">
                {t('crossValidation.results.col.range')}
              </TableHead>
              <TableHead className="h-8 px-2 text-[11px] text-right">
                {t('crossValidation.results.col.engine')}
              </TableHead>
              <TableHead className="h-8 px-2 text-[11px] text-right">
                {t('crossValidation.results.col.reference')}
              </TableHead>
              <TableHead className="h-8 px-2 text-[11px] text-right">
                Δ abs
              </TableHead>
              <TableHead className="h-8 px-2 text-[11px] text-right">
                Δ rel
              </TableHead>
              <TableHead className="h-8 px-2 text-[11px] text-center w-10">
                {t('crossValidation.results.col.status')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line, idx) => {
              const cmp = line.metrics.find((m) => m.metric === metric);
              const missing = !cmp && line.metricsMissingInReference.includes(metric);
              return (
                <TableRow
                  key={idx}
                  data-testid={`cv-line-${metric}-${line.range}`}
                  className={cn(
                    !line.engineRowFound && 'bg-amber-500/5',
                    cmp && !cmp.withinTolerance && 'bg-destructive/5',
                  )}
                >
                  <TableCell className="p-2 text-xs tabular-nums">
                    {line.range}
                  </TableCell>
                  {!line.engineRowFound ? (
                    <TableCell
                      colSpan={5}
                      className="p-2 text-xs text-amber-600 dark:text-amber-400 italic"
                    >
                      {t('crossValidation.results.noEngineRow')}
                    </TableCell>
                  ) : missing ? (
                    <TableCell
                      colSpan={5}
                      className="p-2 text-xs text-muted-foreground italic"
                    >
                      {t('crossValidation.results.metricMissing')}
                    </TableCell>
                  ) : cmp ? (
                    <>
                      <TableCell className="p-2 text-xs text-right tabular-nums">
                        {fmt(cmp.engineValue, digits)}
                      </TableCell>
                      <TableCell className="p-2 text-xs text-right tabular-nums">
                        {fmt(cmp.referenceValue, digits)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'p-2 text-xs text-right tabular-nums',
                          !cmp.withinTolerance && 'text-destructive font-medium',
                        )}
                      >
                        {fmt(cmp.absoluteDelta, digits)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'p-2 text-xs text-right tabular-nums',
                          !cmp.withinTolerance && 'text-destructive font-medium',
                        )}
                      >
                        {fmtPct(cmp.relativeDelta)}
                      </TableCell>
                      <TableCell className="p-2 text-xs text-center">
                        {cmp.withinTolerance ? (
                          <CheckCircle2
                            className="h-3.5 w-3.5 inline text-green-600 dark:text-green-400"
                            aria-label="ok"
                          />
                        ) : (
                          <XCircle
                            className="h-3.5 w-3.5 inline text-destructive"
                            aria-label="fail"
                          />
                        )}
                      </TableCell>
                    </>
                  ) : (
                    <TableCell
                      colSpan={5}
                      className="p-2 text-xs text-muted-foreground italic"
                    >
                      —
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Warnings
// ----------------------------------------------------------------------------

function WarningsList({
  warnings,
}: {
  warnings: { kind: string; detail: string }[];
}) {
  const { t } = useI18n();
  return (
    <div className="rounded border border-amber-500/30 bg-amber-500/5 p-2 space-y-1">
      <div className="text-[11px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        {t('crossValidation.results.warnings')}
      </div>
      <ul className="text-[11px] space-y-0.5 list-disc pl-4">
        {warnings.map((w, i) => (
          <li key={i}>
            <span className="font-mono">{describeWarningKind(w.kind, t)}</span>
            {w.detail ? <span className="opacity-70"> — {w.detail}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default CrossValidationResults;