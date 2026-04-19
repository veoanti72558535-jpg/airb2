import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from '@/lib/i18n';
import { ThemeProvider } from '@/lib/theme';
import {
  ProjectilePicker,
  pickerHasBcZones,
  pickerIsImported,
  __PICKER_INTERNAL,
} from './ProjectilePicker';
import type { Projectile } from '@/lib/types';

/**
 * Tranches L + M — tests for the advanced projectile picker.
 * No engine code is exercised here — purely UI selection behavior + perf.
 */

/** Type into the search input AND flush the internal debounce. */
function typeSearch(value: string) {
  fireEvent.change(screen.getByLabelText(/rechercher/i), { target: { value } });
  act(() => {
    vi.advanceTimersByTime(__PICKER_INTERNAL.SEARCH_DEBOUNCE_MS + 10);
  });
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

function legacy(over: Partial<Projectile> = {}): Projectile {
  return {
    id: 'p-legacy',
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

function enriched(over: Partial<Projectile> = {}): Projectile {
  return legacy({
    id: 'p-enriched',
    brand: 'NSA',
    model: 'Slug 25g',
    weight: 25,
    bc: 0.061,
    bcModel: 'G1',
    projectileType: 'slug',
    caliber: '.22',
    caliberLabel: '.22 (5.5 mm)',
    diameterMm: 5.51,
    importedFrom: 'bullets4-db',
    bcZones: [
      { bc: 0.061, minVelocity: 250 },
      { bc: 0.058, minVelocity: 200 },
    ],
    ...over,
  });
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

describe('pickerHasBcZones / pickerIsImported helpers', () => {
  it('detects bcZones presence', () => {
    expect(pickerHasBcZones(legacy())).toBe(false);
    expect(pickerHasBcZones(enriched())).toBe(true);
    expect(pickerHasBcZones(legacy({ bcZones: [] }))).toBe(false);
    expect(pickerHasBcZones(legacy({ bcZones: null }))).toBe(false);
  });

  it('detects imported source', () => {
    expect(pickerIsImported(legacy())).toBe(false);
    expect(pickerIsImported(enriched())).toBe(true);
    expect(pickerIsImported(legacy({ importedFrom: 'strelok' }))).toBe(true);
  });
});

describe('ProjectilePicker — empty state', () => {
  it('shows the empty-library message when no projectiles', () => {
    renderPicker([]);
    expect(screen.getByText(/aucun projectile dans la bibliothèque/i)).toBeInTheDocument();
  });
});

describe('ProjectilePicker — listing & search', () => {
  const data = [
    legacy({ id: 'a', brand: 'JSB', model: 'Exact Heavy', caliber: '.22', weight: 18.13 }),
    legacy({ id: 'b', brand: 'H&N', model: 'Baracuda', caliber: '.22', weight: 21 }),
    enriched({ id: 'c', brand: 'NSA', model: 'Slug 25g', caliber: '.22' }),
    legacy({ id: 'd', brand: 'JSB', model: 'Match', caliber: '.177', weight: 8.44 }),
  ];

  it('lists every projectile by default', () => {
    renderPicker(data);
    expect(screen.getByText(/JSB Exact Heavy/)).toBeInTheDocument();
    expect(screen.getByText(/H&N Baracuda/)).toBeInTheDocument();
    expect(screen.getByText(/NSA Slug 25g/)).toBeInTheDocument();
    expect(screen.getByText(/JSB Match/)).toBeInTheDocument();
  });

  it('filters by brand text', () => {
    renderPicker(data);
    typeSearch('jsb');
    expect(screen.getByText(/JSB Exact Heavy/)).toBeInTheDocument();
    expect(screen.getByText(/JSB Match/)).toBeInTheDocument();
    expect(screen.queryByText(/H&N Baracuda/)).not.toBeInTheDocument();
    expect(screen.queryByText(/NSA Slug/)).not.toBeInTheDocument();
  });

  it('filters by model text', () => {
    renderPicker(data);
    typeSearch('baracuda');
    expect(screen.getByText(/H&N Baracuda/)).toBeInTheDocument();
    expect(screen.queryByText(/JSB Exact Heavy/)).not.toBeInTheDocument();
  });

  it('filters by caliber text', () => {
    renderPicker(data);
    typeSearch('.177');
    expect(screen.getByText(/JSB Match/)).toBeInTheDocument();
    expect(screen.queryByText(/H&N Baracuda/)).not.toBeInTheDocument();
  });

  it('shows the no-results message when filters exclude everything', () => {
    renderPicker(data);
    typeSearch('zzznever');
    expect(screen.getByText(/aucun projectile ne correspond/i)).toBeInTheDocument();
  });
});

describe('ProjectilePicker — filters', () => {
  const data = [
    legacy({ id: 'a', brand: 'JSB', model: 'Exact', caliber: '.22', projectileType: 'pellet' }),
    legacy({ id: 'b', brand: 'NSA', model: 'Slug', caliber: '.22', projectileType: 'slug' }),
    enriched({ id: 'c', brand: 'NSA', model: 'Slug 25g', caliber: '.22' }), // imported + bcZones + slug
    legacy({ id: 'd', brand: 'H&N', model: 'Match', caliber: '.177', projectileType: 'pellet' }),
  ];

  function openFilters() {
    fireEvent.click(screen.getByRole('button', { name: /filtres/i }));
  }

  it('caliber filter narrows to selected caliber only', () => {
    renderPicker(data);
    openFilters();
    fireEvent.click(screen.getByRole('button', { name: /\.177/ }));
    expect(screen.getByText(/H&N Match/)).toBeInTheDocument();
    expect(screen.queryByText(/JSB Exact/)).not.toBeInTheDocument();
    expect(screen.queryByText(/NSA Slug 25g/)).not.toBeInTheDocument();
  });

  it('type filter narrows to selected projectile type', () => {
    renderPicker(data);
    openFilters();
    // Inside the filters panel, "slug" chip
    fireEvent.click(screen.getByRole('button', { name: /^slug \(/i }));
    expect(screen.getByText(/NSA Slug$/)).toBeInTheDocument();
    expect(screen.getByText(/NSA Slug 25g/)).toBeInTheDocument();
    expect(screen.queryByText(/JSB Exact/)).not.toBeInTheDocument();
    expect(screen.queryByText(/H&N Match/)).not.toBeInTheDocument();
  });

  it('imported-only filter keeps only imported projectiles', () => {
    renderPicker(data);
    openFilters();
    fireEvent.click(screen.getByRole('button', { name: /importés uniquement/i }));
    expect(screen.getByText(/NSA Slug 25g/)).toBeInTheDocument();
    expect(screen.queryByText(/JSB Exact/)).not.toBeInTheDocument();
    expect(screen.queryByText(/H&N Match/)).not.toBeInTheDocument();
  });

  it('with-BC-zones filter keeps only projectiles having bcZones', () => {
    renderPicker(data);
    openFilters();
    fireEvent.click(screen.getByRole('button', { name: /avec zones bc uniquement/i }));
    expect(screen.getByText(/NSA Slug 25g/)).toBeInTheDocument();
    expect(screen.queryByText(/JSB Exact/)).not.toBeInTheDocument();
  });

  it('clear filters resets all chips', () => {
    renderPicker(data);
    openFilters();
    fireEvent.click(screen.getByRole('button', { name: /importés uniquement/i }));
    expect(screen.queryByText(/JSB Exact/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /réinitialiser les filtres/i }));
    expect(screen.getByText(/JSB Exact/)).toBeInTheDocument();
  });
});

describe('ProjectilePicker — selection & badges', () => {
  it('selecting a row calls onSelect with the projectile id and closes the dialog', () => {
    const onSelect = vi.fn();
    const data = [legacy({ id: 'p-1', brand: 'JSB', model: 'Exact' })];
    const { onOpenChange } = renderPicker(data, { onSelect });
    fireEvent.click(screen.getByRole('option', { name: /JSB Exact/ }));
    expect(onSelect).toHaveBeenCalledWith('p-1');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('legacy projectile renders without badges', () => {
    const data = [legacy({ id: 'p-1' })];
    renderPicker(data);
    const row = screen.getByRole('option', { name: /JSB Exact/ });
    expect(within(row).queryByText(/zones bc/i)).not.toBeInTheDocument();
    expect(within(row).queryByText(/importé/i)).not.toBeInTheDocument();
  });

  it('enriched projectile shows BC zones + Imported badges', () => {
    const data = [enriched()];
    renderPicker(data);
    const row = screen.getByRole('option', { name: /NSA Slug 25g/ });
    expect(within(row).getByText(/zones bc/i)).toBeInTheDocument();
    expect(within(row).getByText(/importé/i)).toBeInTheDocument();
  });

  it('shows caliberLabel when present, falls back to caliber otherwise', () => {
    const data = [
      legacy({ id: 'a', brand: 'JSB', model: 'L', caliber: '.22' }),
      enriched({ id: 'b', brand: 'NSA', model: 'E', caliber: '.22', caliberLabel: '.22 (5.5 mm)' }),
    ];
    renderPicker(data);
    expect(screen.getByText('.22 (5.5 mm)')).toBeInTheDocument();
  });

  it('manual entry option clears the selection', () => {
    const onSelect = vi.fn();
    const data = [legacy({ id: 'p-1' })];
    renderPicker(data, { onSelect, selectedId: 'p-1' });
    fireEvent.click(screen.getByRole('button', { name: /saisie manuelle/i }));
    expect(onSelect).toHaveBeenCalledWith('');
  });
});

describe('ProjectilePicker — sort', () => {
  const data = [
    legacy({ id: 'a', brand: 'Zeta', model: 'Z1', weight: 30, bc: 0.05, caliber: '.30' }),
    legacy({ id: 'b', brand: 'Alpha', model: 'A1', weight: 5, bc: 0.10, caliber: '.177' }),
    legacy({ id: 'c', brand: 'Mike', model: 'M1', weight: 18, bc: 0.07, caliber: '.22' }),
  ];

  function rowsInOrder() {
    return screen
      .getAllByRole('option')
      .filter(el => el.getAttribute('data-projectile-id') !== null)
      .map(el => el.getAttribute('data-projectile-id'));
  }

  it('sorts by brand alphabetically', () => {
    renderPicker(data);
    fireEvent.change(screen.getByLabelText(/tri/i), { target: { value: 'brand' } });
    expect(rowsInOrder()).toEqual(['b', 'c', 'a']);
  });

  it('sorts by weight ascending', () => {
    renderPicker(data);
    fireEvent.change(screen.getByLabelText(/tri/i), { target: { value: 'weight' } });
    expect(rowsInOrder()).toEqual(['b', 'c', 'a']);
  });

  it('sorts by BC descending', () => {
    renderPicker(data);
    fireEvent.change(screen.getByLabelText(/tri/i), { target: { value: 'bc' } });
    expect(rowsInOrder()).toEqual(['b', 'c', 'a']);
  });

  it('sorts by caliber numerically', () => {
    renderPicker(data);
    fireEvent.change(screen.getByLabelText(/tri/i), { target: { value: 'caliber' } });
    // .177 < .22 < .30 → b, c, a
    expect(rowsInOrder()).toEqual(['b', 'c', 'a']);
  });
});
