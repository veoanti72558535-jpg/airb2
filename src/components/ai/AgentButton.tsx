/**
 * Shared AI agent button + response panel.
 * Follows the exact same visual pattern as ShotLineExplainer.
 * Each agent component wraps this with its own prompt logic.
 */
import { useState, useCallback } from 'react';
import { Sparkles, Loader2, ExternalLink, Database, RefreshCw } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { queryAIWithCache, invalidateCache, buildCacheKey } from '@/lib/ai/agent-cache';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error' }
  | {
      status: 'done';
      text: string;
      provider: string;
      model: string;
      runId: string;
      fromCache: boolean;
      cachedAt?: string;
    };

interface Props {
  agentSlug: string;
  prompt: string;
  buttonLabel: string;
  testIdPrefix: string;
}

export function AgentButton({ agentSlug, prompt, buttonLabel, testIdPrefix }: Props) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [state, setState] = useState<State>({ status: 'idle' });

  const runQuery = useCallback(
    async (forceRefresh: boolean) => {
      setState({ status: 'loading' });
      const result = await queryAIWithCache(
        { agent_slug: agentSlug, prompt, forceRefresh },
        user?.id ?? '',
      );
      if (result.ok) {
        setState({
          status: 'done',
          text: result.data.text,
          provider: result.data.provider,
          model: result.data.model,
          runId: result.data.run_id,
          fromCache: result.data.fromCache,
          cachedAt: result.data.cachedAt,
        });
      } else {
        setState({ status: 'error' });
      }
    },
    [agentSlug, prompt, user?.id],
  );

  const handleClick = useCallback(() => {
    if (state.status === 'loading') return;
    void runQuery(false);
  }, [runQuery, state.status]);

  const handleRefresh = useCallback(async () => {
    if (!user?.id) return;
    await invalidateCache(agentSlug, user.id, buildCacheKey(agentSlug, prompt));
    void runQuery(true);
  }, [agentSlug, prompt, user?.id, runQuery]);

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
        {state.fromCache ? (
          <span
            data-testid={`${testIdPrefix}-badge-cache`}
            title={state.cachedAt ? new Date(state.cachedAt).toLocaleString() : undefined}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wide bg-muted border border-border text-muted-foreground"
          >
            <Database className="h-2.5 w-2.5" />
            {t('agentButton.fromCache' as any)}
          </span>
        ) : (
          <span
            data-testid={`${testIdPrefix}-badge-fresh`}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wide bg-primary/15 border border-primary/30 text-primary"
          >
            {t('agentButton.fresh' as any)}
          </span>
        )}
        <span
          data-testid={`${testIdPrefix}-badge-confidence`}
          className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wide bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400"
        >
          {t('shotLineExplainer.badge.confidence')}
        </span>
        {state.fromCache && user?.id && (
          <button
            type="button"
            onClick={() => void handleRefresh()}
            data-testid={`${testIdPrefix}-refresh`}
            className="inline-flex items-center gap-1 text-[9px] text-primary/70 hover:text-primary"
          >
            <RefreshCw className="h-2.5 w-2.5" />
            {t('agentButton.refresh' as any)}
          </button>
        )}
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