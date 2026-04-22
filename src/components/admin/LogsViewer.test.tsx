import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock supabase before imports
const mockSelect = vi.fn();
const mockFrom = vi.fn(() => ({
  select: mockSelect,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom, auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) } },
  isSupabaseConfigured: () => true,
}));

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, lang: 'en' }),
  I18nProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const mockRuns = [
  {
    id: 'r1',
    agent_slug: 'shot-line-explainer',
    provider: 'quatarly',
    model: 'claude-sonnet-4',
    status: 'success',
    latency_ms: 350,
    error_code: null,
    fallback_used: false,
    started_at: '2026-04-22T10:00:00Z',
    finished_at: '2026-04-22T10:00:01Z',
  },
  {
    id: 'r2',
    agent_slug: 'cross-validation-strelok-rows',
    provider: 'google-direct',
    model: 'gemini-2.5-flash',
    status: 'error',
    latency_ms: null,
    error_code: 'TIMEOUT',
    fallback_used: true,
    started_at: '2026-04-22T09:00:00Z',
    finished_at: null,
  },
];

describe('LogsViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // slug query
    mockSelect.mockResolvedValueOnce({ data: mockRuns.map((r) => ({ agent_slug: r.agent_slug })) });
    // runs query
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: mockRuns }),
            gte: vi.fn().mockResolvedValue({ data: mockRuns }),
            lte: vi.fn().mockResolvedValue({ data: mockRuns }),
            then: vi.fn((cb: any) => cb({ data: mockRuns })),
          }),
          then: vi.fn((cb: any) => cb({ data: mockRuns })),
        }),
        then: vi.fn((cb: any) => cb({ data: mockRuns })),
      }),
    });
  });

  it('renders without error', async () => {
    const { default: LogsViewer } = await import('./LogsViewer');
    render(<LogsViewer />);
    expect(screen.getByTestId('logs-viewer')).toBeInTheDocument();
  });
});

describe('AiDailyStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        gte: vi.fn().mockReturnValue({
          then: vi.fn((cb: any) =>
            cb({
              data: [
                { status: 'success', provider: 'quatarly', fallback_used: false },
                { status: 'error', provider: 'google-direct', fallback_used: true },
              ],
            }),
          ),
        }),
      }),
    });
  });

  it('renders 4 stat cards', async () => {
    const { default: AiDailyStats } = await import('./AiDailyStats');
    render(<AiDailyStats />);
    expect(screen.getByTestId('ai-daily-stats')).toBeInTheDocument();
    // 4 cards
    const cards = screen.getByTestId('ai-daily-stats').children;
    expect(cards.length).toBe(4);
  });
});

describe('RunDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            then: vi.fn((cb: any) => cb({ data: [] })),
          }),
        }),
      }),
    });
  });

  it('renders run detail with events section', async () => {
    const { default: RunDetail } = await import('./RunDetail');
    const run = {
      id: 'r1',
      agent_slug: 'test',
      provider: 'quatarly',
      model: 'claude-sonnet-4',
      status: 'success',
      latency_ms: 200,
      error_code: null,
      fallback_used: false,
      started_at: '2026-04-22T10:00:00Z',
      finished_at: '2026-04-22T10:00:01Z',
    };
    render(<RunDetail run={run} onClose={vi.fn()} />);
    expect(screen.getByTestId('run-detail')).toBeInTheDocument();
    expect(screen.getByText('quatarly')).toBeInTheDocument();
  });
});