/**
 * Shared base for web-search agents.
 *
 * - Single text input + a "Search" button.
 * - Calls `queryAIWithCache()` with the given agent slug and the user query.
 * - Parses the model response as JSON (the system prompt of every agent
 *   enforces a strict JSON output).
 * - Exposes the parsed object and a re-renderable result body via the
 *   `renderResult` render-prop. Cache badge + refresh button are handled
 *   here, identical to the existing AgentButton pattern.
 *
 * This component is INTENTIONALLY tiny — it does NOT touch edge-client.ts
 * and does NOT modify the cache behaviour. Each per-agent file just supplies
 * a slug, label and renderer.
 */
import { useCallback, useState, type ReactNode } from 'react';
import { Sparkles, Loader2, Database, RefreshCw, ExternalLink } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth-context';
import {
  queryAIWithCache,
  invalidateCache,
  buildCacheKey,
} from '@/lib/ai/agent-cache';

type State<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'done';
      raw: string;
      data: T | null;
      provider: string;
      model: string;
      runId: string;
      fromCache: boolean;
      cachedAt?: string;
    };

export interface WebSearchAgentBaseProps<T> {
  agentSlug: string;
  /** Test-id prefix — also used for stable accessor selectors. */
  testIdPrefix: string;
  /** Placeholder for the query input. */
  inputPlaceholder: string;
  /** Search button label. */
  searchLabel: string;
  /** Optional pre-filled query. */
  initialQuery?: string;
  /** How to convert the user query into the prompt sent to the model.
   *  Default: identity. */
  buildPrompt?: (query: string) => string;
  /** Render the parsed JSON payload as React. */
  renderResult: (data: T, ctx: { rawText: string }) => ReactNode;
  /** Called once parsing succeeds — lets the parent react (e.g. import). */
  onResult?: (data: T) => void;
}

/** Try to extract the first JSON object from `text`. Tolerates ``` fences. */
function tryParseJson<T>(text: string): T | null {
  if (!text) return null;
  let cleaned = text.trim();
  // Strip markdown fences
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  // Find first { and last }
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) return null;
  const slice = cleaned.slice(first, last + 1);
  try {
    return JSON.parse(slice) as T;
  } catch {
    return null;
  }
}

