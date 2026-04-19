import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from '@/lib/i18n';
import { ThemeProvider } from '@/lib/theme';
import { ProjectilePicker, __PICKER_INTERNAL } from './ProjectilePicker';
import { __PROJECTILE_PREFS_KEYS } from '@/hooks/use-projectile-prefs';
import type { Projectile } from '@/lib/types';

/**
 * Tranche N — tests dédiés aux sections Favoris / Récents du picker.
 * Couvre la persistance localStorage, l'ordre, la déduplication, l'épinglage,
 * et l'interaction avec la recherche/filtres.
 */

function legacy(over: Partial<Projectile> = {}): Projectile {
  return {
    id: 'p',
    brand: 'JSB',
    model: 'Exact',
    weight: 8.44,
    bc: 0.021,
    bcModel: 'G1',
    projectileType: 'pellet',
    shape: 'domed',
    caliber: '.177',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...over,
  };
}

function renderPicker(
  projectiles: Projectile[],
  opts: { selectedId?: string; onSelect?: (id: string) => void } = {},
) {
  const onSelect = opts.onSelect ?? vi.fn();
  const onOpenChange = vi.fn();
  const utils = render(
    <MemoryRouter>
      <ThemeProvider>
        <I18nProvider>
          <ProjectilePicker
            open={true}
            onOpenChange={onOpenChange}
            projectiles={projectiles}
            selectedId={opts.selectedId ?? ''}
            onSelect={onSelect}
          />
        </I18nProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
  return { ...utils, onSelect, onOpenChange };
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

const data: Projectile[] = [
  legacy({ id: 'a', brand: 'JSB', model: 'Exact Heavy', caliber: '.22' }),
  legacy({ id: 'b', brand: 'H&N', model: 'Baracuda', caliber: '.22' }),
  legacy({ id: 'c', brand: 'NSA', model: 'Slug 25g', caliber: '.22' }),
  legacy({ id: 'd', brand: 'JSB', model: 'Match', caliber: '.177' }),
];

function flushSearchDebounce() {
  act(() => {
    vi.advanceTimersByTime(__PICKER_INTERNAL.SEARCH_DEBOUNCE_MS + 10);
  });
}

describe('ProjectilePicker — Favoris', () => {
  it('aucune section favoris affichée tant qu\'aucun favori', () => {
    renderPicker(data);
    expect(screen.queryByTestId('favorites-section')).not.toBeInTheDocument();
  });

  it('épingler un projectile fait apparaître la section Favoris', () => {
    renderPicker(data);
    const pin = screen.getByTestId('fav-toggle-a');
    fireEvent.click(pin);
    const section = screen.getByTestId('favorites-section');
    expect(section).toBeInTheDocument();
    expect(within(section).getByText(/JSB Exact Heavy/)).toBeInTheDocument();
  });

  it('cliquer une seconde fois retire le favori et masque la section', () => {
    renderPicker(data);
    fireEvent.click(screen.getByTestId('fav-toggle-a'));
    expect(screen.getByTestId('favorites-section')).toBeInTheDocument();
    // The pin button still exists in the row even if section also lists item;
    // re-clicking the row pin removes the favorite.
    fireEvent.click(screen.getByTestId('fav-toggle-a'));
    expect(screen.queryByTestId('favorites-section')).not.toBeInTheDocument();
  });

  it('le favori est persisté en localStorage', () => {
    renderPicker(data);
    fireEvent.click(screen.getByTestId('fav-toggle-c'));
    const stored = JSON.parse(
      localStorage.getItem(__PROJECTILE_PREFS_KEYS.FAVORITES_KEY) || '[]',
    );
    expect(stored).toContain('c');
  });

  it('cliquer un favori dans la section sélectionne le projectile', () => {
    const onSelect = vi.fn();
    renderPicker(data, { onSelect });
    fireEvent.click(screen.getByTestId('fav-toggle-b'));
    const section = screen.getByTestId('favorites-section');
    fireEvent.click(within(section).getByText(/H&N Baracuda/));
    expect(onSelect).toHaveBeenCalledWith('b');
  });

  it('un favori orphelin (id supprimé de la base) est ignoré', () => {
    localStorage.setItem(
      __PROJECTILE_PREFS_KEYS.FAVORITES_KEY,
      JSON.stringify(['ghost', 'a']),
    );
    renderPicker(data);
    const section = screen.getByTestId('favorites-section');
    expect(within(section).getByText(/JSB Exact Heavy/)).toBeInTheDocument();
    expect(within(section).queryByText(/ghost/i)).not.toBeInTheDocument();
  });
});

describe('ProjectilePicker — Récents', () => {
  it('aucune section récents au démarrage', () => {
    renderPicker(data);
    expect(screen.queryByTestId('recents-section')).not.toBeInTheDocument();
  });

  it('sélectionner un projectile l\'ajoute aux récents (persistance)', () => {
    renderPicker(data);
    fireEvent.click(screen.getByRole('option', { name: /NSA Slug 25g/ }));
    const stored = JSON.parse(
      localStorage.getItem(__PROJECTILE_PREFS_KEYS.RECENTS_KEY) || '[]',
    );
    expect(stored).toEqual(['c']);
  });

  it('sélectionner la saisie manuelle (id vide) ne pollue pas les récents', () => {
    renderPicker(data, { selectedId: 'a' });
    fireEvent.click(screen.getByRole('button', { name: /saisie manuelle/i }));
    const stored = JSON.parse(
      localStorage.getItem(__PROJECTILE_PREFS_KEYS.RECENTS_KEY) || '[]',
    );
    expect(stored).toEqual([]);
  });

  it('section Récents affiche les ids stockés', () => {
    localStorage.setItem(
      __PROJECTILE_PREFS_KEYS.RECENTS_KEY,
      JSON.stringify(['b', 'd']),
    );
    renderPicker(data);
    const section = screen.getByTestId('recents-section');
    expect(within(section).getByText(/H&N Baracuda/)).toBeInTheDocument();
    expect(within(section).getByText(/JSB Match/)).toBeInTheDocument();
  });

  it('un projectile favori n\'est PAS dupliqué dans Récents', () => {
    localStorage.setItem(
      __PROJECTILE_PREFS_KEYS.FAVORITES_KEY,
      JSON.stringify(['a']),
    );
    localStorage.setItem(
      __PROJECTILE_PREFS_KEYS.RECENTS_KEY,
      JSON.stringify(['a', 'b']),
    );
    renderPicker(data);
    const recents = screen.getByTestId('recents-section');
    expect(within(recents).queryByText(/JSB Exact Heavy/)).not.toBeInTheDocument();
    expect(within(recents).getByText(/H&N Baracuda/)).toBeInTheDocument();
  });

  it('bouton "Effacer les récents" vide la section', () => {
    localStorage.setItem(
      __PROJECTILE_PREFS_KEYS.RECENTS_KEY,
      JSON.stringify(['b']),
    );
    renderPicker(data);
    fireEvent.click(screen.getByRole('button', { name: /effacer les récents/i }));
    expect(screen.queryByTestId('recents-section')).not.toBeInTheDocument();
  });
});

describe('ProjectilePicker — Quick access vs recherche', () => {
  it('les sections favoris/récents sont masquées dès qu\'une recherche est active', () => {
    localStorage.setItem(
      __PROJECTILE_PREFS_KEYS.FAVORITES_KEY,
      JSON.stringify(['a']),
    );
    localStorage.setItem(
      __PROJECTILE_PREFS_KEYS.RECENTS_KEY,
      JSON.stringify(['b']),
    );
    renderPicker(data);
    expect(screen.getByTestId('favorites-section')).toBeInTheDocument();
    expect(screen.getByTestId('recents-section')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/rechercher/i), {
      target: { value: 'jsb' },
    });
    flushSearchDebounce();

    expect(screen.queryByTestId('favorites-section')).not.toBeInTheDocument();
    expect(screen.queryByTestId('recents-section')).not.toBeInTheDocument();
  });

  it('les sections sont aussi masquées quand un filtre est actif', () => {
    localStorage.setItem(
      __PROJECTILE_PREFS_KEYS.FAVORITES_KEY,
      JSON.stringify(['a']),
    );
    renderPicker(data);
    expect(screen.getByTestId('favorites-section')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /filtres/i }));
    fireEvent.click(screen.getByRole('button', { name: /\.177/ }));

    expect(screen.queryByTestId('favorites-section')).not.toBeInTheDocument();
  });
});

describe('ProjectilePicker — non-régression', () => {
  it('la sélection depuis la liste principale fonctionne toujours et ferme le dialog', () => {
    const onSelect = vi.fn();
    const { onOpenChange } = renderPicker(data, { onSelect });
    fireEvent.click(screen.getByRole('option', { name: /JSB Exact Heavy/ }));
    expect(onSelect).toHaveBeenCalledWith('a');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('un projectile legacy reste sélectionnable et marquable favori', () => {
    const onSelect = vi.fn();
    renderPicker(data, { onSelect });
    fireEvent.click(screen.getByTestId('fav-toggle-d'));
    fireEvent.click(screen.getByRole('option', { name: /JSB Match/ }));
    expect(onSelect).toHaveBeenCalledWith('d');
  });
});
