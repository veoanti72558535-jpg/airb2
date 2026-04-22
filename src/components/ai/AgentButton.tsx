/**
 * Shared AI agent button + response panel.
 * Follows the exact same visual pattern as ShotLineExplainer.
 * Each agent component wraps this with its own prompt logic.
 */
import { useState, useCallback } from 'react';
import { Sparkles, Loader2, ExternalLink } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { queryAIViaEdge } from '@/lib/ai/edge-client';
import { cn } from '@/lib/utils';

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'done'; text: string; provider: string; model: string; runId: string };

interface Props {
  agentSlug: string;
  prompt: string;
  buttonLabel: string;
  testIdPrefix: string;
}

export function AgentButton({ agentSlug, prompt, buttonLabel, testIdPrefix }: Props) {
  const { t } = useI18n();
  const [state, setState] = useState<State>({ status: 'idle' });

  const handleClick = useCallback(async () => {
    if (state.status === 'loading') return;
    setState({ status: 'loading' });
    const result = await queryAIViaEdge({ agent_slug: agentSlug, prompt });
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
  }, [agentSlug, prompt, state.status]);

  if (state.status === 'idle') {
    return (
      <button
        type="button"
        onClick={handleClick}
        data-testid={`${testIdPrefix}-btn`}
        className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border border-primary/30 text-primary/70 hover:text-primary hover:bg-primary/10 transition-colors"
      >
        <Sparkles className="h-3 w-3" />
        {buttonLabel}
      </button>
    );
  }

  if (state.status === 'loading') {
    return (
      <span
        data-testid={`${testIdPrefix}-loading`}
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
        data-testid={`${testIdPrefix}-error`}
        className="text-[10px] text-destructive italic"
      >
        {t('shotLineExplainer.error')}
      </span>
    );
  }

  return (
    <div
      data-testid={`${testIdPrefix}-result`}
      className={cn(
        'rounded-md border border-primary/20 bg-primary/5 p-2 space-y-1.5',
        'text-[11px] text-foreground/90 italic leading-relaxed',
      )}
    >
      <p>{state.text}</p>
      <div className="flex flex-wrap items-center gap-1.5 not-italic">
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wide bg-muted border border-border text-muted-foreground">
          {state.provider}
        </span>
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wide bg-muted border border-border text-muted-foreground">
          {state.model}
        </span>
        <span
          data-testid={`${testIdPrefix}-badge-confidence`}
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
    </div>
  );
}