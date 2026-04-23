import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { TruingPanel } from './TruingPanel';
import type { Session } from '@/lib/types';

// Mock i18n
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, language: 'en' }),
}));

// Mock storage
const mockCreate = vi.fn().mockReturnValue({ id: 'new-proj-1' });
vi.mock('@/lib/storage', () => ({
  projectileStore: {
    getById: () => ({ brand: 'JSB', model: 'Exact', weight: 18, bc: 0.025, caliber: '.22' }),
    create: (...args: any[]) => mockCreate(...args),
  },
}));

// Mock ballistics (calculateTrajectory)
vi.mock('@/lib/ballistics', () => ({
  calculateTrajectory: (input: any) => {
    // Return a single row at maxRange with a deterministic drop
    return [
      { range: 0, drop: 0 },
      { range: input.maxRange, drop: -120.5 },
    ];
  },
}));

// Mock calibrateBC — we control the result
const mockCalibrateBC = vi.fn();
vi.mock('@/lib/calibration', () => ({
  calibrateBC: (...args: any[]) => mockCalibrateBC(...args),
}));

function makeSession(bc = 0.025): Session {
  return {
    id: 'sess-1',
    name: 'Test Session',
    favorite: false,
    tags: [],
    projectileId: 'proj-1',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
    results: [],
    input: {
      muzzleVelocity: 280,
      bc,
      projectileWeight: 18,
      sightHeight: 50,
      zeroRange: 30,
      maxRange: 100,
      rangeStep: 10,
      weather: {
        temperature: 15,
        humidity: 50,
        pressure: 1013,
        altitude: 0,
        windSpeed: 0,
        windAngle: 0,
        source: 'manual',
        timestamp: '',
      },
    },
  };
}

describe('TruingPanel', () => {
  const onBcCorrected = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without error', () => {
    render(<TruingPanel session={makeSession()} onBcCorrected={onBcCorrected} />);
    expect(screen.getByText('truing.title')).toBeInTheDocument();
  });

  it('shows distance and drop fields', () => {
    render(<TruingPanel session={makeSession()} onBcCorrected={onBcCorrected} />);
    expect(screen.getByText('truing.measuredDist')).toBeInTheDocument();
    expect(screen.getByText('truing.measuredDrop')).toBeInTheDocument();
  });

  it('calculate calls calibrateBC', () => {
    mockCalibrateBC.mockReturnValue({
      originalBc: 0.025,
      correctedBc: 0.023,
      factor: 0.92,
      predictedDropMm: -120,
      achievedDropMm: -135,
      iterations: 12,
    });
    render(<TruingPanel session={makeSession()} onBcCorrected={onBcCorrected} />);
    const dropInput = screen.getByPlaceholderText('-120');
    fireEvent.change(dropInput, { target: { value: '-135' } });
    fireEvent.click(screen.getByText('truing.calculate'));
    expect(mockCalibrateBC).toHaveBeenCalled();
  });

  it('shows factor < 1 when more drop than predicted', () => {
    mockCalibrateBC.mockReturnValue({
      originalBc: 0.025,
      correctedBc: 0.023,
      factor: 0.92,
      predictedDropMm: -120,
      achievedDropMm: -135,
      iterations: 12,
    });
    render(<TruingPanel session={makeSession()} onBcCorrected={onBcCorrected} />);
    fireEvent.change(screen.getByPlaceholderText('-120'), { target: { value: '-135' } });
    fireEvent.click(screen.getByText('truing.calculate'));
    expect(screen.getByText(/0\.0230/)).toBeInTheDocument();
  });

  it('shows factor > 1 when less drop than predicted', () => {
    mockCalibrateBC.mockReturnValue({
      originalBc: 0.025,
      correctedBc: 0.028,
      factor: 1.12,
      predictedDropMm: -120,
      achievedDropMm: -100,
      iterations: 10,
    });
    render(<TruingPanel session={makeSession()} onBcCorrected={onBcCorrected} />);
    fireEvent.change(screen.getByPlaceholderText('-120'), { target: { value: '-100' } });
    fireEvent.click(screen.getByText('truing.calculate'));
    expect(screen.getByText(/0\.0280/)).toBeInTheDocument();
  });

  it('shows warning badge for extreme factor', () => {
    mockCalibrateBC.mockReturnValue({
      originalBc: 0.025,
      correctedBc: 0.01,
      factor: 0.4,
      predictedDropMm: -120,
      achievedDropMm: -500,
      iterations: 40,
      warning: 'extreme',
    });
    render(<TruingPanel session={makeSession()} onBcCorrected={onBcCorrected} />);
    fireEvent.change(screen.getByPlaceholderText('-120'), { target: { value: '-500' } });
    fireEvent.click(screen.getByText('truing.calculate'));
    expect(screen.getByText('truing.warnExtreme')).toBeInTheDocument();
  });

  it('save new projectile calls projectileStore.create', () => {
    mockCalibrateBC.mockReturnValue({
      originalBc: 0.025,
      correctedBc: 0.023,
      factor: 0.92,
      predictedDropMm: -120,
      achievedDropMm: -135,
      iterations: 12,
    });
    render(<TruingPanel session={makeSession()} onBcCorrected={onBcCorrected} />);
    fireEvent.change(screen.getByPlaceholderText('-120'), { target: { value: '-135' } });
    fireEvent.click(screen.getByText('truing.calculate'));
    fireEvent.click(screen.getByText('truing.saveNew'));
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ bc: 0.023 }),
    );
    expect(onBcCorrected).toHaveBeenCalledWith(0.023, 'new-proj-1');
  });

  it('apply session calls onBcCorrected without projectileId', () => {
    mockCalibrateBC.mockReturnValue({
      originalBc: 0.025,
      correctedBc: 0.023,
      factor: 0.92,
      predictedDropMm: -120,
      achievedDropMm: -135,
      iterations: 12,
    });
    render(<TruingPanel session={makeSession()} onBcCorrected={onBcCorrected} />);
    fireEvent.change(screen.getByPlaceholderText('-120'), { target: { value: '-135' } });
    fireEvent.click(screen.getByText('truing.calculate'));
    fireEvent.click(screen.getByText('truing.applySession'));
    expect(onBcCorrected).toHaveBeenCalledWith(0.023, undefined);
  });

  it('restart returns to step 1', () => {
    mockCalibrateBC.mockReturnValue({
      originalBc: 0.025,
      correctedBc: 0.023,
      factor: 0.92,
      predictedDropMm: -120,
      achievedDropMm: -135,
      iterations: 12,
    });
    render(<TruingPanel session={makeSession()} onBcCorrected={onBcCorrected} />);
    fireEvent.change(screen.getByPlaceholderText('-120'), { target: { value: '-135' } });
    fireEvent.click(screen.getByText('truing.calculate'));
    expect(screen.queryByText('truing.measuredDist')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('truing.restart'));
    expect(screen.getByText('truing.measuredDist')).toBeInTheDocument();
  });
});