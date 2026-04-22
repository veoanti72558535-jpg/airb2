import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      upsert: vi.fn().mockResolvedValue({ error: null }),
    }),
  },
  isSupabaseConfigured: () => true,
}));

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, lang: 'en' }),
}));

vi.mock('@/lib/ai/quatarly-models-cache', () => ({
  getQuatarlyModels: vi.fn().mockResolvedValue(['claude-sonnet-4', 'claude-haiku-4-5']),
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import AgentForm from './AgentForm';

describe('AgentForm', () => {
  const noop = vi.fn();

  beforeEach(() => { vi.clearAllMocks(); });

  it('validates slug format in creation mode', async () => {
    render(<AgentForm agent={null} onCancel={noop} onSaved={noop} />);
    const slugInput = screen.getByTestId('agent-form-slug');
    await userEvent.type(slugInput, 'INVALID SLUG');
    expect(screen.getByTestId('agent-slug-error')).toBeInTheDocument();
  });

  it('rejects protected slug in creation mode', async () => {
    render(<AgentForm agent={null} onCancel={noop} onSaved={noop} />);
    const slugInput = screen.getByTestId('agent-form-slug');
    await userEvent.type(slugInput, 'cross-validation-strelok-rows');
    expect(screen.getByTestId('agent-slug-error')).toHaveTextContent('admin.ai.agents.slugReserved');
  });

  it('slug is readonly in edit mode', () => {
    render(
      <AgentForm
        agent={{
          slug: 'shot-line-explainer',
          display_name: 'Shot Line',
          description: null,
          provider: 'quatarly',
          model: 'claude-sonnet-4',
          allow_fallback: false,
          system_prompt: 'Explain',
          prompt_version: '1.0',
          enabled: true,
          budget_guardrails: null,
        }}
        onCancel={noop}
        onSaved={noop}
      />
    );
    expect(screen.getByTestId('agent-form-slug')).toBeDisabled();
  });
});