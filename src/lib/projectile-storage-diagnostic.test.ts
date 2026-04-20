/**
 * Tests du diagnostic projectile (lecture seule).
 *
 * On couvre :
 *  - cas nominal IDB disponible + migration effectuée
 *  - clé legacy encore présente (avant migration)
 *  - mode dégradé : pas d'IDB
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  LEGACY_LOCALSTORAGE_KEY,
  MIGRATION_FLAG_KEY,
  __resetProjectileRepoForTests,
  writeProjectilesToIdb,
} from './projectile-repo';
import { projectileStore } from './storage';
import { getProjectileStorageDiagnostic } from './projectile-storage-diagnostic';
import type { Projectile } from './types';

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

describe('projectile-storage-diagnostic', () => {
  beforeEach(async () => {
    await __resetProjectileRepoForTests();
    projectileStore.__resetForTests();
  });

  it('reports IDB available + migrated when flag is set and no legacy key', async () => {
    localStorage.setItem(MIGRATION_FLAG_KEY, '2024-05-01T00:00:00.000Z');
    await writeProjectilesToIdb([fakeProjectile(1), fakeProjectile(2)]);
    projectileStore.__hydrate([fakeProjectile(1), fakeProjectile(2)]);

    const diag = await getProjectileStorageDiagnostic();

    expect(diag.idb).toBe('available');
    expect(diag.migration).toBe('migrated');
    expect(diag.migrationFlagAt).toBe('2024-05-01T00:00:00.000Z');
    expect(diag.legacyKeyPresent).toBe('no');
    expect(diag.legacyKeyByteSize).toBeNull();
    expect(diag.inMemoryCount).toBe(2);
    expect(diag.persistedCount).toBe(2);
    expect(diag.degraded).toBe(false);
    expect(diag.keys.idb).toBe('pcp-projectiles-idb');
  });

  it('reports legacy key present and not-migrated when flag is missing', async () => {
    const legacyPayload = JSON.stringify([fakeProjectile(1)]);
    localStorage.setItem(LEGACY_LOCALSTORAGE_KEY, legacyPayload);

    const diag = await getProjectileStorageDiagnostic();

    expect(diag.legacyKeyPresent).toBe('yes');
    expect(diag.legacyKeyByteSize).toBe(legacyPayload.length);
    expect(diag.migration).toBe('not-migrated');
    expect(diag.migrationFlagAt).toBeNull();
    // IDB est dispo dans l'env de test (fake-indexeddb).
    expect(diag.idb).toBe('available');
    expect(diag.degraded).toBe(false);
  });

  it('reports degraded mode when IndexedDB read fails', async () => {
    // On force readProjectilesFromIdb à throw via un mock du module.
    const repo = await import('./projectile-repo');
    const spy = vi.spyOn(repo, 'readProjectilesFromIdb').mockRejectedValueOnce(new Error('IDB down'));

    const diag = await getProjectileStorageDiagnostic();

    expect(diag.idb).toBe('unavailable');
    expect(diag.persistedCount).toBeNull();
    expect(diag.degraded).toBe(true);

    spy.mockRestore();
  });

  it('exposes the storage keys for support diagnostics', async () => {
    const diag = await getProjectileStorageDiagnostic();
    expect(diag.keys).toEqual({
      idb: 'pcp-projectiles-idb',
      legacy: 'pcp-projectiles',
      migrationFlag: 'pcp-projectiles-idb-migrated-v1',
    });
  });
});
