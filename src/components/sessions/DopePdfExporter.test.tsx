import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DopePdfExporter } from './DopePdfExporter';
import { I18nProvider } from '@/lib/i18n';
import type { Session } from '@/lib/types';

vi.mock('@/lib/dope-pdf-export', () => ({
  exportDopePdf: vi.fn().mockResolvedValue(undefined),
}));

const wrap = (ui: React.ReactElement) =>
  render(<I18nProvider>{ui}</I18nProvider>);

const MOCK_SESSION: Session = {
  id: 'test-1',
  name: 'Test Session',
  input: {
    muzzleVelocity: 280,
    bc: 0.025,
    projectileWeight: 18,
    sightHeight: 40,
    zeroRange: 30,
    maxRange: 80,
    rangeStep: 5,
    weather: {
      temperature: 20,
      humidity: 50,
      pressure: 1013,
      altitude: 0,
      windSpeed: 0,
      windAngle: 0,
      source: 'manual',
      timestamp: new Date().toISOString(),
    },
  },
  results: [
    { range: 0, drop: 0, holdover: 0, holdoverMRAD: 0, velocity: 280, energy: 45, tof: 0, windDrift: 0, windDriftMOA: 0, windDriftMRAD: 0 },
    { range: 10, drop: -1.2, holdover: -0.4, holdoverMRAD: -0.12, velocity: 270, energy: 42, tof: 0.036, windDrift: 0.1, windDriftMOA: 0.03, windDriftMRAD: 0.01 },
  ],
  tags: [],
  favorite: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('DopePdfExporter', () => {
  it('renders export button', () => {
    wrap(<DopePdfExporter session={MOCK_SESSION} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('is disabled when results are empty', () => {
    const empty = { ...MOCK_SESSION, results: [] };
    wrap(<DopePdfExporter session={empty} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('calls exportDopePdf on click', async () => {
    wrap(<DopePdfExporter session={MOCK_SESSION} />);
    fireEvent.click(screen.getByRole('button'));
    const { exportDopePdf } = await import('@/lib/dope-pdf-export');
    expect(exportDopePdf).toHaveBeenCalledTimes(1);
  });
});