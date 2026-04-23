import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from '@/lib/i18n';

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ user: { id: 'test-user' }, session: null, loading: false }),
}));
vi.mock('@/lib/ai/agent-cache', () => ({
  queryAIWithCache: vi.fn().mockResolvedValue({
    ok: true,
    data: {
      text: '## Title\n- bullet **bold** *italic*\nLine',
      provider: 'quatarly',
      model: 'claude-haiku',
      run_id: 'r1',
      fromCache: false,
    },
  }),
  invalidateCache: vi.fn(),
  buildCacheKey: vi.fn(() => 'k'),
}));

import { FieldDeltaAnalyzerButton } from './FieldDeltaAnalyzerButton';
import { ChronoStatsInterpreterButton } from './ChronoStatsInterpreterButton';
import { GroupingAnalyzerButton } from './GroupingAnalyzerButton';
import { TuneStabilityCheckButton } from './TuneStabilityCheckButton';
import { AirgunPairingAdvisorButton } from './AirgunPairingAdvisorButton';
import { OpticSelectorAdvisorButton } from './OpticSelectorAdvisorButton';
import { ProjectileCompareAdvisorButton } from './ProjectileCompareAdvisorButton';
import { CaliberAdvisorButton } from './CaliberAdvisorButton';
import { SessionReportButton } from './SessionReportButton';
import { TrainingLogSummarizerButton } from './TrainingLogSummarizerButton';
import { CompetitionPrepAdvisorButton } from './CompetitionPrepAdvisorButton';
import { SimpleMarkdown } from './SimpleMarkdown';

const wrap = (ui: React.ReactNode) => (
  <MemoryRouter><I18nProvider>{ui}</I18nProvider></MemoryRouter>
);

const fakeSession: any = {
  id: 'sess-1', name: 'S1', createdAt: new Date().toISOString(),
  input: {
    muzzleVelocity: 280, bc: 0.03, projectileWeight: 18, sightHeight: 40,
    zeroRange: 30, maxRange: 100, rangeStep: 5, dragModel: 'G1',
    weather: { temperature: 15, humidity: 50, pressure: 1013, altitude: 0,
      windSpeed: 0, windAngle: 90, source: 'manual', timestamp: '' },
  },
  results: [{ range: 50, drop: -10, velocity: 260, energy: 28, holdoverMOA: 0, holdoverMRAD: 0, time: 0.2, drift: 0, driftMOA: 0, driftMRAD: 0 }],
};

beforeEach(() => vi.clearAllMocks());

describe('Build2 agent components — render', () => {
  it('FieldDeltaAnalyzerButton renders', () => {
    render(wrap(<FieldDeltaAnalyzerButton predictedDropMm={-10} measuredDropMm={-12} distanceM={50} />));
    expect(screen.getByTestId('field-delta-analyzer-btn')).toBeInTheDocument();
  });
  it('ChronoStatsInterpreterButton renders', () => {
    render(wrap(<ChronoStatsInterpreterButton esMs={6} sdMs={2} avgMs={280} shotCount={10} />));
    expect(screen.getByTestId('chrono-stats-interpreter-btn')).toBeInTheDocument();
  });
  it('GroupingAnalyzerButton renders inputs + becomes ready', () => {
    render(wrap(<GroupingAnalyzerButton defaultGroupMm={20} defaultDistanceM={50} />));
    expect(screen.getByTestId('grouping-analyzer-btn')).toBeInTheDocument();
  });
  it('TuneStabilityCheckButton invisible when < 5 measurements', () => {
    const { container } = render(wrap(<TuneStabilityCheckButton velocitiesMs={[1, 2, 3]} />));
    expect(container.querySelector('[data-testid="tune-stability-check-btn"]')).toBeNull();
  });
  it('TuneStabilityCheckButton visible with >= 5', () => {
    render(wrap(<TuneStabilityCheckButton velocitiesMs={[1, 2, 3, 4, 5]} />));
    expect(screen.getByTestId('tune-stability-check-btn')).toBeInTheDocument();
  });
  it('AirgunPairingAdvisorButton renders + usage select', () => {
    render(wrap(<AirgunPairingAdvisorButton airgunLabel="FX Impact" caliber=".22" />));
    expect(screen.getByTestId('airgun-pairing-usage')).toBeInTheDocument();
    expect(screen.getByTestId('airgun-pairing-advisor-btn')).toBeInTheDocument();
  });
  it('OpticSelectorAdvisorButton renders inputs', () => {
    render(wrap(<OpticSelectorAdvisorButton />));
    expect(screen.getByTestId('optic-advisor-range')).toBeInTheDocument();
    expect(screen.getByTestId('optic-advisor-btn')).toBeInTheDocument();
  });
  it('ProjectileCompareAdvisorButton hidden with <2 entries', () => {
    const { container } = render(wrap(<ProjectileCompareAdvisorButton entries={[{ name: 'A' }]} />));
    expect(container.querySelector('[data-testid="compare-advisor-btn"]')).toBeNull();
  });
  it('ProjectileCompareAdvisorButton visible with 2+ entries', () => {
    render(wrap(<ProjectileCompareAdvisorButton entries={[{ name: 'A', bc: 0.03 }, { name: 'B', bc: 0.025 }]} distanceM={50} />));
    expect(screen.getByTestId('compare-advisor-btn')).toBeInTheDocument();
  });
  it('CaliberAdvisorButton renders', () => {
    render(wrap(<CaliberAdvisorButton />));
    expect(screen.getByTestId('caliber-advisor-usage')).toBeInTheDocument();
    expect(screen.getByTestId('caliber-advisor-btn')).toBeInTheDocument();
  });
  it('SessionReportButton renders + opens dialog with rendered Markdown', async () => {
    render(wrap(<SessionReportButton session={fakeSession} />));
    fireEvent.click(screen.getByTestId('session-report-btn'));
    expect(await screen.findByTestId('session-report-content')).toBeInTheDocument();
    expect(screen.getByTestId('simple-markdown')).toBeInTheDocument();
  });
  it('TrainingLogSummarizerButton renders', () => {
    render(wrap(<TrainingLogSummarizerButton sessions={[fakeSession]} />));
    expect(screen.getByTestId('training-log-btn')).toBeInTheDocument();
  });
  it('CompetitionPrepAdvisorButton renders inputs', () => {
    render(wrap(<CompetitionPrepAdvisorButton />));
    expect(screen.getByTestId('comp-type')).toBeInTheDocument();
    expect(screen.getByTestId('comp-run')).toBeInTheDocument();
  });
  it('SimpleMarkdown renders headings + bullets', () => {
    render(wrap(<SimpleMarkdown source={'## Heading\n- item 1\n- item 2\n**bold**'} />));
    expect(screen.getByText('Heading')).toBeInTheDocument();
    expect(screen.getByText('item 1')).toBeInTheDocument();
  });
});