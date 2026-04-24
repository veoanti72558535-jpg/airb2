import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from '@/lib/i18n';
import { ThemeProvider } from '@/lib/theme';
import AirgunsPage from '@/pages/AirgunsPage';
import OpticsPage from '@/pages/OpticsPage';
import ProjectilesPage from '@/pages/ProjectilesPage';
import { airgunStore, opticStore, projectileStore } from '@/lib/storage';
import type { Airgun, Optic, Projectile } from '@/lib/types';

/**
 * Tranche favoris bibliothèque — vérifie que :
 *  1. Le bouton étoile est visible sur chaque carte (3 entités).
 *  2. Cliquer l'étoile appelle store.update() et bascule l'état favori.
 *  3. Les favoris remontent en haut de la liste.
 *  4. Le toggle "Favoris uniquement" filtre la liste.
 */

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

function airgun(over: Partial<Airgun> = {}): Airgun {
  return {
    id: 'a1', brand: 'FX', model: 'Impact M3',
    caliber: '.22 (5.5mm)', barrelLength: 600,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...over,
  };
}

function optic(over: Partial<Optic> = {}): Optic {
  return {
    id: 'o1', name: 'Element Helix 6-24',
    clickUnit: 'MRAD', clickValue: 0.1,
    tubeDiameter: 30, focalPlane: 'FFP',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...over,
  };
}

function projectile(over: Partial<Projectile> = {}): Projectile {
  return {
    id: 'p1', brand: 'JSB', model: 'Exact',
    weight: 8.44, bc: 0.021, bcModel: 'G1',
    projectileType: 'pellet', shape: 'domed',
    caliber: '.177', material: 'lead',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...over,
  };
}

function seedAirguns(items: Airgun[]) {
  localStorage.setItem('pcp-airguns', JSON.stringify(items));
}
function seedOptics(items: Optic[]) {
  localStorage.setItem('pcp-optics', JSON.stringify(items));
}
function seedProjectiles(items: Projectile[]) {
  (projectileStore as unknown as { __hydrate: (items: Projectile[]) => void })
    .__hydrate(items);
}

function renderWith(node: React.ReactNode, route: string) {
  return render(
    <ThemeProvider>
      <I18nProvider>
        <MemoryRouter initialEntries={[route]}>{node}</MemoryRouter>
      </I18nProvider>
    </ThemeProvider>,
  );
}

describe('Library favorites — Airguns', () => {
  beforeEach(() => localStorage.clear());

  it('renders a star button on each airgun card', () => {
    seedAirguns([airgun({ id: 'a1' }), airgun({ id: 'a2', model: 'Maverick' })]);
    renderWith(<AirgunsPage />, '/airguns');
    expect(screen.getByTestId('airgun-fav-a1')).toBeInTheDocument();
    expect(screen.getByTestId('airgun-fav-a2')).toBeInTheDocument();
  });

  it('clicking the star toggles the favorite flag via the store', () => {
    seedAirguns([airgun()]);
    const updateSpy = vi.spyOn(airgunStore, 'update');
    renderWith(<AirgunsPage />, '/airguns');
    fireEvent.click(screen.getByTestId('airgun-fav-a1'));
    expect(updateSpy).toHaveBeenCalledWith('a1', { favorite: true });
    updateSpy.mockRestore();
  });

  it('"Favorites only" toggle filters the list', () => {
    seedAirguns([
      airgun({ id: 'a1', model: 'Impact', favorite: true }),
      airgun({ id: 'a2', model: 'Maverick', favorite: false }),
    ]);
    renderWith(<AirgunsPage />, '/airguns');
    fireEvent.click(screen.getByTestId('airguns-favorites-only'));
    expect(screen.queryByText(/Maverick/)).not.toBeInTheDocument();
    expect(screen.getByText(/Impact/)).toBeInTheDocument();
  });
});

describe('Library favorites — Optics', () => {
  beforeEach(() => localStorage.clear());

  it('renders a star button on each optic card', () => {
    seedOptics([optic({ id: 'o1' }), optic({ id: 'o2', name: 'MTC Viper' })]);
    renderWith(<OpticsPage />, '/optics');
    expect(screen.getByTestId('optic-fav-o1')).toBeInTheDocument();
    expect(screen.getByTestId('optic-fav-o2')).toBeInTheDocument();
  });

  it('clicking the star calls opticStore.update with toggled flag', () => {
    seedOptics([optic({ favorite: true })]);
    const updateSpy = vi.spyOn(opticStore, 'update');
    renderWith(<OpticsPage />, '/optics');
    fireEvent.click(screen.getByTestId('optic-fav-o1'));
    expect(updateSpy).toHaveBeenCalledWith('o1', { favorite: false });
    updateSpy.mockRestore();
  });
});

describe('Library favorites — Projectiles', () => {
  beforeEach(() => localStorage.clear());

  it('renders a star button on each projectile card', () => {
    seedProjectiles([projectile({ id: 'p1' }), projectile({ id: 'p2', model: 'Hades' })]);
    renderWith(<ProjectilesPage />, '/projectiles');
    expect(screen.getByTestId('projectile-fav-p1')).toBeInTheDocument();
    expect(screen.getByTestId('projectile-fav-p2')).toBeInTheDocument();
  });

  it('"Favorites only" toggle hides non-favorites', () => {
    seedProjectiles([
      projectile({ id: 'p1', model: 'Exact', favorite: true }),
      projectile({ id: 'p2', model: 'Hades', favorite: false }),
    ]);
    renderWith(<ProjectilesPage />, '/projectiles');
    fireEvent.click(screen.getByTestId('projectiles-favorites-only'));
    expect(screen.queryByText(/Hades/)).not.toBeInTheDocument();
    expect(screen.getByText(/Exact/)).toBeInTheDocument();
  });

  it('favorites are sorted to the top of the list', () => {
    seedProjectiles([
      projectile({ id: 'p1', brand: 'AAA', model: 'NotFav', favorite: false }),
      projectile({ id: 'p2', brand: 'ZZZ', model: 'IsFav', favorite: true }),
    ]);
    renderWith(<ProjectilesPage />, '/projectiles');
    const isFav = screen.getByText(/IsFav/);
    const notFav = screen.getByText(/NotFav/);
    // IsFav should appear in the DOM before NotFav
    expect(isFav.compareDocumentPosition(notFav) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});