import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@/lib/i18n';
import { ProjectileStorageDiagnosticCard } from './ProjectileStorageDiagnosticCard';
import {
  __resetProjectileRepoForTests,
  LEGACY_LOCALSTORAGE_KEY,
  MIGRATION_FLAG_KEY,
  writeProjectilesToIdb,
} from '@/lib/projectile-repo';
import { projectileStore } from '@/lib/storage';
import type { Projectile } from '@/lib/types';

function fakeProjectile(i: number): Projectile {
  return {
    id: `p-${i}`,
    brand: 'JSB',
    model: `M-${i}`,
    weight: 18,
    bc: 0.025,
    bcModel: 'G1',
    caliber: '.22',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  } as Projectile;
}

const renderCard = () =>
  render(
    <I18nProvider>
      <ProjectileStorageDiagnosticCard />
    </I18nProvider>,
  );

describe('ProjectileStorageDiagnosticCard', () => {
  beforeEach(async () => {
    await __resetProjectileRepoForTests();
    projectileStore.__resetForTests();
  });

  it('renders the healthy nominal case (IDB available, migrated, no legacy)', async () => {
    localStorage.setItem(MIGRATION_FLAG_KEY, '2024-05-01T00:00:00.000Z');
    await writeProjectilesToIdb([fakeProjectile(1), fakeProjectile(2), fakeProjectile(3)]);
    projectileStore.__hydrate([fakeProjectile(1), fakeProjectile(2), fakeProjectile(3)]);

    renderCard();

    await waitFor(() => {
      expect(screen.getByTestId('diag-backend')).toBeInTheDocument();
    });
    expect(screen.getByTestId('diag-backend').textContent).toMatch(/IndexedDB/i);
    expect(screen.getByTestId('diag-migration').textContent?.toLowerCase()).toMatch(/oui|yes/);
    expect(screen.getByTestId('diag-legacy').textContent?.toLowerCase()).toMatch(/non|no/);
    expect(screen.getByTestId('diag-count').textContent).toBe('3');
    expect(screen.queryByTestId('diag-degraded')).not.toBeInTheDocument();
  });

  it('flags legacy key presence when migration has not run yet', async () => {
    localStorage.setItem(LEGACY_LOCALSTORAGE_KEY, JSON.stringify([fakeProjectile(1)]));

    renderCard();

    await waitFor(() => {
      expect(screen.getByTestId('diag-legacy')).toBeInTheDocument();
    });
    expect(screen.getByTestId('diag-legacy').textContent?.toLowerCase()).toMatch(/oui|yes/);
    expect(screen.getByTestId('diag-migration').textContent?.toLowerCase()).toMatch(
      /pending|attente|à faire|en attente/i,
    );
  });

  it('shows degraded mode when IDB read fails', async () => {
    const repo = await import('@/lib/projectile-repo');
    const spy = vi.spyOn(repo, 'readProjectilesFromIdb').mockRejectedValueOnce(new Error('IDB down'));

    renderCard();

    await waitFor(() => {
      expect(screen.getByTestId('diag-degraded')).toBeInTheDocument();
    });
    expect(screen.getByTestId('diag-backend').textContent?.toLowerCase()).toMatch(
      /degraded|dégradé/i,
    );

    spy.mockRestore();
  });

  it('re-reads the diagnostic when refreshKey changes (no polling)', async () => {
    // État initial : 1 projectile en cache + IDB.
    localStorage.setItem(MIGRATION_FLAG_KEY, '2024-05-01T00:00:00.000Z');
    await writeProjectilesToIdb([fakeProjectile(1)]);
    projectileStore.__hydrate([fakeProjectile(1)]);

    const { rerender } = render(
      <I18nProvider>
        <ProjectileStorageDiagnosticCard refreshKey={0} />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('diag-count').textContent).toBe('1');
    });

    // Simule un import projectile : on grossit le cache + IDB, puis le
    // parent bump refreshKey (ex. depuis ImportJsonModal.onSuccess).
    const next = [fakeProjectile(1), fakeProjectile(2), fakeProjectile(3)];
    await writeProjectilesToIdb(next);
    projectileStore.__hydrate(next);

    rerender(
      <I18nProvider>
        <ProjectileStorageDiagnosticCard refreshKey={1} />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('diag-count').textContent).toBe('3');
    });
    // L'indicateur "refreshing" est transitoire, donc on ne peut pas
    // garantir sa visibilité dans le test, mais le diagnostic doit
    // refléter le nouvel état SANS rechargement de page.
    expect(screen.getByTestId('diag-backend').textContent).toMatch(/IndexedDB/i);
  });
});
