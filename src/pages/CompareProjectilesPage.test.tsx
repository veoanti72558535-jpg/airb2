import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { I18nProvider } from '@/lib/i18n';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '@/lib/auth-context';

// Mock storage
vi.mock('@/lib/storage', async (importOriginal) => {
  const orig: any = await importOriginal();
  return {
    ...orig,
    projectileStore: {
      getAll: () => [
        { id: 'p1', brand: 'JSB', model: 'Exact', weight: 18, bc: 0.025, caliber: '.22', createdAt: '', updatedAt: '' },
        { id: 'p2', brand: 'FX', model: 'Hybrid', weight: 22, bc: 0.035, caliber: '.22', createdAt: '', updatedAt: '' },
        { id: 'p3', brand: 'H&N', model: 'Baracuda', weight: 21, bc: 0.030, caliber: '.22', createdAt: '', updatedAt: '' },
      ],
    },
  };
});

// Lazy import so mock is in place
const { default: CompareProjectilesPage } = await import('./CompareProjectilesPage');

const wrap = (ui: React.ReactElement) =>
  render(
    <MemoryRouter>
      <I18nProvider>
        <AuthProvider>{ui}</AuthProvider>
      </I18nProvider>
    </MemoryRouter>
  );

describe('CompareProjectilesPage', () => {
  it('renders without error', () => {
    wrap(<CompareProjectilesPage />);
    expect(screen.getByText(/Comparaison projectiles|Projectile comparison/i)).toBeInTheDocument();
  });

  it('compare button is disabled with < 2 selected', () => {
    wrap(<CompareProjectilesPage />);
    const btn = screen.getByTestId('compare-btn');
    expect(btn).toBeDisabled();
  });
});