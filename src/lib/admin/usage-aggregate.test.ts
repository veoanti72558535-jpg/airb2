import { describe, expect, it } from 'vitest';
import {
  aggregateByAgent,
  aggregateByProvider,
  formatCount,
  formatUsd,
  windowStartIso,
  type RunRowLite,
} from './usage-aggregate';

function row(p: Partial<RunRowLite>): RunRowLite {
  return {
    agent_slug: 'a',
    provider: 'quatarly',
    model: 'm',
    status: 'success',
    fallback_used: false,
    latency_ms: 100,
    started_at: '2026-04-27T00:00:00Z',
    ...p,
  };
}

describe('aggregateByAgent', () => {
  it('groups by agent_slug and counts calls/success/errors/fallbacks', () => {
    const rows = [
      row({ agent_slug: 'extract', status: 'success' }),
      row({ agent_slug: 'extract', status: 'error' }),
      row({ agent_slug: 'extract', status: 'success', fallback_used: true }),
      row({ agent_slug: 'explain', status: 'success' }),
    ];
    const agg = aggregateByAgent(rows);
    const extract = agg.find((a) => a.agentSlug === 'extract')!;
    expect(extract.calls).toBe(3);
    expect(extract.success).toBe(2);
    expect(extract.errors).toBe(1);
    expect(extract.fallbacks).toBe(1);
  });

  it('averages latency only over rows with a numeric latency', () => {
    const rows = [
      row({ latency_ms: 100 }),
      row({ latency_ms: 300 }),
      row({ latency_ms: null }),
    ];
    expect(aggregateByAgent(rows)[0].avgLatencyMs).toBe(200);
  });

  it('returns null for tokens/cost when no row carries them (schema pending)', () => {
    const rows = [row({}), row({})];
    const agg = aggregateByAgent(rows)[0];
    expect(agg.tokensIn).toBeNull();
    expect(agg.tokensOut).toBeNull();
    expect(agg.costUsd).toBeNull();
  });

  it('sums tokens/cost when at least one row provides them', () => {
    const rows = [
      row({ tokens_in: 100, tokens_out: 20, cost_usd: 0.01 }),
      row({}),
      row({ tokens_in: 50, cost_usd: 0.005 }),
    ];
    const agg = aggregateByAgent(rows)[0];
    expect(agg.tokensIn).toBe(150);
    expect(agg.tokensOut).toBe(20);
    expect(agg.costUsd).toBeCloseTo(0.015);
  });

  it('sorts agents by call count descending', () => {
    const rows = [
      row({ agent_slug: 'small' }),
      row({ agent_slug: 'big' }),
      row({ agent_slug: 'big' }),
    ];
    const agg = aggregateByAgent(rows);
    expect(agg[0].agentSlug).toBe('big');
  });
});

describe('aggregateByProvider', () => {
  it('computes success rate percentage', () => {
    const rows = [
      row({ provider: 'quatarly', status: 'success' }),
      row({ provider: 'quatarly', status: 'success' }),
      row({ provider: 'quatarly', status: 'success' }),
      row({ provider: 'quatarly', status: 'error' }),
    ];
    const agg = aggregateByProvider(rows)[0];
    expect(agg.calls).toBe(4);
    expect(agg.successRatePct).toBe(75);
  });

  it('handles zero rows safely', () => {
    expect(aggregateByProvider([])).toEqual([]);
  });
});

describe('windowStartIso', () => {
  const now = new Date('2026-04-27T15:30:00Z');

  it('returns midnight today for 1d', () => {
    expect(windowStartIso('1d', now)).toBe('2026-04-27T00:00:00.000Z');
  });

  it('returns midnight 6 days ago for 7d', () => {
    expect(windowStartIso('7d', now)).toBe('2026-04-21T00:00:00.000Z');
  });

  it('returns midnight 29 days ago for 30d', () => {
    expect(windowStartIso('30d', now)).toBe('2026-03-29T00:00:00.000Z');
  });
});

describe('formatters', () => {
  it('formats USD with em-dash for null', () => {
    expect(formatUsd(null)).toBe('—');
    expect(formatUsd(0.5)).toBe('$0.50');
    expect(formatUsd(123)).toBe('$123');
  });

  it('formats counts with em-dash for null', () => {
    expect(formatCount(null)).toBe('—');
    expect(formatCount(1500)).toContain('1');
    expect(formatCount(0)).toBe('0');
  });
});
