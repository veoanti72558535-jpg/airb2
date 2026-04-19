import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from '@/lib/i18n';
import { ThemeProvider } from '@/lib/theme';
import ProjectilesPage, { hasBcZones, isEnrichedProjectile } from '@/pages/ProjectilesPage';
import { projectileStore } from '@/lib/storage';
import type { Projectile } from '@/lib/types';

/**
 * Tranche K — tests pour l'enrichissement de la liste projectile :
 *   - badges (enrichi, BC zones, importé)
 *   - filtres (importés, avec BC zones)
 *   - tri par calibre
 *   - rétrocompatibilité projectile legacy
 *
 * Aucune assertion ne touche au moteur balistique : on vérifie uniquement
 * la couche présentation.
 */

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

function makeLegacyProjectile(over: Partial<Projectile> = {}): Projectile {
  return {
    id: 'legacy-1',
    brand: 'JSB',
    model: 'Exact',
    weight: 8.44,
    bc: 0.021,
    bcModel: 'G1',
    projectileType: 'pellet',
    shape: 'domed',
    caliber: '.177',
    material: 'lead',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...over,
  };
}

function makeEnrichedProjectile(over: Partial<Projectile> = {}): Projectile {
  return {
    ...makeLegacyProjectile({
      id: 'enriched-1',
      brand: 'NSA',
      model: 'Slug 25g',
      weight: 25,
      bc: 0.061,
      caliber: '.22',
      projectileType: 'slug',
    }),
    caliberLabel: '.22 (5.5 mm)',
    diameterMm: 5.515,
    diameterIn: 0.2171,
    weightGrains: 25,
    weightGrams: 1.62,
    weightUnit: 'gr',
    bcG1: 0.061,
    bcG7: 0.031,
    lengthMm: 9.4,
    sourceTable: 'bullets4_pellets',
    sourceDbId: 'b4-12345',
    importedFrom: 'bullets4-db',
    bcZones: [
      { bc: 0.061, minVelocity: 200 },
      { bc: 0.058, minVelocity: 100 },
    ],
    ...over,
  };
}

/**
 * Seed direct du cache mémoire du `projectileStore` (Tranche IDB).
 *
 * Avant la migration vers IndexedDB, le store relisait `localStorage` à
 * chaque `getAll()` — il suffisait donc de poser la clé `pcp-projectiles`.
 * Désormais le store s'appuie sur un cache mémoire hydraté au bootstrap ;
 * en test on by-pass le bootstrap async et on hydrate directement, ce qui
 * reste cohérent : ces tests valident la couche présentation, pas la
 * persistance (couverte par projectile-repo.test.ts).
 */
function seed(projectiles: Projectile[]) {
  (projectileStore as unknown as { __hydrate: (items: Projectile[]) => void })
    .__hydrate(projectiles);
}

function renderApp() {
  return render(
    <ThemeProvider>
      <I18nProvider>
        <MemoryRouter initialEntries={['/projectiles']}>
          <ProjectilesPage />
        </MemoryRouter>
      </I18nProvider>
    </ThemeProvider>,
  );
}

describe('Tranche K — helpers projectile', () => {
  it('hasBcZones renvoie true pour un projectile avec zones non vides', () => {
    expect(hasBcZones(makeEnrichedProjectile())).toBe(true);
  });

  it('hasBcZones renvoie false pour un projectile sans zones', () => {
    expect(hasBcZones(makeLegacyProjectile())).toBe(false);
  });

  it('hasBcZones renvoie false pour bcZones = null ou tableau vide', () => {
    expect(hasBcZones(makeLegacyProjectile({ bcZones: null }))).toBe(false);
    expect(hasBcZones(makeLegacyProjectile({ bcZones: [] }))).toBe(false);
  });

  it('isEnrichedProjectile distingue legacy vs enrichi', () => {
    expect(isEnrichedProjectile(makeLegacyProjectile())).toBe(false);
    expect(isEnrichedProjectile(makeEnrichedProjectile())).toBe(true);
  });

  it('isEnrichedProjectile détecte un seul champ bullets4 (diameterMm)', () => {
    expect(isEnrichedProjectile(makeLegacyProjectile({ diameterMm: 4.5 }))).toBe(true);
  });
});

