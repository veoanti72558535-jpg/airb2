import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from '@/lib/i18n';

// Mock auth so the AgentButton has a user.id
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ user: { id: 'test-user' }, session: null, loading: false }),
}));

// Mock the cache wrapper used by AgentButton
vi.mock('@/lib/ai/agent-cache', () => ({
  queryAIWithCache: vi.fn(),
  invalidateCache: vi.fn(),
  buildCacheKey: vi.fn(() => 'cache-key'),
}));

import { queryAIWithCache } from '@/lib/ai/agent-cache';
import { TruingExplainerButton } from './TruingExplainerButton';
import { ZeroAdvisorButton } from './ZeroAdvisorButton';
import { EnergyAdvisorButton } from './EnergyAdvisorButton';
import { PbrExplainerButton } from './PbrExplainerButton';
import { CantSlopeAdvisorButton } from './CantSlopeAdvisorButton';
import { WindCorrectionCoachButton } from './WindCorrectionCoachButton';

const queryMock = vi.mocked(queryAIWithCache);

function withProviders(ui: React.ReactNode) {
  return (
    <MemoryRouter>
      <I18nProvider>{ui}</I18nProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Analysis agents — render', () => {
  it('TruingExplainerButton renders its trigger button', () => {
    render(
      withProviders(
        <TruingExplainerButton factor={0.85} originalBc={0.025} correctedBc={0.021} />,
      ),
    );
    expect(screen.getByTestId('truing-explainer-btn')).toBeInTheDocument();
  });

  it('ZeroAdvisorButton renders', () => {
    render(
      withProviders(
        <ZeroAdvisorButton
          projectile={{ name: 'JSB', weightGrains: 18, bc: 0.03 }}
          muzzleVelocityMs={280}
          typicalDistancesM={[30, 50, 80]}
          usage="hunting"
        />,
      ),
    );
    expect(screen.getByTestId('zero-advisor-btn')).toBeInTheDocument();
  });

  it('EnergyAdvisorButton renders + game selector', () => {
    render(withProviders(<EnergyAdvisorButton energyJ={28} distanceM={50} />));
    expect(screen.getByTestId('energy-advisor-btn')).toBeInTheDocument();
    expect(screen.getByTestId('energy-advisor-game')).toBeInTheDocument();
  });

  it('PbrExplainerButton renders', () => {
    render(
      withProviders(<PbrExplainerButton pbrMin={20} pbrMax={55} killZoneMm={40} />),
    );
    expect(screen.getByTestId('pbr-explainer-btn')).toBeInTheDocument();
  });

  it('CantSlopeAdvisorButton renders when slope or cant is non-zero', () => {
    render(
      withProviders(
        <CantSlopeAdvisorButton
          slopeAngleDeg={15}
          cantAngleDeg={0}
          dropMm={-12.3}
          distanceM={50}
        />,
      ),
    );
    expect(screen.getByTestId('cant-slope-advisor-btn')).toBeInTheDocument();
  });

  it('WindCorrectionCoachButton renders', () => {
    render(
      withProviders(
        <WindCorrectionCoachButton
          windSpeedMs={3}
          windAngleDeg={90}
          windDriftResults={[
            { distanceM: 25, driftMm: 5, driftMOA: 0.7, driftMRAD: 0.2 },
            { distanceM: 50, driftMm: 18, driftMOA: 1.2, driftMRAD: 0.36 },
          ]}
        />,
      ),
    );
    expect(screen.getByTestId('wind-coach-btn')).toBeInTheDocument();
  });
});

describe('TruingExplainerButton — calls AI with correct slug', () => {
  it('uses agent_slug "truing-explainer" and includes factor in prompt', async () => {
    queryMock.mockResolvedValueOnce({
      ok: true,
      data: {
        text: 'Le facteur ×0.85 indique un BC effectif réduit.',
        provider: 'quatarly',
        model: 'claude-haiku-4-5',
        run_id: 'run-1',
        fromCache: false,
      },
    });
    render(
      withProviders(
        <TruingExplainerButton factor={0.85} originalBc={0.025} correctedBc={0.021} />,
      ),
    );
    fireEvent.click(screen.getByTestId('truing-explainer-btn'));
    await waitFor(() => expect(queryMock).toHaveBeenCalledTimes(1));
    const call = queryMock.mock.calls[0][0];
    expect(call.agent_slug).toBe('truing-explainer');
    expect(call.prompt).toContain('×0.850');
    expect(call.prompt).toContain('0.0250');
    expect(call.prompt).toContain('0.0210');
  });
});

describe('CantSlopeAdvisorButton — visibility gate', () => {
  it('renders nothing when both slope and cant are 0', () => {
    const { container } = render(
      withProviders(
        <CantSlopeAdvisorButton
          slopeAngleDeg={0}
          cantAngleDeg={0}
          dropMm={-10}
          distanceM={50}
        />,
      ),
    );
    expect(container.querySelector('[data-testid="cant-slope-advisor-btn"]')).toBeNull();
  });
});

describe('Cache badge', () => {
  it('shows fromCache badge when AI response is cached', async () => {
    queryMock.mockResolvedValueOnce({
      ok: true,
      data: {
        text: 'Cached response',
        provider: 'quatarly',
        model: 'claude-haiku-4-5',
        run_id: 'run-2',
        fromCache: true,
        cachedAt: '2025-01-01T00:00:00Z',
      },
    });
    render(
      withProviders(<PbrExplainerButton pbrMin={20} pbrMax={55} killZoneMm={40} />),
    );
    fireEvent.click(screen.getByTestId('pbr-explainer-btn'));
    await waitFor(() =>
      expect(screen.getByTestId('pbr-explainer-badge-cache')).toBeInTheDocument(),
    );
  });
});