export function WebSearchAgentBase<T>({
  agentSlug,
  testIdPrefix,
  inputPlaceholder,
  searchLabel,
  initialQuery = '',
  buildPrompt,
  renderResult,
  onResult,
}: WebSearchAgentBaseProps<T>) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [query, setQuery] = useState(initialQuery);
  const [state, setState] = useState<State<T>>({ status: 'idle' });

  const runQuery = useCallback(
    async (forceRefresh: boolean) => {
      const trimmed = query.trim();
      if (!trimmed) return;
      setState({ status: 'loading' });
      const prompt = buildPrompt ? buildPrompt(trimmed) : trimmed;
      const result = await queryAIWithCache(
        { agent_slug: agentSlug, prompt, forceRefresh },
        user?.id ?? '',
      );
      if (!result.ok) {
        setState({ status: 'error', message: result.error });
        return;
      }
      const parsed = tryParseJson<T>(result.data.text);
      setState({
        status: 'done',
        raw: result.data.text,
        data: parsed,
        provider: result.data.provider,
        model: result.data.model,
        runId: result.data.run_id,
        fromCache: result.data.fromCache,
        cachedAt: result.data.cachedAt,
      });
      if (parsed && onResult) onResult(parsed);
    },
    [agentSlug, buildPrompt, onResult, query, user?.id],
  );

  const handleRefresh = useCallback(async () => {
    if (!user?.id) return;
    const trimmed = query.trim();
    if (!trimmed) return;
    const prompt = buildPrompt ? buildPrompt(trimmed) : trimmed;
    await invalidateCache(agentSlug, user.id, buildCacheKey(agentSlug, prompt));
    void runQuery(true);
  }, [agentSlug, buildPrompt, query, runQuery, user?.id]);

  return (
    <div
      data-testid={`${testIdPrefix}-root`}
      className="space-y-3 rounded-lg border border-border bg-card p-3"
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          data-testid={`${testIdPrefix}-input`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={inputPlaceholder}
          aria-label={inputPlaceholder}
          className="flex-1"
        />
        <Button
          type="button"
          data-testid={`${testIdPrefix}-search`}
          onClick={() => void runQuery(false)}
          disabled={!query.trim() || state.status === 'loading'}
          className="gap-1"
        >
          {state.status === 'loading' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {searchLabel}
        </Button>
      </div>

      {state.status === 'loading' && (
        <p
          data-testid={`${testIdPrefix}-loading`}
          className="text-xs italic text-muted-foreground"
        >
          {t('shotLineExplainer.loading')}
        </p>
      )}

      {state.status === 'error' && (
        <p
          data-testid={`${testIdPrefix}-error`}
          className="text-xs text-destructive"
        >
          {state.message || t('shotLineExplainer.error')}
        </p>
      )}

      {state.status === 'done' && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
            <span className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono uppercase tracking-wide text-muted-foreground">
              {state.provider}
            </span>
            <span className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono uppercase tracking-wide text-muted-foreground">
              {state.model}
            </span>
            {state.fromCache ? (
              <span
                data-testid={`${testIdPrefix}-badge-cache`}
                title={state.cachedAt ? new Date(state.cachedAt).toLocaleString() : undefined}
                className="inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 font-mono uppercase tracking-wide text-muted-foreground"
              >
                <Database className="h-2.5 w-2.5" />
                {t('agentButton.fromCache' as any)}
              </span>
            ) : (
              <span
                data-testid={`${testIdPrefix}-badge-fresh`}
                className="inline-flex items-center gap-1 rounded border border-primary/30 bg-primary/15 px-1.5 py-0.5 font-mono uppercase tracking-wide text-primary"
              >
                {t('agentButton.fresh' as any)}
              </span>
            )}
            {state.fromCache && user?.id && (
              <button
                type="button"
                onClick={() => void handleRefresh()}
                data-testid={`${testIdPrefix}-refresh`}
                className="inline-flex items-center gap-1 text-primary/70 hover:text-primary"
              >
                <RefreshCw className="h-2.5 w-2.5" />
                {t('agentButton.refresh' as any)}
              </button>
            )}
            <a
              href={`/admin/ai?run_id=${state.runId}`}
              className="inline-flex items-center gap-0.5 text-primary/70 underline hover:text-primary"
            >
              <ExternalLink className="h-2.5 w-2.5" />
              {t('shotLineExplainer.viewLog')}
            </a>
          </div>

          {state.data ? (
            <div data-testid={`${testIdPrefix}-result`}>
              {renderResult(state.data, { rawText: state.raw })}
            </div>
          ) : (
            <pre
              data-testid={`${testIdPrefix}-raw`}
              className="max-h-48 overflow-auto rounded bg-muted p-2 text-[11px] text-muted-foreground"
            >
              {state.raw}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------- */
/*  Helpers shared by per-agent renderers                               */
/* -------------------------------------------------------------------- */

/** Render a list of source URLs as clickable links. */
export function SourcesList({ sources }: { sources?: string[] | null }) {
  const { t } = useI18n();
  if (!sources || sources.length === 0) return null;
  return (
    <div data-testid="agent-sources" className="space-y-1">
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {t('agentSearch.sources' as any)}
      </div>
      <ul className="space-y-0.5 text-[11px]">
        {sources.map((url, i) => (
          <li key={`${url}-${i}`} className="truncate">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline hover:opacity-80"
            >
              {url}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Render a confidence value as a percentage badge. */
export function ConfidenceBadge({ value }: { value?: number | null }) {
  const { t } = useI18n();
  if (value === undefined || value === null || Number.isNaN(value)) return null;
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  const tone =
    pct >= 70
      ? 'border-primary/30 bg-primary/15 text-primary'
      : pct >= 40
        ? 'border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400'
        : 'border-destructive/30 bg-destructive/15 text-destructive';
  return (
    <span
      data-testid="agent-confidence"
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wide ${tone}`}
    >
      {t('agentSearch.confidence' as any)}: {pct}%
    </span>
  );
}

export { tryParseJson };