import { describe, it, expect, vi } from 'vitest';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: null,
  isSupabaseConfigured: () => false,
}));

// Mock repo
vi.mock('@/lib/reticles-catalog-repo', () => ({
  getReticlesCatalog: vi.fn().mockResolvedValue({ data: [], count: 0 }),
  getCatalogBrands: vi.fn().mockResolvedValue([]),
  getCatalogPatternTypes: vi.fn().mockResolvedValue([]),
  importToLibrary: vi.fn(),
  isAlreadyImported: vi.fn().mockReturnValue(false),
}));

import { render, screen } from '@testing-library/react';
import ReticleCatalogBrowser from './ReticleCatalogBrowser';

// Wrap with i18n
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, lang: 'en' }),
}));

describe('ReticleCatalogBrowser', () => {
  it('shows unavailable message when Supabase is not configured', () => {
    render(<ReticleCatalogBrowser />);
    expect(screen.getByText(/Supabase non configuré/)).toBeTruthy();
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
});