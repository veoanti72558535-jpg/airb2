/**
 * Tranche IDB — Tests dédiés à la persistance projectile (IndexedDB)
 * et à la migration depuis localStorage.
 *
 * Couvre :
 *  1. read/write IDB
 *  2. migration one-shot non destructive depuis localStorage
 *  3. idempotence (re-bootstrap sans ré-importer)
 *  4. import massif (>quota localStorage) ne casse pas
 *  5. exportAllData reste cohérent (sanitisation préservée)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'idb-keyval';
import {
  IDB_PROJECTILES_KEY,
  LEGACY_LOCALSTORAGE_KEY,
  MIGRATION_FLAG_KEY,
  __resetProjectileRepoForTests,
  migrateProjectilesFromLocalStorageIfNeeded,
  readProjectilesFromIdb,
  writeProjectilesToIdb,
} from './projectile-repo';
import {
  bootstrapStorage,
  exportAllData,
  projectileStore,
} from './storage';
import type { Projectile } from './types';

function makeLegacyProjectile(i: number): Projectile {
  return {
    id: `legacy-${i}`,
    brand: 'JSB',
    model: `Hades-${i}`,
    weight: 18,
    bc: 0.025,
    bcModel: 'G1',
    caliber: '.22',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  } as Projectile;
}

beforeEach(async () => {
  localStorage.clear();
  await __resetProjectileRepoForTests();
  // Reset in-memory cache too — bootstrapStorage hydrates it.
  (projectileStore as unknown as { __resetForTests: () => void }).__resetForTests();
});

describe('projectile-repo — IDB read/write', () => {
  it('read returns [] when key is absent', async () => {
    expect(await readProjectilesFromIdb()).toEqual([]);
  });

  it('round-trips an array of projectiles through IDB', async () => {
    const items = [makeLegacyProjectile(1), makeLegacyProjectile(2)];
    await writeProjectilesToIdb(items);
    const back = await readProjectilesFromIdb();
    expect(back).toHaveLength(2);
    expect(back[0].model).toBe('Hades-1');
  });
});

describe('migrateProjectilesFromLocalStorageIfNeeded', () => {
  it('seeds IDB from localStorage on first run, then purges legacy key', async () => {
    const legacy = [makeLegacyProjectile(1), makeLegacyProjectile(2)];
    localStorage.setItem(LEGACY_LOCALSTORAGE_KEY, JSON.stringify(legacy));

    const result = await migrateProjectilesFromLocalStorageIfNeeded();

    expect(result).toHaveLength(2);
    // Legacy key purged → quota libéré
    expect(localStorage.getItem(LEGACY_LOCALSTORAGE_KEY)).toBeNull();
    // Drapeau de migration posé
    expect(localStorage.getItem(MIGRATION_FLAG_KEY)).not.toBeNull();
    // IDB peuplé
    expect(await get(IDB_PROJECTILES_KEY)).toHaveLength(2);
  });

  it('is idempotent — second call does not re-seed from a re-populated legacy key', async () => {
    localStorage.setItem(
      LEGACY_LOCALSTORAGE_KEY,
      JSON.stringify([makeLegacyProjectile(1)]),
    );
    await migrateProjectilesFromLocalStorageIfNeeded();

    // Quelqu'un repose un array legacy "fantôme" — la migration NE doit PAS
    // l'absorber (le flag est déjà posé).
    localStorage.setItem(
      LEGACY_LOCALSTORAGE_KEY,
      JSON.stringify([makeLegacyProjectile(99)]),
    );
    const result = await migrateProjectilesFromLocalStorageIfNeeded();

    expect(result).toHaveLength(1);
    expect(result[0].model).toBe('Hades-1');
  });

  it('does not destroy IDB content when both IDB and legacy contain data', async () => {
    // IDB seedé (simule une migration faite ailleurs)
    await writeProjectilesToIdb([makeLegacyProjectile(42)]);
    // Legacy contient AUSSI quelque chose
    localStorage.setItem(
      LEGACY_LOCALSTORAGE_KEY,
      JSON.stringify([makeLegacyProjectile(1)]),
    );

    const result = await migrateProjectilesFromLocalStorageIfNeeded();

    // IDB fait foi
    expect(result).toHaveLength(1);
    expect(result[0].model).toBe('Hades-42');
    // Legacy a quand même été purgé (flag posé)
    expect(localStorage.getItem(LEGACY_LOCALSTORAGE_KEY)).toBeNull();
  });

  it('handles corrupted legacy JSON without throwing', async () => {
    localStorage.setItem(LEGACY_LOCALSTORAGE_KEY, '{not json');
    const result = await migrateProjectilesFromLocalStorageIfNeeded();
    expect(result).toEqual([]);
    expect(localStorage.getItem(MIGRATION_FLAG_KEY)).not.toBeNull();
  });
});

describe('projectileStore — sync API backed by IDB cache', () => {
  it('hydrates cache from IDB at bootstrap', async () => {
    await writeProjectilesToIdb([makeLegacyProjectile(1)]);
    // Even without legacy migration, bootstrap should pick up IDB content.
    localStorage.setItem(MIGRATION_FLAG_KEY, '2024-01-01');

    await bootstrapStorage();

    expect(projectileStore.getAll()).toHaveLength(1);
    expect(projectileStore.getAll()[0].model).toBe('Hades-1');
  });

  it('writes through to IDB on create', async () => {
    await bootstrapStorage();
    projectileStore.create({
      brand: 'X', model: 'Y', weight: 10, bc: 0.02, caliber: '.22',
    } as Omit<Projectile, 'id' | 'createdAt' | 'updatedAt'>);
    // Let the microtask flush so write-through completes.
    await new Promise((r) => setTimeout(r, 0));
    const persisted = await readProjectilesFromIdb();
    expect(persisted).toHaveLength(1);
    expect(persisted[0].brand).toBe('X');
  });

  it('createMany handles a payload that would exceed the localStorage quota', async () => {
    await bootstrapStorage();
    // 5000 items ≈ ~1 MB sérialisé — bien au-dessus de ce qui crashait
    // l'ancien store (lié à la cohabitation avec airguns/optics/sessions).
    const big = Array.from({ length: 5000 }, (_, i) => ({
      brand: 'Mass', model: `m-${i}`, weight: 18, bc: 0.025, caliber: '.22',
    }));
    const created = projectileStore.createMany(
      big as Omit<Projectile, 'id' | 'createdAt' | 'updatedAt'>[],
    );
    expect(created).toHaveLength(5000);
    expect(projectileStore.getAll()).toHaveLength(5000);
    await new Promise((r) => setTimeout(r, 0));
    const persisted = await readProjectilesFromIdb();
    expect(persisted).toHaveLength(5000);
  });

  it('exportAllData stays coherent after IDB-backed writes', async () => {
    await bootstrapStorage();
    projectileStore.create({
      brand: 'JSB', model: 'Hades', weight: 18, bc: 0.025, bcModel: 'G7',
      caliber: '.22',
    } as Omit<Projectile, 'id' | 'createdAt' | 'updatedAt'>);
    const json = JSON.parse(exportAllData());
    expect(json.projectiles).toHaveLength(1);
    expect(json.projectiles[0].bcModel).toBe('G7');
  });
});