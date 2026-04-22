/**
 * IA2f1 — Shot Line Explainer button + response panel.
 *
 * Renders a small "Explain" button for a ballistic table row.
 * On click, calls the dispatcher via `queryAIViaEdge()` with
 * agent_slug 'shot-line-explainer' and displays the AI response
 * inline with mandatory provider/model/confidence badges.
 *
 * Pure presentation — never touches ballistic engine.
 */
import { useState, useCallback } from 'react';
import { Sparkles, Loader2, ExternalLink } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { queryAIViaEdge } from '@/lib/ai/edge-client';
import type { BallisticResult } from '@/lib/types';
import { cn } from '@/lib/utils';

interface Props {
  row: BallisticResult;
  /** Distance unit label (e.g. "m") */
  distUnit: string;
  /** Length unit label (e.g. "mm") */
  lengthUnit: string;
  /** Velocity unit label (e.g. "m/s") */
  velUnit: string;
  /** Energy unit label (e.g. "J") */
  energyUnit: string;
}

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'done'; text: string; provider: string; model: string; runId: string };

export function ShotLineExplainer({ row, distUnit, lengthUnit, velUnit, energyUnit }: Props) {
  const { t, locale } = useI18n();
  const [state, setState] = useState<State>({ status: 'idle' });

  const handleClick = useCallback(async () => {
    if (state.status === 'loading') return;
    setState({ status: 'loading' });

    const lang = locale === 'fr' ? 'fr' : 'en';
    const prompt = `Distance: ${row.range}${distUnit} | Chute: ${row.drop.toFixed(1)}${lengthUnit} | Vitesse: ${row.velocity.toFixed(0)}${velUnit} | Dérive: ${row.windDrift.toFixed(1)}${lengthUnit} | Énergie: ${row.energy.toFixed(1)}${energyUnit} | Langue: ${lang}`;

    const result = await queryAIViaEdge({
      agent_slug: 'shot-line-explainer',
      prompt,
    });

    if (result.ok) {
      setState({
        status: 'done',
        text: result.data.text,
        provider: result.data.provider,
        model: result.data.model,
        runId: result.data.run_id,
      });
    } else {
      setState({ status: 'error' });
    }
  }, [row, distUnit, lengthUnit, velUnit, energyUnit, locale, state.status]);

  if (state.status === 'idle') {
    return (
      <button
        type="button"
        onClick={handleClick}
        data-testid={`sle-btn-${row.range}`}
        className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border border-primary/30 text-primary/70 hover:text-primary hover:bg-primary/10 transition-colors"
        title={t('shotLineExplainer.button')}
      >
        <Sparkles className="h-3 w-3" />
        {t('shotLineExplainer.button')}
      </button>
    );
  }

  if (state.status === 'loading') {
    return (
      <span
        data-testid={`sle-loading-${row.range}`}
        className="inline-flex items-center gap-1 text-[10px] text-muted-foreground italic"
      >
        <Loader2 className="h-3 w-3 animate-spin" />
        {t('shotLineExplainer.loading')}
      </span>
    );
  }

  if (state.status === 'error') {
    return (
      <span
        data-testid={`sle-error-${row.range}`}
        className="text-[10px] text-destructive italic"
      >
        {t('shotLineExplainer.error')}
      </span>
    );
  }

  // status === 'done'
  return (
    <div
      data-testid={`sle-result-${row.range}`}
      className={cn(
        'rounded-md border border-primary/20 bg-primary/5 p-2 space-y-1.5',
        'text-[11px] text-foreground/90 italic leading-relaxed',
      )}
    >
      <p>{state.text}</p>
      <div className="flex flex-wrap items-center gap-1.5 not-italic">
        <span
          data-testid="sle-badge-provider"
          className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wide bg-muted border border-border text-muted-foreground"
        >
          {state.provider}
        </span>
        <span
          data-testid="sle-badge-model"
          className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wide bg-muted border border-border text-muted-foreground"
        >
          {state.model}
        </span>
        <span
          data-testid="sle-badge-confidence"
          className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wide bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400"
        >
          {t('shotLineExplainer.badge.confidence')}
        </span>
        <a
          href={`/admin/ai?run_id=${state.runId}`}
          className="inline-flex items-center gap-0.5 text-[9px] text-primary/70 hover:text-primary underline"
        >
          <ExternalLink className="h-2.5 w-2.5" />
          {t('shotLineExplainer.viewLog')}
        </a>
      </div>
      <p className="text-[9px] text-muted-foreground not-italic">
        {t('shotLineExplainer.confidence')}
      </p>
    </div>
  );
}