/**
 * Tranche F.3 — Tests AdminPage : présence des 3 actions d'import + ouverture
 * du modal avec le bon entityType.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nProvider } from '@/lib/i18n';
import AdminPage from './AdminPage';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/integrations/supabase/client', () => ({
  isSupabaseConfigured: vi.fn(() => false),
  supabase: null,
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

beforeEach(() => localStorage.clear());

import { isSupabaseConfigured } from '@/integrations/supabase/client';

function renderPage() {
  render(
    <I18nProvider>
      <AdminPage />
    </I18nProvider>,
  );
}

describe('AdminPage — Tranche F.3 import actions', () => {
  it('exposes the three import actions', () => {
    renderPage();
    expect(screen.getByTestId('admin-import-projectiles')).toBeTruthy();
    expect(screen.getByTestId('admin-import-optics')).toBeTruthy();
    expect(screen.getByTestId('admin-import-reticles')).toBeTruthy();
  });

  it('opens the modal with the projectile title when projectile import is clicked', async () => {
    renderPage();
    fireEvent.click(screen.getByTestId('admin-import-projectiles'));
    await waitFor(() => {
      // Modal title + button text both match the locale label.
      expect(
        screen.getAllByText(/Importer des projectiles|Import projectiles/).length,
      ).toBeGreaterThanOrEqual(2);
    });
  });

  it('opens the modal with the reticle title when reticle import is clicked', async () => {
    renderPage();
    fireEvent.click(screen.getByTestId('admin-import-reticles'));
    await waitFor(() => {
      expect(
        screen.getAllByText(/Importer des réticules|Import reticles/).length,
      ).toBeGreaterThanOrEqual(2);
    });
  });

  it('opens the modal with the optic title when optic import is clicked', async () => {
    renderPage();
    fireEvent.click(screen.getByTestId('admin-import-optics'));
    await waitFor(() => {
      expect(
        screen.getAllByText(/Importer des optiques|Import optics/).length,
      ).toBeGreaterThanOrEqual(2);
    });
  });
});

describe('AdminPage — /admin/ai link', () => {
  it('shows disabled AI card when Supabase is not configured', () => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(false);
    renderPage();
    expect(screen.queryByTestId('admin-link-ai')).toBeNull();
  });

  it('shows AI link button when Supabase is configured', () => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(true);
    renderPage();
    const btn = screen.getByTestId('admin-link-ai');
    expect(btn).toBeTruthy();
    fireEvent.click(btn);
    expect(mockNavigate).toHaveBeenCalledWith('/admin/ai');
  });
});
