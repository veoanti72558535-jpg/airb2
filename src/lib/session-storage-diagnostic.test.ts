/**
 * Tests du diagnostic sessions (lecture seule).
 *
 * Mirror strict de `projectile-storage-diagnostic.test.ts`. Couvre :
 *  - cas nominal IDB disponible + migration effectuée
 *  - clé legacy encore présente (avant migration)
 *  - mode dégradé : pas d'IDB
 *  - exposition des constantes pour le support
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  LEGACY_SESSIONS_LOCALSTORAGE_KEY,
  SESSIONS_MIGRATION_FLAG_KEY,
  __resetSessionRepoForTests,
  writeSessionsToIdb,
} from './session-repo';
import { sessionStore } from './storage';
import { getSessionStorageDiagnostic } from './session-storage-diagnostic';
import type { Session } from './types';

function fakeSession(i: number): Session {
  return {
    id: `s-${i}`,
    name: `Session ${i}`,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    inputs: {} as Session['inputs'],
    results: [],
  } as Session;
}

describe('session-storage-diagnostic', () => {
  beforeEach(async () => {
    await __resetSessionRepoForTests();
    sessionStore.__resetForTests();
  });

  it('reports IDB available + migrated when flag is set and no legacy key', async () => {
    localStorage.setItem(SESSIONS_MIGRATION_FLAG_KEY, '2024-05-01T00:00:00.000Z');
    await writeSessionsToIdb([fakeSession(1), fakeSession(2)]);
    sessionStore.__hydrate([fakeSession(1), fakeSession(2)]);

    const diag = await getSessionStorageDiagnostic();

    expect(diag.idb).toBe('available');
    expect(diag.migration).toBe('migrated');
    expect(diag.migrationFlagAt).toBe('2024-05-01T00:00:00.000Z');
    expect(diag.legacyKeyPresent).toBe('no');
    expect(diag.legacyKeyByteSize).toBeNull();
    expect(diag.inMemoryCount).toBe(2);
    expect(diag.persistedCount).toBe(2);
    expect(diag.degraded).toBe(false);
    expect(diag.keys.idb).toBe('pcp-sessions-idb');
  });

  it('reports legacy key present and not-migrated when flag is missing', async () => {
    const legacyPayload = JSON.stringify([fakeSession(1)]);
    localStorage.setItem(LEGACY_SESSIONS_LOCALSTORAGE_KEY, legacyPayload);

    const diag = await getSessionStorageDiagnostic();

    expect(diag.legacyKeyPresent).toBe('yes');
    expect(diag.legacyKeyByteSize).toBe(legacyPayload.length);
    expect(diag.migration).toBe('not-migrated');
    expect(diag.migrationFlagAt).toBeNull();
    expect(diag.idb).toBe('available'); // fake-indexeddb in test env
    expect(diag.degraded).toBe(false);
  });

  it('reports degraded mode when IndexedDB read fails', async () => {
    const repo = await import('./session-repo');
    const spy = vi
      .spyOn(repo, 'readSessionsFromIdb')
      .mockRejectedValueOnce(new Error('IDB down'));

    const diag = await getSessionStorageDiagnostic();

    expect(diag.idb).toBe('unavailable');
    expect(diag.persistedCount).toBeNull();
    expect(diag.degraded).toBe(true);

    spy.mockRestore();
  });

  it('exposes the storage keys for support diagnostics', async () => {
    const diag = await getSessionStorageDiagnostic();
    expect(diag.keys).toEqual({
      idb: 'pcp-sessions-idb',
      legacy: 'pcp-sessions',
      migrationFlag: 'pcp-sessions-idb-migrated-v1',
    });
  });
});