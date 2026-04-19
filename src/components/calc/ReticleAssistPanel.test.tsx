/**
 * Tranche I — Tests UI du panneau d'assistance réticule.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReticleAssistPanel } from './ReticleAssistPanel';
import { I18nProvider } from '@/lib/i18n';
import { reticleStore } from '@/lib/storage';
import type { BallisticResult, Optic, Reticle } from '@/lib/types';

function mkRow(range: number): BallisticResult {
  return {
    range,
    drop: -range * 0.5,
    holdover: range * 0.05,
    holdoverMRAD: range * 0.015,
    velocity: 280 - range,
    energy: 30 - range * 0.1,
    tof: range * 0.005,
    windDrift: range * 0.1,
    windDriftMOA: range * 0.01,
    windDriftMRAD: range * 0.003,
  };
}
const ROWS: BallisticResult[] = [0, 25, 50, 75, 100].map(mkRow);

function mkOptic(extras: Partial<Optic> = {}): Optic {
  return {
    id: 'o1',
    name: 'Test',
    clickUnit: 'MRAD',
    clickValue: 0.1,
    createdAt: 'x',
    updatedAt: 'x',
    ...extras,
  };
}

function seedReticle(extras: Partial<Reticle> = {}): Reticle {
  return reticleStore.create({
    brand: 'Acme',
    model: 'Mil-Dot',
    type: 'mil-dot',
    unit: 'MRAD',
    subtension: 1,
    marks: [0, 0.5, 1, 1.5, 2],
    ...extras,
  } as Omit<Reticle, 'id' | 'createdAt' | 'updatedAt'>);
}

beforeEach(() => {
  localStorage.clear();
});

function renderPanel(props: Partial<React.ComponentProps<typeof ReticleAssistPanel>> = {}) {
  return render(
    <I18nProvider>
      <ReticleAssistPanel
        results={ROWS}
        distances={[25, 50, 75, 100]}
        defaultOpen
        {...props}
      />
    </I18nProvider>,
  );
}

describe('ReticleAssistPanel — états vides', () => {
  it('affiche l\'état no-optic quand aucune optique', () => {
    renderPanel({ optic: null });
    expect(screen.getByTestId('reticle-assist').dataset.status).toBe('no-optic');
    expect(screen.getByTestId('ra-empty-no-optic')).toBeInTheDocument();
  });

  it('affiche l\'état no-reticle quand l\'optique n\'a pas de reticleId', () => {
    renderPanel({ optic: mkOptic() });
    expect(screen.getByTestId('reticle-assist').dataset.status).toBe('no-reticle');
    expect(screen.getByTestId('ra-empty-no-reticle')).toBeInTheDocument();
  });

  it('affiche l\'état reticle-missing quand le réticule lié est introuvable', () => {
    renderPanel({ optic: mkOptic({ reticleId: 'ghost' }) });
    expect(screen.getByTestId('reticle-assist').dataset.status).toBe('reticle-missing');
    expect(screen.getByTestId('ra-empty-reticle-missing')).toBeInTheDocument();
  });
});

describe('ReticleAssistPanel — affichage ok', () => {
  it('rend la table avec une ligne par distance fournie', () => {
    const ret = seedReticle();
    renderPanel({ optic: mkOptic({ reticleId: ret.id }) });
    expect(screen.getByTestId('ra-table')).toBeInTheDocument();
    expect(screen.getByTestId('ra-row-25')).toBeInTheDocument();
    expect(screen.getByTestId('ra-row-50')).toBeInTheDocument();
    expect(screen.getByTestId('ra-row-100')).toBeInTheDocument();
  });

  it('affiche les valeurs en MRAD pour un réticule MRAD', () => {
    const ret = seedReticle({ unit: 'MRAD' });
    renderPanel({ optic: mkOptic({ reticleId: ret.id }) });
    // holdoverMRAD pour 50m = 50 * 0.015 = 0.75
    const row = screen.getByTestId('ra-row-50');
    expect(row.textContent).toContain('0.75');
  });

  it('affiche les valeurs en MOA pour un réticule MOA', () => {
    const ret = seedReticle({ unit: 'MOA' });
    renderPanel({ optic: mkOptic({ reticleId: ret.id }) });
    // holdover MOA pour 50m = 50 * 0.05 = 2.50
    const row = screen.getByTestId('ra-row-50');
    expect(row.textContent).toContain('2.50');
  });

  it('signale degraded=no-marks pour un réticule sans marks', () => {
    const ret = seedReticle({ marks: undefined });
    renderPanel({ optic: mkOptic({ reticleId: ret.id }) });
    expect(screen.getByTestId('ra-degraded-nomarks')).toBeInTheDocument();
  });

  it('signale degraded=sfp pour un réticule SFP sans calibration', () => {
    const ret = seedReticle({ focalPlane: 'SFP' });
    renderPanel({ optic: mkOptic({ reticleId: ret.id, magCalibration: undefined }) });
    expect(screen.getByTestId('ra-degraded-sfp')).toBeInTheDocument();
  });
});

describe('ReticleAssistPanel — interaction', () => {
  it('replie / déplie le panneau via le header', () => {
    renderPanel({ optic: null, defaultOpen: true });
    const header = screen.getByRole('button', { expanded: true });
    fireEvent.click(header);
    expect(screen.queryByTestId('ra-empty-no-optic')).toBeNull();
  });
});
