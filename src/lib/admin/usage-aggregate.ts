/**
 * Aggregation helpers for the Admin → Usage & Quotas panel.
 *
 * Pure functions, no side-effects, no I/O — easy to unit test.
 * The Supabase fetch lives in the React panel; these helpers only
 * shape rows already in memory.
 *
 * IMPORTANT — token / cost honesty:
 *   The current `ai_agent_runs` / `ai_usage_events` schema does NOT
 *   store tokens or cost. We expose `tokensIn`, `tokensOut`, `costUsd`
 *   so the UI can already render the columns, but the values are
 *   computed from optional fields only and default to `null` when
 *   the schema does not provide them. The UI MUST display this as
 *   "schema pending" rather than fabricating a number.
 *   See docs/migrations/20260427-ai-usage-tokens-cost.sql.
 */

export type UsageWindow = '1d' | '7d' | '30d';

export interface RunRowLite {
  agent_slug: string;
  provider: string;
  model: string;
  status: string;
  fallback_used: boolean;
  latency_ms: number | null;
  started_at: string;
  /** Optional — only present once docs/migrations/20260427-...sql is applied. */
  tokens_in?: number | null;
  /** Optional — same as tokens_in. */
  tokens_out?: number | null;
  /** Optional — same as tokens_in. */
  cost_usd?: number | null;
}

export interface AgentAggregate {
  agentSlug: string;
  calls: number;
  success: number;
  errors: number;
  fallbacks: number;
  avgLatencyMs: number | null;
  /** `null` until the schema migration ships. */
  tokensIn: number | null;
  /** `null` until the schema migration ships. */
  tokensOut: number | null;
  /** `null` until the schema migration ships. */
  costUsd: number | null;
}

export interface ProviderAggregate {
  provider: string;
  calls: number;
  success: number;
  errors: number;
  successRatePct: number;
}

/** Returns the ISO timestamp at the start of the requested window (UTC). */
export function windowStartIso(window: UsageWindow, now: Date = new Date()): string {
  const days = window === '1d' ? 1 : window === '7d' ? 7 : 30;
  const d = new Date(now.getTime());
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - (days - 1));
  return d.toISOString();
}

function safeAvg(total: number, count: number): number | null {
  if (count <= 0) return null;
  return Math.round(total / count);
}

/**
 * Sums optional numeric fields. Returns `null` if NO row provided a
 * value (so the UI can mark the cell as "schema pending"). Returns
 * the partial sum if at least one row contributes — that's still
 * partial-truth, but better than silently returning 0.
 */
function sumOptional(rows: RunRowLite[], key: 'tokens_in' | 'tokens_out' | 'cost_usd'): number | null {
  let any = false;
  let sum = 0;
  for (const r of rows) {
    const v = r[key];
    if (typeof v === 'number' && Number.isFinite(v)) {
      any = true;
      sum += v;
    }
  }
  return any ? sum : null;
}

/** Group runs by `agent_slug` and compute counts + averages. */
export function aggregateByAgent(rows: RunRowLite[]): AgentAggregate[] {
  const groups = new Map<string, RunRowLite[]>();
  for (const r of rows) {
    const list = groups.get(r.agent_slug) ?? [];
    list.push(r);
    groups.set(r.agent_slug, list);
  }

  const out: AgentAggregate[] = [];
  for (const [agentSlug, list] of groups) {
    let success = 0;
    let errors = 0;
    let fallbacks = 0;
    let latencySum = 0;
    let latencyCount = 0;
    for (const r of list) {
      if (r.status === 'success') success += 1;
      else if (r.status === 'error') errors += 1;
      if (r.fallback_used) fallbacks += 1;
      if (typeof r.latency_ms === 'number' && Number.isFinite(r.latency_ms)) {
        latencySum += r.latency_ms;
        latencyCount += 1;
      }
    }
    out.push({
      agentSlug,
      calls: list.length,
      success,
      errors,
      fallbacks,
      avgLatencyMs: safeAvg(latencySum, latencyCount),
      tokensIn: sumOptional(list, 'tokens_in'),
      tokensOut: sumOptional(list, 'tokens_out'),
      costUsd: sumOptional(list, 'cost_usd'),
    });
  }
  out.sort((a, b) => b.calls - a.calls);
  return out;
}

/** Group runs by `provider` and compute success rate. */
export function aggregateByProvider(rows: RunRowLite[]): ProviderAggregate[] {
  const groups = new Map<string, RunRowLite[]>();
  for (const r of rows) {
    const list = groups.get(r.provider) ?? [];
    list.push(r);
    groups.set(r.provider, list);
  }

  const out: ProviderAggregate[] = [];
  for (const [provider, list] of groups) {
    const success = list.filter((r) => r.status === 'success').length;
    const errors = list.filter((r) => r.status === 'error').length;
    const calls = list.length;
    const rate = calls > 0 ? Math.round((success / calls) * 1000) / 10 : 0;
    out.push({ provider, calls, success, errors, successRatePct: rate });
  }
  out.sort((a, b) => b.calls - a.calls);
  return out;
}

/** Format USD with two decimals, or em-dash for null/unknown. */
export function formatUsd(n: number | null): string {
  if (n == null) return '—';
  return `$${n.toFixed(n >= 100 ? 0 : 2)}`;
}

/** Format integer counts with thin spaces, or em-dash for null. */
export function formatCount(n: number | null): string {
  if (n == null) return '—';
  return n.toLocaleString('en-US').replace(/,/g, '\u202f');
}
