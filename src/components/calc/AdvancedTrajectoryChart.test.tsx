import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AdvancedTrajectoryChart } from './AdvancedTrajectoryChart';
import { I18nProvider } from '@/lib/i18n';
import type { BallisticResult } from '@/lib/types';

// recharts uses ResizeObserver internally
class RO { observe() {} unobserve() {} disconnect() {} }
(globalThis as any).ResizeObserver = (globalThis as any).ResizeObserver || RO;

function mkRow(range: number, drop: number, windDrift = 0, energy = 20, velocity = 250): BallisticResult {
  return {
    range, drop, windDrift,
    holdover: 0, holdoverMRAD: 0,
    velocity, energy,
    tof: range * 0.004,
    windDriftMOA: 0, windDriftMRAD: 0,
    clicksElevation: 0, clicksWindage: 0,
  };
}

const ROWS: BallisticResult[] = [
  mkRow(0, 0, 0, 30, 280),
  mkRow(10, -5, 1, 28, 270),
  mkRow(20, -15, 3, 25, 260),
  mkRow(30, -30, 5, 22, 250),
  mkRow(50, -80, 10, 18, 230),
];

function renderChart(props: Partial<React.ComponentProps<typeof AdvancedTrajectoryChart>> = {}) {
  return render(
    <I18nProvider>
      <AdvancedTrajectoryChart results={ROWS} zeroRange={30} {...props} />
    </I18nProvider>,
  );
}

describe('AdvancedTrajectoryChart', () => {
  it('renders without error with valid data', () => {
    renderChart();
    expect(screen.getByTestId('advanced-chart')).toBeInTheDocument();
  });

  it('shows empty state with no data', () => {
    render(
      <I18nProvider>
        <AdvancedTrajectoryChart results={[]} zeroRange={0} />
      </I18nProvider>,
    );
    expect(screen.getByTestId('advanced-chart-empty')).toBeInTheDocument();
  });

  it('shows empty state with single row', () => {
    render(
      <I18nProvider>
        <AdvancedTrajectoryChart results={[mkRow(0, 0)]} zeroRange={0} />
      </I18nProvider>,
    );
    expect(screen.getByTestId('advanced-chart-empty')).toBeInTheDocument();
  });

  it('renders all three toggle buttons', () => {
    renderChart();
    expect(screen.getByRole('button', { name: /chute/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dérive/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /énergie/i })).toBeInTheDocument();
  });

  it('does not crash with pbr overlay', () => {
    renderChart({
      pbr: { vitalZoneM: 0.05, startDistance: 10, endDistance: 40 },
    });
    expect(screen.getByTestId('advanced-chart')).toBeInTheDocument();
  });
});