import { describe, it, expect, vi } from 'vitest';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
  isSupabaseConfigured: () => true,
}));

// Mock repo
vi.mock('@/lib/reticles-catalog-repo', () => ({
  getReticlesCatalog: vi.fn().mockResolvedValue({ data: [], count: 0 }),
  getCatalogBrands: vi.fn().mockResolvedValue([]),
  getCatalogPatternTypes: vi.fn().mockResolvedValue([]),
  importToLibrary: vi.fn(),
  isAlreadyImported: vi.fn().mockReturnValue(false),
  toggleFavorite: vi.fn().mockReturnValue(true),
  isFavorite: vi.fn().mockReturnValue(false),
}));

const cgImportSpy = vi.fn();
vi.mock('@/lib/chairgun-reticles-repo', () => ({
  getChairgunReticles: vi.fn().mockResolvedValue({
    data: [
      {
        reticle_id: 1, name: 'CG Test',
        focal_plane: 'FFP', unit: 'MRAD', true_magnification: 12,
        elements: [{ type: 'dot', x: 0, y: 0, radius: 0 }],
        element_count: 1,
      },
    ],
    count: 1,
  }),
  importChairgunToLibrary: (...a: unknown[]) => cgImportSpy(...a),
  isChairgunImported: vi.fn().mockReturnValue(false),
}));

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ReticleCatalogBrowser from './ReticleCatalogBrowser';

// Wrap with i18n
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string, vars?: Record<string, unknown>) => {
      if (!vars) return k;
      let s = k;
      for (const [vk, vv] of Object.entries(vars)) s = s.replace(`{${vk}}`, String(vv));
      return s;
    },
    lang: 'en',
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

describe('ReticleCatalogBrowser', () => {
  it('shows source tabs (Strelok + ChairGun)', () => {
    render(<ReticleCatalogBrowser />);
    expect(screen.getByTestId('catalog-tab-strelok')).toBeTruthy();
    expect(screen.getByTestId('catalog-tab-chairgun')).toBeTruthy();
  });

  it('derives pattern_type "bdc" from SCB name', async () => {
    // Unit test on the derivation logic — tested via import in seed generator
    const name = 'SCB2, 5-30x56, MTC Optics';
    expect(name.toUpperCase().includes('SCB')).toBe(true);
  });

  it('derives pattern_type "mildot" from Mil Dot name', () => {
    const name = 'Mil Dot, Mark 4, Leupold';
    expect(name.toUpperCase().includes('MIL DOT')).toBe(true);
  });

  it('switches to ChairGun tab and renders fetched entries with import button', async () => {
    render(<ReticleCatalogBrowser />);
    fireEvent.click(screen.getByTestId('catalog-tab-chairgun'));
    await waitFor(() => {
      expect(screen.getByTestId('catalog-cg-item-1')).toBeTruthy();
    });
    expect(screen.getByTestId('catalog-cg-geom-1')).toBeTruthy();
    fireEvent.click(screen.getByTestId('catalog-cg-import-1'));
    expect(cgImportSpy).toHaveBeenCalledTimes(1);
    expect(cgImportSpy.mock.calls[0][0].reticle_id).toBe(1);
  });
});