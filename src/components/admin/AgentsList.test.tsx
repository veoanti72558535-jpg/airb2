import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock supabase
const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
const mockSelect = vi.fn().mockReturnValue({
  order: vi.fn().mockResolvedValue({
    data: [
      {
        slug: 'cross-validation-strelok-rows',
        display_name: 'Strelok Rows',
        description: null,
        provider: 'quatarly',
        model: 'claude-sonnet-4',
        allow_fallback: true,
        system_prompt: 'You parse rows',
        prompt_version: '1.0',
        enabled: true,
        budget_guardrails: { max_per_day: 50 },
      },
      {
        slug: 'shot-line-explainer',
        display_name: 'Shot Line',
        description: null,
        provider: 'google-direct',
        model: 'gemini-2.5-flash',
        allow_fallback: false,
        system_prompt: 'Explain shots',
        prompt_version: '1.0',
        enabled: false,
        budget_guardrails: { max_per_day: 0 },
      },
    ],
    error: null,
  }),
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'ai_agent_configs') return { select: mockSelect, update: mockUpdate };
      return { select: vi.fn() };
    },
  },
  isSupabaseConfigured: () => true,
}));

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, lang: 'en' }),
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import AgentsList from './AgentsList';

describe('AgentsList', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders agents and shows protected badge for strelok-rows', async () => {
    render(<AgentsList />);
    expect(await screen.findByTestId('agent-row-cross-validation-strelok-rows')).toBeInTheDocument();
    expect(screen.getByTestId('agent-protected-badge')).toBeInTheDocument();
    // No edit button for protected agent
    expect(screen.queryByTestId('agent-edit-cross-validation-strelok-rows')).not.toBeInTheDocument();
    // Edit button exists for shot-line-explainer
    expect(screen.getByTestId('agent-edit-shot-line-explainer')).toBeInTheDocument();
  });

  it('toggle enabled calls supabase update for non-protected agent', async () => {
    render(<AgentsList />);
    const toggle = await screen.findByTestId('agent-toggle-shot-line-explainer');
    await userEvent.click(toggle);
    expect(mockUpdate).toHaveBeenCalled();
  });
});