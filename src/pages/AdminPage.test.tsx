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

beforeEach(() => localStorage.clear());

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
      expect(screen.getByText(/Importer des projectiles|Import projectiles/)).toBeTruthy();
    });
  });

  it('opens the modal with the reticle title when reticle import is clicked', async () => {
    renderPage();
    fireEvent.click(screen.getByTestId('admin-import-reticles'));
    await waitFor(() => {
      expect(screen.getByText(/Importer des réticules|Import reticles/)).toBeTruthy();
    });
  });

  it('opens the modal with the optic title when optic import is clicked', async () => {
    renderPage();
    fireEvent.click(screen.getByTestId('admin-import-optics'));
    await waitFor(() => {
      expect(screen.getByText(/Importer des optiques|Import optics/)).toBeTruthy();
    });
  });
});
