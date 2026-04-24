/**
 * Tranche J — Tests d'intégration de la zone avancée d'une session :
 * - BallisticTable visible avec les résultats figés
 * - ReticleAssistPanel visible et synchronisé sur la même grille
 * - Modifier le pas dans la table met à jour la grille de l'assistant
 * - Aucun recalcul moteur (les résultats sont juste lus)
 */
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from '@/lib/i18n';
import { ThemeProvider } from '@/lib/theme';
import { AuthProvider } from '@/lib/auth-context';
import SessionsPage from '@/pages/SessionsPage';
import { reticleStore } from '@/lib/storage';
import type { BallisticResult, Optic, Reticle, Session } from '@/lib/types';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

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

function makeSessionWithResults(opticId?: string): Session {
  const results = Array.from({ length: 11 }, (_, i) => mkRow(i * 10)); // 0..100 step 10
  return {
    id: 'sess-adv',
    name: 'Session avancée',
    input: {
      muzzleVelocity: 280,
      bc: 0.025,
      projectileWeight: 18,
      sightHeight: 50,
      zeroRange: 30,
      maxRange: 100,
      rangeStep: 10,
      clickUnit: 'MRAD',
      weather: {
        temperature: 15, humidity: 50, pressure: 1013, altitude: 0,
        windSpeed: 0, windAngle: 0, source: 'manual', timestamp: '',
      },
    },
    opticId,
    results,
    tags: [],
    favorite: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

function seedOpticWithReticle(): { optic: Optic; reticle: Reticle } {
  const reticle = reticleStore.create({
    brand: 'Acme',
    model: 'Mil',
    type: 'mil-dot',
    unit: 'MRAD',
    subtension: 1,
    marks: [0, 0.5, 1, 1.5, 2],
  } as never);
  const optic: Optic = {
    id: 'opt-1',
    name: 'Optique liée',
    clickUnit: 'MRAD',
    clickValue: 0.1,
    reticleId: reticle.id,
    createdAt: 'x',
    updatedAt: 'x',
  };
  return { optic, reticle };
}

function renderPage() {
  return render(
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <MemoryRouter initialEntries={['/sessions']}>
            <SessionsPage />
          </MemoryRouter>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>,
  );
}

describe('SessionsPage — bloc avancé Tranche J', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('affiche BallisticTable et ReticleAssistPanel pour une session avec résultats', () => {
    const { optic } = seedOpticWithReticle();
    localStorage.setItem('pcp-optics', JSON.stringify([optic]));
    localStorage.setItem(
      'pcp-sessions',
      JSON.stringify([makeSessionWithResults(optic.id)]),
    );
    renderPage();
    expect(screen.getByTestId('ballistic-table')).toBeInTheDocument();
    expect(screen.getByTestId('reticle-assist')).toBeInTheDocument();
  });

  it('l\'assistant lit l\'optique liée de la session et affiche son réticule MRAD', () => {
    const { optic } = seedOpticWithReticle();
    localStorage.setItem('pcp-optics', JSON.stringify([optic]));
    localStorage.setItem(
      'pcp-sessions',
      JSON.stringify([makeSessionWithResults(optic.id)]),
    );
    renderPage();
    // Ouvre la table puis l'assistant pour révéler les lignes
    fireEvent.click(screen.getByText(/Table balistique|Ballistic table/i));
    fireEvent.click(screen.getByText(/Assistant réticule|Reticle assist/i));
    expect(screen.getByTestId('reticle-assist').dataset.status).toBe('ok');
    // Au moins une ligne assistant > 0
    expect(screen.getByTestId('ra-row-10')).toBeInTheDocument();
    expect(screen.getByTestId('ra-row-100')).toBeInTheDocument();
  });

  it('affiche l\'état no-optic quand la session n\'a pas d\'optique liée', () => {
    localStorage.setItem(
      'pcp-sessions',
      JSON.stringify([makeSessionWithResults(undefined)]),
    );
    renderPage();
    fireEvent.click(screen.getByText(/Assistant réticule|Reticle assist/i));
    expect(screen.getByTestId('reticle-assist').dataset.status).toBe('no-optic');
  });

  it('changer le pas de la table met à jour les distances de l\'assistant', () => {
    const { optic } = seedOpticWithReticle();
    localStorage.setItem('pcp-optics', JSON.stringify([optic]));
    localStorage.setItem(
      'pcp-sessions',
      JSON.stringify([makeSessionWithResults(optic.id)]),
    );
    renderPage();
    fireEvent.click(screen.getByText(/Table balistique|Ballistic table/i));
    fireEvent.click(screen.getByText(/Assistant réticule|Reticle assist/i));
    // Etat initial : pas=10 → ra-row-10 présent
    expect(screen.getByTestId('ra-row-10')).toBeInTheDocument();
    // Ouvrir réglages, passer step à 25
    fireEvent.click(screen.getByText(/Réglages|Settings/i));
    fireEvent.change(screen.getByTestId('bt-step'), { target: { value: '25' } });
    // L'assistant doit maintenant montrer 25/50/75/100
    expect(screen.queryByTestId('ra-row-10')).toBeNull();
    expect(screen.getByTestId('ra-row-25')).toBeInTheDocument();
    expect(screen.getByTestId('ra-row-50')).toBeInTheDocument();
  });
});
