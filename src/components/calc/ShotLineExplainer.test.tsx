import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ShotLineExplainer } from './ShotLineExplainer';
import type { BallisticResult } from '@/lib/types';

// Mock edge-client
const mockQueryAI = vi.fn();
vi.mock('@/lib/ai/edge-client', () => ({
  queryAIViaEdge: (...args: unknown[]) => mockQueryAI(...args),
}));

// Mock i18n
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: 'fr' as const,
  }),
}));

const ROW: BallisticResult = {
  range: 50,
  drop: -12.3,
  holdover: 0.85,
  holdoverMRAD: 0.25,
  velocity: 185,
  energy: 28.4,
  windDrift: 3.1,
  windDriftMOA: 0.42,
  windDriftMRAD: 0.12,
  tof: 0.285,
  spinDrift: 0,
  clicksElevation: 4,
  clicksWindage: 2,
  reticleHoldoverMOA: 0.85,
  reticleHoldoverMRAD: 0.25,
  reticleWindMOA: 0.42,
  reticleWindMRAD: 0.12,
};

const PROPS = {
  row: ROW,
  distUnit: 'm',
  lengthUnit: 'mm',
  velUnit: 'm/s',
  energyUnit: 'J',
};

describe('ShotLineExplainer', () => {
  beforeEach(() => {
    mockQueryAI.mockReset();
  });

  it('renders explain button without error', () => {
    render(<ShotLineExplainer {...PROPS} />);
    expect(screen.getByTestId('sle-btn-50')).toBeInTheDocument();
    expect(screen.getByText('shotLineExplainer.button')).toBeInTheDocument();
  });

  it('calls queryAIViaEdge with correct agent_slug and prompt', async () => {
    mockQueryAI.mockResolvedValue({
      ok: true,
      data: { text: 'Test explanation', provider: 'quatarly', model: 'haiku', run_id: 'r1', latency_ms: 200 },
    });

    render(<ShotLineExplainer {...PROPS} />);
    fireEvent.click(screen.getByTestId('sle-btn-50'));

    await waitFor(() => expect(mockQueryAI).toHaveBeenCalledTimes(1));

    const call = mockQueryAI.mock.calls[0][0];
    expect(call.agent_slug).toBe('shot-line-explainer');
    expect(call.prompt).toContain('50m');
    expect(call.prompt).toContain('-12.3');
    expect(call.prompt).toContain('185');
    expect(call.prompt).toContain('28.4');
  });

  it('shows provider, model and confidence badges after response', async () => {
    mockQueryAI.mockResolvedValue({
      ok: true,
      data: { text: 'AI response text', provider: 'quatarly', model: 'haiku', run_id: 'r2', latency_ms: 100 },
    });

    render(<ShotLineExplainer {...PROPS} />);
    fireEvent.click(screen.getByTestId('sle-btn-50'));

    await waitFor(() => expect(screen.getByTestId('sle-result-50')).toBeInTheDocument());

    expect(screen.getByTestId('sle-badge-provider')).toHaveTextContent('quatarly');
    expect(screen.getByTestId('sle-badge-model')).toHaveTextContent('haiku');
    expect(screen.getByTestId('sle-badge-confidence')).toHaveTextContent('confidence: C');
    // Note: the mock t() returns the key, so we also verify the key is correct
  });

  it('shows error message when queryAIViaEdge fails', async () => {
    mockQueryAI.mockResolvedValue({ ok: false, error: 'timeout' });

    render(<ShotLineExplainer {...PROPS} />);
    fireEvent.click(screen.getByTestId('sle-btn-50'));

    await waitFor(() => expect(screen.getByTestId('sle-error-50')).toBeInTheDocument());
    expect(screen.getByText('shotLineExplainer.error')).toBeInTheDocument();
  });
});