/**
 * Admin → Usage & Quotas panel.
 *
 * Read-only aggregation over `ai_agent_runs` for the selected window
 * (1d / 7d / 30d). Shows:
 *   - Today's Google quota (used / max / remaining) — live from
 *     ai-providers-test (same source as AiQuotaCard).
 *   - Per-provider rate-limit state (Google = quota; others =
 *     "no rate-limit configured" until a provider-level limiter
 *     is added — we explicitly say so rather than fake a number).
 *   - Per-agent table: calls / success / errors / fallbacks /
 *     avg latency / tokens in/out / cost USD.
 *   - Per-provider table: calls / success rate.
 *
 * Tokens & cost are displayed honestly:
 *   - if `ai_agent_runs` already has `tokens_in` / `tokens_out` /
 *     `cost_usd` (after the docs/migrations/20260427 migration is
 *     applied), the values are shown.
 *   - otherwise the cells show "—" with a one-time "schema pending"
 *     badge so the admin knows to apply the migration.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, Gauge, Info } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import {
  aggregateByAgent,
  aggregateByProvider,
  formatCount,
  formatUsd,
  windowStartIso,
  type AgentAggregate,
  type ProviderAggregate,
  type RunRowLite,
  type UsageWindow,
} from '@/lib/admin/usage-aggregate';

interface GoogleQuota {
  used: number;
  max: number;
  remaining: number;
  allowed: boolean;
}

const WINDOWS: UsageWindow[] = ['1d', '7d', '30d'];

export default function UsageQuotasPanel() {
  const { t } = useI18n();
  const sb = supabase;
  const [window, setWindow] = useState<UsageWindow>('1d');
  const [rows, setRows] = useState<RunRowLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [quota, setQuota] = useState<GoogleQuota | null>(null);
  const [tokensSchemaReady, setTokensSchemaReady] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!sb) return;
    setLoading(true);
    setError(null);

    const since = windowStartIso(window);

    // Always select the safe columns; try optional cost/token columns
    // separately so the panel still works on an un-migrated schema.
    const baseSelect = 'agent_slug,provider,model,status,fallback_used,latency_ms,started_at';
    const richSelect = `${baseSelect},tokens_in,tokens_out,cost_usd`;

    let data: unknown[] | null = null;
    let schemaReady = true;
    const rich = await sb
      .from('ai_agent_runs')
      .select(richSelect)
      .gte('started_at', since)
      .order('started_at', { ascending: false })
      .limit(5000);

    if (rich.error) {
      // Likely "column does not exist" → fall back to base columns.
      schemaReady = false;
      const base = await sb
        .from('ai_agent_runs')
        .select(baseSelect)
        .gte('started_at', since)
        .order('started_at', { ascending: false })
        .limit(5000);
      if (base.error) {
        setError(base.error.message);
        setRows([]);
        setLoading(false);
        setTokensSchemaReady(false);
        return;
      }
      data = base.data;
    } else {
      data = rich.data;
    }

    setTokensSchemaReady(schemaReady);
    setRows((data ?? []) as RunRowLite[]);

    // Refresh the Google quota in parallel — non-blocking on failure.
    sb.functions
      .invoke('ai-providers-test', { body: {} })
      .then(({ data: testData, error: testErr }) => {
        if (testErr || !testData) return;
        const q = (testData as { googleQuota?: GoogleQuota }).googleQuota;
        if (q) setQuota(q);
      })
      .catch(() => {
        /* best-effort */
      });

    setLoading(false);
  }, [sb, window]);

  useEffect(() => {
    void load();
  }, [load]);

  const agents = useMemo<AgentAggregate[]>(() => aggregateByAgent(rows), [rows]);
  const providers = useMemo<ProviderAggregate[]>(() => aggregateByProvider(rows), [rows]);

  const totalCalls = rows.length;
  const totalSuccess = rows.filter((r) => r.status === 'success').length;
  const totalErrors = rows.filter((r) => r.status === 'error').length;
  const totalFallbacks = rows.filter((r) => r.fallback_used).length;

  return (
    <div className="space-y-4" data-testid="usage-quotas-panel">
      {/* Header + window selector */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Gauge className="h-4 w-4 text-primary" />
              {t('admin.ai.usage.title')}
            </CardTitle>
            <div className="flex items-center gap-1">
              {WINDOWS.map((w) => (
                <Button
                  key={w}
                  size="sm"
                  variant={window === w ? 'default' : 'outline'}
                  className="h-7 px-2 text-xs"
                  onClick={() => setWindow(w)}
                  data-testid={`usage-window-${w}`}
                >
                  {t(`admin.ai.usage.window.${w}` as any)}
                </Button>
              ))}
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2"
                onClick={() => void load()}
                disabled={loading}
                data-testid="usage-refresh"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Tile label={t('admin.ai.usage.totalCalls')} value={String(totalCalls)} />
          <Tile label={t('admin.ai.usage.success')} value={String(totalSuccess)} />
          <Tile label={t('admin.ai.usage.errors')} value={String(totalErrors)} />
          <Tile label={t('admin.ai.usage.fallbacks')} value={String(totalFallbacks)} />
        </CardContent>
      </Card>

      {!tokensSchemaReady && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            {t('admin.ai.usage.schemaPending')}
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {/* Per-provider rate-limit state */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t('admin.ai.usage.rateLimitTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-2">
          <ProviderLimitRow
            provider="google-direct"
            quota={quota}
            label={t('admin.ai.usage.providerGoogle')}
          />
          <ProviderLimitRow
            provider="quatarly"
            quota={null}
            label={t('admin.ai.usage.providerQuatarly')}
          />
          <ProviderLimitRow
            provider="ollama"
            quota={null}
            label={t('admin.ai.usage.providerOllama')}
          />
        </CardContent>
      </Card>

      {/* Per-agent table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t('admin.ai.usage.byAgentTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          {agents.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t('admin.ai.usage.noData')}</p>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground text-left">
                    <th className="py-1 pr-2">{t('admin.ai.usage.col.agent')}</th>
                    <th className="py-1 pr-2 text-right">{t('admin.ai.usage.col.calls')}</th>
                    <th className="py-1 pr-2 text-right">{t('admin.ai.usage.col.success')}</th>
                    <th className="py-1 pr-2 text-right">{t('admin.ai.usage.col.errors')}</th>
                    <th className="py-1 pr-2 text-right hidden sm:table-cell">
                      {t('admin.ai.usage.col.fallbacks')}
                    </th>
                    <th className="py-1 pr-2 text-right hidden sm:table-cell">
                      {t('admin.ai.usage.col.avgLatency')}
                    </th>
                    <th className="py-1 pr-2 text-right">{t('admin.ai.usage.col.tokensIn')}</th>
                    <th className="py-1 pr-2 text-right">{t('admin.ai.usage.col.tokensOut')}</th>
                    <th className="py-1 text-right">{t('admin.ai.usage.col.cost')}</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map((a) => (
                    <tr key={a.agentSlug} className="border-b border-border/50" data-testid="agent-row">
                      <td className="py-1.5 pr-2 font-mono">{a.agentSlug}</td>
                      <td className="py-1.5 pr-2 text-right">{a.calls}</td>
                      <td className="py-1.5 pr-2 text-right text-primary">{a.success}</td>
                      <td className="py-1.5 pr-2 text-right text-destructive">{a.errors || ''}</td>
                      <td className="py-1.5 pr-2 text-right hidden sm:table-cell">
                        {a.fallbacks || ''}
                      </td>
                      <td className="py-1.5 pr-2 text-right hidden sm:table-cell">
                        {a.avgLatencyMs != null ? `${a.avgLatencyMs}ms` : '—'}
                      </td>
                      <td className="py-1.5 pr-2 text-right font-mono">{formatCount(a.tokensIn)}</td>
                      <td className="py-1.5 pr-2 text-right font-mono">{formatCount(a.tokensOut)}</td>
                      <td className="py-1.5 text-right font-mono">{formatUsd(a.costUsd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Per-provider table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t('admin.ai.usage.byProviderTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          {providers.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t('admin.ai.usage.noData')}</p>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground text-left">
                    <th className="py-1 pr-2">{t('admin.ai.usage.col.provider')}</th>
                    <th className="py-1 pr-2 text-right">{t('admin.ai.usage.col.calls')}</th>
                    <th className="py-1 pr-2 text-right">{t('admin.ai.usage.col.success')}</th>
                    <th className="py-1 text-right">{t('admin.ai.usage.col.successRate')}</th>
                  </tr>
                </thead>
                <tbody>
                  {providers.map((p) => (
                    <tr key={p.provider} className="border-b border-border/50" data-testid="provider-row">
                      <td className="py-1.5 pr-2 font-mono">{p.provider}</td>
                      <td className="py-1.5 pr-2 text-right">{p.calls}</td>
                      <td className="py-1.5 pr-2 text-right text-primary">{p.success}</td>
                      <td className="py-1.5 text-right">{p.successRatePct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border bg-card p-2 text-center">
      <div className="text-xl font-bold">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

function ProviderLimitRow({
  provider,
  quota,
  label,
}: {
  provider: string;
  quota: GoogleQuota | null;
  label: string;
}) {
  const { t } = useI18n();

  if (provider === 'google-direct') {
    if (!quota) {
      return (
        <div className="flex items-center justify-between border border-border rounded px-3 py-2 text-xs">
          <span className="font-mono">{label}</span>
          <Badge variant="secondary">{t('admin.ai.usage.rateLimit.unknown')}</Badge>
        </div>
      );
    }
    const exhausted = quota.max > 0 && quota.remaining <= 0;
    return (
      <div className="flex items-center justify-between border border-border rounded px-3 py-2 text-xs">
        <span className="font-mono">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">
            {quota.used} / {quota.max > 0 ? quota.max : '∞'}
          </span>
          <Badge variant={exhausted ? 'destructive' : 'default'}>
            {exhausted
              ? t('admin.ai.usage.rateLimit.exhausted')
              : t('admin.ai.usage.rateLimit.ok')}
          </Badge>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between border border-border rounded px-3 py-2 text-xs">
      <span className="font-mono">{label}</span>
      <Badge variant="secondary">{t('admin.ai.usage.rateLimit.notConfigured')}</Badge>
    </div>
  );
}
