/**
 * Sprint 2 hub Réglages — AdminPage est désormais un redirect vers
 * /settings?tab=data. Les responsabilités historiques (imports, lien IA)
 * sont testées ci-dessous via le hub Réglages directement, pour préserver
 * la couverture de la tranche F.3.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { I18nProvider } from '@/lib/i18n';
import AdminPage from './AdminPage';
import SettingsPage from './SettingsPage';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/integrations/supabase/client', () => ({
  isSupabaseConfigured: vi.fn(() => false),
  supabase: null,
}));

beforeEach(() => localStorage.clear());

import { isSupabaseConfigured } from '@/integrations/supabase/client';

function renderRouter(initialPath: string) {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </MemoryRouter>
    </I18nProvider>,
  );
}

describe('AdminPage — legacy redirect (Sprint 2)', () => {
  it('redirects /admin to the Settings hub on the Data tab', async () => {
    renderRouter('/admin');
    // After redirect, the SettingsPage renders with the Data tab active —
    // import buttons from the DataPanel should be visible.
    await waitFor(() => {
      expect(screen.getByTestId('settings-import-projectiles')).toBeTruthy();
    });
  });
});

describe('Settings hub — Data panel import actions', () => {
  it('exposes the three import actions', () => {
    renderRouter('/settings?tab=data');
    expect(screen.getByTestId('settings-import-projectiles')).toBeTruthy();
    expect(screen.getByTestId('settings-import-optics')).toBeTruthy();
    expect(screen.getByTestId('settings-import-reticles')).toBeTruthy();
  });

  it('opens the modal with the projectile title when projectile import is clicked', async () => {
    renderRouter('/settings?tab=data');
    fireEvent.click(screen.getByTestId('settings-import-projectiles'));
    await waitFor(() => {
      expect(
        screen.getAllByText(/Importer des projectiles|Import projectiles/).length,
      ).toBeGreaterThanOrEqual(2);
    });
  });

  it('opens the modal with the reticle title when reticle import is clicked', async () => {
    renderRouter('/settings?tab=data');
    fireEvent.click(screen.getByTestId('settings-import-reticles'));
    await waitFor(() => {
      expect(
        screen.getAllByText(/Importer des réticules|Import reticles/).length,
      ).toBeGreaterThanOrEqual(2);
    });
  });

  it('opens the modal with the optic title when optic import is clicked', async () => {
    renderRouter('/settings?tab=data');
    fireEvent.click(screen.getByTestId('settings-import-optics'));
    await waitFor(() => {
      expect(
        screen.getAllByText(/Importer des optiques|Import optics/).length,
      ).toBeGreaterThanOrEqual(2);
    });
  });
});

describe('Settings hub — AI tab', () => {
  it('hides the AI console link when Supabase is not configured', () => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(false);
    renderRouter('/settings?tab=ai');
    expect(screen.queryByTestId('settings-open-ai-console')).toBeNull();
  });

  it('shows the AI console link when Supabase is configured', () => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(true);
    renderRouter('/settings?tab=ai');
    expect(screen.getByTestId('settings-open-ai-console')).toBeTruthy();
  });
});
