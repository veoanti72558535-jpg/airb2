import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ChronoMeasurementsList from './ChronoMeasurementsList';
import { I18nProvider } from '@/lib/i18n';
import type { ChronoMeasurement } from '@/lib/chrono/chrono-repo';

const wrap = (ui: React.ReactElement) =>
  render(<I18nProvider>{ui}</I18nProvider>);

const MEASUREMENTS: ChronoMeasurement[] = [
  { source: 'ble', velocityMs: 250.0, shotNumber: 1 },
  { source: 'ble', velocityMs: 252.0, shotNumber: 2 },
  { source: 'manual', velocityMs: 248.0, shotNumber: 3 },
];

describe('ChronoMeasurementsList', () => {
  it('shows empty state', () => {
    wrap(<ChronoMeasurementsList measurements={[]} onAdd={vi.fn()} />);
    expect(screen.getByText(/No measurements|Aucune mesure/i)).toBeInTheDocument();
  });

  it('displays stats correctly', () => {
    wrap(<ChronoMeasurementsList measurements={MEASUREMENTS} onAdd={vi.fn()} />);
    // Average = 250.00
    expect(screen.getByText('250 m/s')).toBeInTheDocument();
    // ES = 4
    expect(screen.getByText('4 m/s')).toBeInTheDocument();
  });

  it('calls onAdd for manual entry', () => {
    const onAdd = vi.fn();
    wrap(<ChronoMeasurementsList measurements={[]} onAdd={onAdd} />);
    const input = screen.getByPlaceholderText(/m\/s/);
    fireEvent.change(input, { target: { value: '245' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd.mock.calls[0][0].velocityMs).toBe(245);
  });
});