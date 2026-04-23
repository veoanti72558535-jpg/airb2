import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from '@/lib/i18n';

// Mock the auth context — agents call useAuth() to get user.id
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ user: { id: 'test-user' }, session: null, loading: false }),
}));

// Mock the cache wrapper so we don't hit Supabase during tests
vi.mock('@/lib/ai/agent-cache', () => ({
  queryAIWithCache: vi.fn(),
  invalidateCache: vi.fn(),
  buildCacheKey: vi.fn(() => 'cache-key'),
}));

import { queryAIWithCache } from '@/lib/ai/agent-cache';
import { ProjectileSearchAgent } from './ProjectileSearchAgent';
import { VelocityForumAgent } from './VelocityForumAgent';
import { AirgunReviewAgent } from './AirgunReviewAgent';
import { WeatherSearchAgent } from './WeatherSearchAgent';
import { BcSearchAgent } from './BcSearchAgent';
import { TuneAdviceAgent } from './TuneAdviceAgent';

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

describe('Web search agents — render', () => {
  it('ProjectileSearchAgent renders without crashing', () => {
    render(withProviders(<ProjectileSearchAgent />));
    expect(screen.getByTestId('projectile-search-root')).toBeInTheDocument();
    expect(screen.getByTestId('projectile-search-input')).toBeInTheDocument();
  });

  it('VelocityForumAgent renders without crashing', () => {
    render(withProviders(<VelocityForumAgent />));
    expect(screen.getByTestId('velocity-forum-root')).toBeInTheDocument();
  });

  it('AirgunReviewAgent renders without crashing', () => {
    render(withProviders(<AirgunReviewAgent />));
    expect(screen.getByTestId('airgun-review-root')).toBeInTheDocument();
  });

  it('WeatherSearchAgent renders without crashing', () => {
    render(withProviders(<WeatherSearchAgent />));
    expect(screen.getByTestId('weather-search-root')).toBeInTheDocument();
  });

  it('BcSearchAgent renders without crashing', () => {
    render(withProviders(<BcSearchAgent />));
    expect(screen.getByTestId('bc-search-root')).toBeInTheDocument();
  });

  it('TuneAdviceAgent renders without crashing', () => {
    render(withProviders(<TuneAdviceAgent />));
    expect(screen.getByTestId('tune-advice-root')).toBeInTheDocument();
  });
});

describe('BcSearchAgent — onResult callback', () => {
  it('"Use this BC" button fires onResult with parsed payload', async () => {
    queryMock.mockResolvedValueOnce({
      ok: true,
      data: {
        text: JSON.stringify({
          projectile: 'JSB Knockout',
          caliber: '.25',
          bcG1: { value: 0.045, source: 'JBM', confidence: 0.8 },
        }),
        provider: 'quatarly',
        model: 'claude-haiku-4-5',
        run_id: 'run-1',
        fromCache: false,
      },
    });
    const onResult = vi.fn();
    render(withProviders(<BcSearchAgent initialQuery="JSB Knockout" onResult={onResult} />));
    fireEvent.click(screen.getByTestId('bc-search-search'));
    await waitFor(() => expect(screen.getByTestId('bc-search-result')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('bc-search-use'));
    expect(onResult).toHaveBeenCalled();
    expect(onResult.mock.calls[0][0].bcG1?.value).toBe(0.045);
  });
});

describe('WeatherSearchAgent — Use these conditions', () => {
  it('"Use these conditions" calls onResult with weather payload', async () => {
    queryMock.mockResolvedValueOnce({
      ok: true,
      data: {
        text: JSON.stringify({
          location: 'Paris',
          temperatureC: 18,
          pressureHpa: 1013,
          humidityPct: 60,
          altitudeM: 35,
          windSpeedMs: 3,
        }),
        provider: 'quatarly',
        model: 'claude-haiku-4-5',
        run_id: 'run-2',
        fromCache: false,
      },
    });
    const onResult = vi.fn();
    render(withProviders(<WeatherSearchAgent initialQuery="Paris" onResult={onResult} />));
    fireEvent.click(screen.getByTestId('weather-search-search'));
    await waitFor(() => expect(screen.getByTestId('weather-search-result')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('weather-search-use'));
    expect(onResult).toHaveBeenCalledWith(
      expect.objectContaining({ temperatureC: 18, pressureHpa: 1013 }),
    );
  });
});

describe('Cache badge', () => {
  it('shows "Cache" badge when fromCache=true', async () => {
    queryMock.mockResolvedValueOnce({
      ok: true,
      data: {
        text: JSON.stringify({ name: 'Test', confidence: 0.8 }),
        provider: 'quatarly',
        model: 'claude-haiku-4-5',
        run_id: 'run-3',
        fromCache: true,
        cachedAt: '2025-01-01T00:00:00Z',
      },
    });
    render(withProviders(<ProjectileSearchAgent initialQuery="JSB" />));
    fireEvent.click(screen.getByTestId('projectile-search-search'));
    await waitFor(() =>
      expect(screen.getByTestId('projectile-search-badge-cache')).toBeInTheDocument(),
    );
  });
});

describe('Sources list', () => {
  it('renders source links when sources.length > 0', async () => {
    queryMock.mockResolvedValueOnce({
      ok: true,
      data: {
        text: JSON.stringify({
          name: 'JSB Hades',
          sources: ['https://example.com/a', 'https://example.com/b'],
        }),
        provider: 'quatarly',
        model: 'claude-haiku-4-5',
        run_id: 'run-4',
        fromCache: false,
      },
    });
    render(withProviders(<ProjectileSearchAgent initialQuery="JSB Hades" />));
    fireEvent.click(screen.getByTestId('projectile-search-search'));
    await waitFor(() => expect(screen.getByTestId('agent-sources')).toBeInTheDocument());
    const links = screen.getAllByRole('link');
    expect(links.some(l => l.getAttribute('href') === 'https://example.com/a')).toBe(true);
  });
});