describe('Tranche K — ProjectilesPage liste enrichie', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('affiche le badge "Zones BC" pour un projectile avec bcZones', () => {
    seed([makeEnrichedProjectile()]);
    renderApp();
    const badges = screen.getAllByTestId('badge-bc-zones');
    expect(badges.length).toBe(1);
    expect(badges[0].textContent).toMatch(/2/); // count des zones
  });

  it('affiche le badge "Importé" pour un projectile avec importedFrom', () => {
    seed([makeEnrichedProjectile()]);
    renderApp();
    expect(screen.getByTestId('badge-imported')).toBeInTheDocument();
  });

  it('n\'affiche AUCUN badge enrichi sur un projectile legacy', () => {
    seed([makeLegacyProjectile()]);
    renderApp();
    expect(screen.queryByTestId('badge-bc-zones')).not.toBeInTheDocument();
    expect(screen.queryByTestId('badge-imported')).not.toBeInTheDocument();
    expect(screen.queryByTestId('badge-enriched')).not.toBeInTheDocument();
  });

  it('affiche le badge "Enrichi" pour un projectile bullets4 sans bcZones ni importedFrom', () => {
    seed([
      makeEnrichedProjectile({
        id: 'enriched-only',
        bcZones: undefined,
        importedFrom: undefined,
      }),
    ]);
    renderApp();
    expect(screen.getByTestId('badge-enriched')).toBeInTheDocument();
  });

  it('n\'affiche pas la ligne specs supplémentaires si tous les champs dimensionnels sont absents', () => {
    seed([makeLegacyProjectile({ length: undefined, diameter: undefined, shape: undefined, material: undefined })]);
    renderApp();
    // "L " doit être absent (pas de ligne specs)
    expect(screen.queryByText(/^L /)).not.toBeInTheDocument();
    expect(screen.queryByText(/^⌀/)).not.toBeInTheDocument();
  });

  it('filtre "Importés" ne garde que les projectiles avec importedFrom', () => {
    seed([
      makeLegacyProjectile({ id: 'a', model: 'Legacy A' }),
      makeEnrichedProjectile({ id: 'b', model: 'Imported B' }),
    ]);
    renderApp();
    expect(screen.getByText(/Legacy A/)).toBeInTheDocument();
    expect(screen.getByText(/Imported B/)).toBeInTheDocument();

    const btn = screen.getByRole('button', { name: /Importés|Imported/ });
    fireEvent.click(btn);

    expect(screen.queryByText(/Legacy A/)).not.toBeInTheDocument();
    expect(screen.getByText(/Imported B/)).toBeInTheDocument();
  });

  it('filtre "Avec zones BC" ne garde que les projectiles avec bcZones', () => {
    seed([
      makeLegacyProjectile({ id: 'a', model: 'Plain A' }),
      makeEnrichedProjectile({ id: 'b', model: 'Zoned B' }),
    ]);
    renderApp();
    const btn = screen.getByRole('button', { name: /Avec zones BC|With BC zones/ });
    fireEvent.click(btn);

    expect(screen.queryByText(/Plain A/)).not.toBeInTheDocument();
    expect(screen.getByText(/Zoned B/)).toBeInTheDocument();
  });

  it('tri par calibre ordonne les projectiles par calToken croissant', () => {
    seed([
      makeLegacyProjectile({ id: '25', model: 'Big', caliber: '.25' }),
      makeLegacyProjectile({ id: '177', model: 'Small', caliber: '.177' }),
      makeLegacyProjectile({ id: '22', model: 'Mid', caliber: '.22' }),
    ]);
    renderApp();

    const sortBtn = screen.getByRole('button', { name: /^Calibre$|^Caliber$/ });
    fireEvent.click(sortBtn);

    // Récupère l'ordre d'apparition des cartes via leurs noms.
    const html = document.body.innerHTML;
    const idxSmall = html.indexOf('Small');
    const idxMid = html.indexOf('Mid');
    const idxBig = html.indexOf('Big');
    expect(idxSmall).toBeLessThan(idxMid);
    expect(idxMid).toBeLessThan(idxBig);
  });

  it('le caliberLabel s\'affiche entre parenthèses quand différent du caliber canonique', () => {
    seed([makeEnrichedProjectile()]);
    renderApp();
    expect(screen.getByText(/\.22 \(5\.5 mm\)/)).toBeInTheDocument();
  });

  it('rend correctement un projectile legacy sans aucun champ bullets4', () => {
    seed([makeLegacyProjectile()]);
    renderApp();
    // Carte présente, badges enrichis absents, pas de plantage.
    expect(screen.getByText(/JSB Exact/)).toBeInTheDocument();
    expect(screen.queryByTestId('badge-bc-zones')).not.toBeInTheDocument();
    expect(screen.queryByTestId('badge-imported')).not.toBeInTheDocument();
    expect(screen.queryByTestId('badge-enriched')).not.toBeInTheDocument();
  });

  it('le filtre "Importés" n\'apparaît pas si aucun projectile n\'est importé', () => {
    seed([makeLegacyProjectile()]);
    renderApp();
    expect(screen.queryByRole('button', { name: /^Importés$|^Imported$/ })).not.toBeInTheDocument();
  });
});
