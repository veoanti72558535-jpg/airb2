import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'idb-keyval';
import {
  IDB_SESSIONS_KEY,
  LEGACY_SESSIONS_LOCALSTORAGE_KEY,
  SESSIONS_MIGRATION_FLAG_KEY,
  __resetSessionRepoForTests,
  migrateSessionsFromLocalStorageIfNeeded,
  readSessionsFromIdb,
  writeSessionsToIdb,
} from './session-repo';
import type { Session } from './types';

function fakeSession(id: string): Session {
  return {
    id,
    name: `Session ${id}`,
    input: {
      muzzleVelocity: 280,
      bc: 0.025,
      projectileWeight: 18,
      sightHeight: 50,
      zeroRange: 30,
      maxRange: 50,
      rangeStep: 10,
      weather: {
        temperature: 15, humidity: 50, pressure: 1013, altitude: 0,
        windSpeed: 0, windAngle: 0, source: 'manual', timestamp: '',
      },
    },
    results: [
      {
        range: 30,
        drop: 0,
        holdover: 0,
        holdoverMRAD: 0,
        velocity: 270,
        energy: 18,
        tof: 0.11,
        windDrift: 0,
        windDriftMOA: 0,
        windDriftMRAD: 0,
      },
    ],
    tags: ['hunt', 'pcp'],
    favorite: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
    derivedFromSessionId: id === 'child' ? 'parent' : undefined,
    engineVersion: 1,
    calculatedAt: '2026-01-01T00:00:00Z',
    calculatedAtSource: 'frozen',
  } as Session;
}

describe('session-repo — IDB persistence', () => {
  beforeEach(async () => {
    await __resetSessionRepoForTests();
  });

  it('readSessionsFromIdb returns [] when nothing has been written', async () => {
    const items = await readSessionsFromIdb();
    expect(items).toEqual([]);
  });

  it('writes and reads back complex session objects intact', async () => {
    const a = fakeSession('a');
    const b = fakeSession('child');
    await writeSessionsToIdb([a, b]);

    const back = await readSessionsFromIdb();
    expect(back).toHaveLength(2);
    // Round-trip preserves results, tags, favorite, parentId, metadata.
    expect(back[0]).toEqual(a);
    expect(back[1]).toEqual(b);
    expect(back[1].derivedFromSessionId).toBe('parent');
    expect(back[0].results[0].velocity).toBe(270);
  });
});

describe('session-repo — migration from localStorage', () => {
  beforeEach(async () => {
    await __resetSessionRepoForTests();
  });

  it('no-op when neither legacy key nor IDB content exists', async () => {
    const items = await migrateSessionsFromLocalStorageIfNeeded();
    expect(items).toEqual([]);
    expect(localStorage.getItem(SESSIONS_MIGRATION_FLAG_KEY)).not.toBeNull();
  });

  it('migrates legacy localStorage sessions into IDB and purges the legacy key', async () => {
    const legacy = [fakeSession('a'), fakeSession('b')];
    localStorage.setItem(LEGACY_SESSIONS_LOCALSTORAGE_KEY, JSON.stringify(legacy));

    const items = await migrateSessionsFromLocalStorageIfNeeded();
    expect(items).toHaveLength(2);

    // Legacy key purged.
    expect(localStorage.getItem(LEGACY_SESSIONS_LOCALSTORAGE_KEY)).toBeNull();
    // Migration flag set.
    expect(localStorage.getItem(SESSIONS_MIGRATION_FLAG_KEY)).not.toBeNull();
    // Data lives in IDB.
    const persisted = await get(IDB_SESSIONS_KEY);
    expect(Array.isArray(persisted)).toBe(true);
    expect((persisted as Session[]).map((s) => s.id)).toEqual(['a', 'b']);
  });

  it('is idempotent — second call does not duplicate or wipe IDB', async () => {
    localStorage.setItem(
      LEGACY_SESSIONS_LOCALSTORAGE_KEY,
      JSON.stringify([fakeSession('a')]),
    );
    const first = await migrateSessionsFromLocalStorageIfNeeded();
    expect(first).toHaveLength(1);

    // Re-seeding legacy AFTER first migration must NOT pollute IDB.
    localStorage.setItem(
      LEGACY_SESSIONS_LOCALSTORAGE_KEY,
      JSON.stringify([fakeSession('z'), fakeSession('y')]),
    );
    const second = await migrateSessionsFromLocalStorageIfNeeded();
    expect(second).toHaveLength(1);
    expect(second[0].id).toBe('a');
  });

  it('IDB content takes precedence over legacy when both exist', async () => {
    await writeSessionsToIdb([fakeSession('idb')]);
    localStorage.setItem(
      LEGACY_SESSIONS_LOCALSTORAGE_KEY,
      JSON.stringify([fakeSession('legacy')]),
    );

    const items = await migrateSessionsFromLocalStorageIfNeeded();
    expect(items.map((s) => s.id)).toEqual(['idb']);
  });

  it('handles corrupted legacy JSON gracefully (no throw, marks flag)', async () => {
    localStorage.setItem(LEGACY_SESSIONS_LOCALSTORAGE_KEY, '{not json');
    const items = await migrateSessionsFromLocalStorageIfNeeded();
    expect(items).toEqual([]);
    expect(localStorage.getItem(SESSIONS_MIGRATION_FLAG_KEY)).not.toBeNull();
  });
});

describe('session-repo — bootstrap → store hydration contract', () => {
  beforeEach(async () => {
    await __resetSessionRepoForTests();
  });

  it('bootstrapStorage hydrates sessionStore from IDB after migration', async () => {
    const { bootstrapStorage, sessionStore } = await import('./storage');
    localStorage.setItem(
      LEGACY_SESSIONS_LOCALSTORAGE_KEY,
      JSON.stringify([fakeSession('a'), fakeSession('b')]),
    );

    sessionStore.__resetForTests();
    await bootstrapStorage();

    const all = sessionStore.getAll();
    expect(all).toHaveLength(2);
    expect(all.map((s) => s.id).sort()).toEqual(['a', 'b']);
    // Legacy key purged after migration.
    expect(localStorage.getItem(LEGACY_SESSIONS_LOCALSTORAGE_KEY)).toBeNull();
  });

  it('writes after bootstrap are persisted to IDB (write-through)', async () => {
    const { bootstrapStorage, sessionStore, flushSessionPersistence } = await import('./storage');
    sessionStore.__resetForTests();
    await bootstrapStorage();

    sessionStore.create({
      name: 'New session',
      input: fakeSession('a').input,
      results: [],
      tags: [],
      favorite: false,
    } as Omit<Session, 'id' | 'createdAt' | 'updatedAt'>);

    await flushSessionPersistence();
    const persisted = (await get(IDB_SESSIONS_KEY)) as Session[];
    expect(persisted).toHaveLength(1);
    expect(persisted[0].name).toBe('New session');
  });
});