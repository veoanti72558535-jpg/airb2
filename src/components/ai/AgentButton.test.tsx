import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { AuthProvider } from '@/lib/auth-context';

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'en', lang: 'en' }),
  I18nProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const mockQueryAI = vi.fn();
vi.mock('@/lib/ai/edge-client', () => ({
  queryAIViaEdge: (...args: any[]) => mockQueryAI(...args),
}));

import { AgentButton } from './AgentButton';

// Toutes les agents-boîtes lisent le contexte d'auth pour décider de
// l'activation côté Lovable Cloud — on les wrappe systématiquement.
function renderWithAuth(ui: React.ReactElement) {
  return render(<AuthProvider>{ui}</AuthProvider>);
}

describe('AgentButton', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders button in idle state', () => {
    renderWithAuth(<AgentButton agentSlug="test-agent" prompt="test" buttonLabel="Test" testIdPrefix="ta" />);
    expect(screen.getByTestId('ta-btn')).toBeInTheDocument();
  });

  it('calls queryAIViaEdge with correct slug on click', async () => {
    mockQueryAI.mockResolvedValue({
      ok: true,
      data: { text: 'result', provider: 'quatarly', model: 'haiku', run_id: 'r1', latency_ms: 100 },
    });
    renderWithAuth(<AgentButton agentSlug="my-agent" prompt="hello" buttonLabel="Go" testIdPrefix="ta" />);
    fireEvent.click(screen.getByTestId('ta-btn'));
    await waitFor(() => expect(screen.getByTestId('ta-result')).toBeInTheDocument());
    expect(mockQueryAI).toHaveBeenCalledWith({ agent_slug: 'my-agent', prompt: 'hello' });
  });

  it('shows confidence:C badge after response', async () => {
    mockQueryAI.mockResolvedValue({
      ok: true,
      data: { text: 'ok', provider: 'p', model: 'm', run_id: 'r', latency_ms: 50 },
    });
    renderWithAuth(<AgentButton agentSlug="a" prompt="p" buttonLabel="B" testIdPrefix="ta" />);
    fireEvent.click(screen.getByTestId('ta-btn'));
    await waitFor(() => expect(screen.getByTestId('ta-badge-confidence')).toBeInTheDocument());
  });

  it('shows error state on failure', async () => {
    mockQueryAI.mockResolvedValue({ ok: false, error: 'fail' });
    renderWithAuth(<AgentButton agentSlug="a" prompt="p" buttonLabel="B" testIdPrefix="ta" />);
    fireEvent.click(screen.getByTestId('ta-btn'));
    await waitFor(() => expect(screen.getByTestId('ta-error')).toBeInTheDocument());
  });
});

describe('DeviationExplainer', () => {
  it('renders without error', async () => {
    const { DeviationExplainer } = await import('@/components/calc/DeviationExplainer');
    renderWithAuth(<DeviationExplainer distanceM={50} driftMm={12.5} />);
    expect(screen.getByTestId('devex-btn')).toBeInTheDocument();
  });
});

describe('ProjectileSummary', () => {
  it('renders without error', async () => {
    const { ProjectileSummary } = await import('@/components/projectiles/ProjectileSummary');
    const p = { id: '1', brand: 'JSB', model: 'Exact', caliber: '.22', weight: 18, bc: 0.032, createdAt: '', updatedAt: '' } as any;
    renderWithAuth(<ProjectileSummary projectile={p} />);
    expect(screen.getByTestId('projsum-btn')).toBeInTheDocument();
  });
});

describe('SessionSummarizer', () => {
  it('renders without error', async () => {
    const { SessionSummarizer } = await import('@/components/sessions/SessionSummarizer');
    const s = { id: '1', name: 'Test', airgunId: 'a1', input: { projectileWeight: 18, bc: 0.032, zeroRange: 30, maxRange: 100, muzzleVelocity: 270 }, createdAt: '', updatedAt: '' } as any;
    renderWithAuth(<SessionSummarizer session={s} />);
    expect(screen.getByTestId('sesssum-btn')).toBeInTheDocument();
  });
});

describe('CompareInsights', () => {
  it('renders without error', async () => {
    const { CompareInsights } = await import('@/components/compare/CompareInsights');
    const s = { id: '1', name: 'S', input: { projectileWeight: 18, bc: 0.03, zeroRange: 30, maxRange: 100, muzzleVelocity: 270 } } as any;
    renderWithAuth(<CompareInsights sessionA={s} sessionB={s} />);
    expect(screen.getByTestId('cmpins-btn')).toBeInTheDocument();
  });
});