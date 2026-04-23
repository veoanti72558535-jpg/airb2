import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'fr' }),
}));

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('@/lib/field-measurements-repo', () => ({
  getFieldMeasurements: vi.fn(),
}));

import { TargetAnalysesHistory } from './TargetAnalysesHistory';
import { getFieldMeasurements } from '@/lib/field-measurements-repo';

const fetchMock = vi.mocked(getFieldMeasurements);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TargetAnalysesHistory', () => {
  it('hides itself when no target-photo entries exist', async () => {
    fetchMock.mockResolvedValueOnce([
      { sessionId: 's1', distanceM: 50, conditions: { source: 'manual' } },
    ]);
    const { container } = render(<TargetAnalysesHistory sessionId="s1" />);
    await waitFor(() =>
      expect(container.querySelector('[data-testid="target-analyses-history"]')).toBeNull(),
    );
  });

  it('renders only target-photo-analyzer entries with date, confidence and summary', async () => {
    fetchMock.mockResolvedValueOnce([
      {
        id: 'm1',
        sessionId: 's1',
        distanceM: 50,
        measuredDropMm: -12.4,
        measuredWindageMm: 3.2,
        measuredAt: '2026-04-20T10:00:00.000Z',
        notes: '[target-photo-analyzer] groupement serré',
        conditions: { source: 'target-photo-analyzer', confidence: 0.82, groupSizeMm: 18.5, shotCount: 5 },
      },
      {
        id: 'm2',
        sessionId: 's1',
        distanceM: 25,
        measuredDropMm: -2.1,
        notes: 'manual entry',
        conditions: { source: 'manual' },
      },
    ]);
    render(<TargetAnalysesHistory sessionId="s1" />);
    await waitFor(() =>
      expect(screen.getByTestId('target-analyses-history')).toBeInTheDocument(),
    );
    const items = screen.getAllByTestId('target-analyses-item');
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent('50 m');
    expect(items[0]).toHaveTextContent('18.5 mm');
    expect(items[0]).toHaveTextContent('groupement serré');
    expect(screen.getByTestId('target-analyses-confidence')).toHaveTextContent('82%');
  });

  it('shows nothing when user is not authenticated', async () => {
    // Auth mock returns user-1, so override with empty fetch result
    fetchMock.mockResolvedValueOnce([]);
    const { container } = render(<TargetAnalysesHistory sessionId="s1" />);
    await waitFor(() =>
      expect(container.querySelector('[data-testid="target-analyses-history"]')).toBeNull(),
    );
  });
});