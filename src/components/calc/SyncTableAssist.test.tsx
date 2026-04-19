/**
 * Tranche J — Tests de synchronisation entre la BallisticTable configurable
 * et le ReticleAssistPanel : la table est la source de vérité de la grille
 * d'affichage. Toute modification (start / max / step) doit se refléter
 * immédiatement dans l'assistant réticule, sans recalcul moteur.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { I18nProvider } from '@/lib/i18n';
import { reticleStore } from '@/lib/storage';
import { BallisticTable } from './BallisticTable';
import { ReticleAssistPanel } from './ReticleAssistPanel';
import {
  buildDistanceList,
  defaultConfig,
  type BallisticTableConfig,
} from '@/lib/ballistic-table';
import type { BallisticResult, Optic } from '@/lib/types';

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
const ROWS: BallisticResult[] = Array.from({ length: 21 }, (_, i) => mkRow(i * 5));

beforeEach(() => {
  localStorage.clear();
});

function Harness({ optic }: { optic: Optic | null }) {
  const [cfg, setCfg] = useState<BallisticTableConfig>(() => defaultConfig(100));
  return (
    <I18nProvider>
      <BallisticTable
        rows={ROWS}
        clickUnit="MRAD"
        maxRangeHint={100}
        initialConfig={cfg}
        onConfigChange={setCfg}
        defaultOpen
      />
      <ReticleAssistPanel
        optic={optic}
        results={ROWS}
        distances={buildDistanceList(cfg).filter(d => d > 0)}
        defaultOpen
      />
    </I18nProvider>
  );
}

function seedReticleMRAD() {
  return reticleStore.create({
    brand: 'Acme',
    model: 'Mil',
    type: 'mil-dot',
    unit: 'MRAD',
    subtension: 1,
    marks: [0, 0.5, 1, 1.5, 2],
  } as never);
}

describe('Sync BallisticTable ↔ ReticleAssistPanel', () => {
  it('partage la même grille initiale (pas par défaut = 10m pour max 100)', () => {
    const ret = seedReticleMRAD();
    render(<Harness optic={{ id: 'o', name: 'O', clickUnit: 'MRAD', clickValue: 0.1, createdAt: 'x', updatedAt: 'x', reticleId: ret.id }} />);
    // Table : lignes 0,10,20,...100 → l'assistant filtre d>0 donc 10..100
    expect(screen.getByTestId('bt-row-0')).toBeInTheDocument();
    expect(screen.getByTestId('bt-row-100')).toBeInTheDocument();
    expect(screen.getByTestId('ra-row-10')).toBeInTheDocument();
    expect(screen.getByTestId('ra-row-100')).toBeInTheDocument();
    // L'assistant n'inclut pas 0
    expect(screen.queryByTestId('ra-row-0')).toBeNull();
  });

  it('changer le pas de la table met à jour la grille de l\'assistant', () => {
    const ret = seedReticleMRAD();
    render(<Harness optic={{ id: 'o', name: 'O', clickUnit: 'MRAD', clickValue: 0.1, createdAt: 'x', updatedAt: 'x', reticleId: ret.id }} />);
    // Ouvre les réglages
    fireEvent.click(screen.getByText(/réglages|settings/i));
    const stepInput = screen.getByTestId('bt-step') as HTMLInputElement;
    fireEvent.change(stepInput, { target: { value: '25' } });
    // Nouvelle grille : 0,25,50,75,100 → assistant : 25,50,75,100
    expect(screen.getByTestId('bt-row-25')).toBeInTheDocument();
    expect(screen.getByTestId('bt-row-75')).toBeInTheDocument();
    expect(screen.getByTestId('ra-row-25')).toBeInTheDocument();
    expect(screen.getByTestId('ra-row-75')).toBeInTheDocument();
    // Anciennes lignes 10/20/etc. ne sont plus là
    expect(screen.queryByTestId('ra-row-10')).toBeNull();
    expect(screen.queryByTestId('ra-row-20')).toBeNull();
  });

  it('changer la distance max met à jour les deux composants', () => {
    const ret = seedReticleMRAD();
    render(<Harness optic={{ id: 'o', name: 'O', clickUnit: 'MRAD', clickValue: 0.1, createdAt: 'x', updatedAt: 'x', reticleId: ret.id }} />);
    fireEvent.click(screen.getByText(/réglages|settings/i));
    const maxInput = screen.getByTestId('bt-max') as HTMLInputElement;
    fireEvent.change(maxInput, { target: { value: '50' } });
    expect(screen.queryByTestId('bt-row-100')).toBeNull();
    expect(screen.queryByTestId('ra-row-100')).toBeNull();
    expect(screen.getByTestId('bt-row-50')).toBeInTheDocument();
    expect(screen.getByTestId('ra-row-50')).toBeInTheDocument();
  });

  it('changer la distance de départ met à jour la grille de l\'assistant', () => {
    const ret = seedReticleMRAD();
    render(<Harness optic={{ id: 'o', name: 'O', clickUnit: 'MRAD', clickValue: 0.1, createdAt: 'x', updatedAt: 'x', reticleId: ret.id }} />);
    fireEvent.click(screen.getByText(/réglages|settings/i));
    const startInput = screen.getByTestId('bt-start') as HTMLInputElement;
    fireEvent.change(startInput, { target: { value: '20' } });
    // start=20, step=10, max=100 → 20,30,...100
    expect(screen.queryByTestId('ra-row-10')).toBeNull();
    expect(screen.getByTestId('ra-row-20')).toBeInTheDocument();
    expect(screen.getByTestId('ra-row-30')).toBeInTheDocument();
  });

  it('le contrôle reste mode contrôlé : la prop initialConfig pilote l\'affichage', () => {
    function Outside() {
      const [cfg, setCfg] = useState<BallisticTableConfig>(() => defaultConfig(100));
      return (
        <I18nProvider>
          <button data-testid="force-50" onClick={() => setCfg({ ...cfg, maxDistance: 50, step: 5 })}>
            Force 50/5
          </button>
          <BallisticTable
            rows={ROWS}
            clickUnit="MRAD"
            initialConfig={cfg}
            onConfigChange={setCfg}
            defaultOpen
          />
        </I18nProvider>
      );
    }
    render(<Outside />);
    // Avant : max=100, step=10
    expect(screen.getByTestId('bt-row-100')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('force-50'));
    // Après : max=50, step=5 → la prop pilote bien l'affichage
    expect(screen.queryByTestId('bt-row-100')).toBeNull();
    expect(screen.getByTestId('bt-row-50')).toBeInTheDocument();
    expect(screen.getByTestId('bt-row-5')).toBeInTheDocument();
  });

  it('mode non-contrôlé (legacy) reste fonctionnel sans onConfigChange', () => {
    render(
      <I18nProvider>
        <BallisticTable rows={ROWS} clickUnit="MRAD" maxRangeHint={100} defaultOpen />
      </I18nProvider>,
    );
    fireEvent.click(screen.getByText(/réglages|settings/i));
    const stepInput = screen.getByTestId('bt-step') as HTMLInputElement;
    fireEvent.change(stepInput, { target: { value: '25' } });
    expect(screen.getByTestId('bt-row-25')).toBeInTheDocument();
    expect(screen.getByTestId('bt-row-75')).toBeInTheDocument();
  });

  it('assistant sans optique reste cohérent quand la table change', () => {
    render(<Harness optic={null} />);
    // Statut no-optic indépendamment de la grille
    expect(screen.getByTestId('reticle-assist').dataset.status).toBe('no-optic');
    fireEvent.click(screen.getByText(/réglages|settings/i));
    fireEvent.change(screen.getByTestId('bt-step') as HTMLInputElement, { target: { value: '25' } });
    expect(screen.getByTestId('reticle-assist').dataset.status).toBe('no-optic');
  });

  it('reset défauts dans la table propage aux distances de l\'assistant', () => {
    const ret = seedReticleMRAD();
    render(<Harness optic={{ id: 'o', name: 'O', clickUnit: 'MRAD', clickValue: 0.1, createdAt: 'x', updatedAt: 'x', reticleId: ret.id }} />);
    fireEvent.click(screen.getByText(/réglages|settings/i));
    fireEvent.change(screen.getByTestId('bt-step') as HTMLInputElement, { target: { value: '25' } });
    // L'utilisateur clique sur "Reset défauts"
    fireEvent.click(screen.getByText(/réinitialiser|reset/i));
    // Retour au pas par défaut (10)
    expect(screen.getByTestId('ra-row-10')).toBeInTheDocument();
    expect(screen.getByTestId('ra-row-20')).toBeInTheDocument();
  });

  it('valeurs réticule restent cohérentes après changement de pas (interpolation propre)', () => {
    const ret = seedReticleMRAD();
    render(<Harness optic={{ id: 'o', name: 'O', clickUnit: 'MRAD', clickValue: 0.1, createdAt: 'x', updatedAt: 'x', reticleId: ret.id }} />);
    fireEvent.click(screen.getByText(/réglages|settings/i));
    fireEvent.change(screen.getByTestId('bt-step') as HTMLInputElement, { target: { value: '25' } });
    // Pour 50m en MRAD : 50 * 0.015 = 0.75
    const row50 = screen.getByTestId('ra-row-50');
    expect(within(row50).getAllByText(/0\.75/).length).toBeGreaterThan(0);
  });
});
