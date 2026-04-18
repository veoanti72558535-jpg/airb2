/**
 * Tranche D — `exportAllData` boundary tests.
 *
 * Verifies that the user-facing "Export JSON" button (Admin page) never
 * leaks an internal MERO drag law in any of its three vectors:
 *  1. `projectiles[].bcModel`
 *  2. `sessions[].dragLawEffective` / `dragLawRequested`
 *  3. `sessions[].input.dragModel`
 *
 * Also checks that public laws round-trip untouched and that
 * customDragTable / non-drag-law metadata are preserved.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { exportAllData, projectileStore, sessionStore } from './storage';
import type { DragModel, Projectile, Session } from './types';
import { INTERNAL_DRAG_LAWS } from './drag-law-policy';

beforeEach(() => {
  // localStorage is reset per test by jsdom — but be explicit.
  localStorage.clear();
});

function seedProjectile(bcModel: DragModel | undefined): Projectile {
  return projectileStore.create({
    brand: 'JSB',
    model: `Test-${bcModel ?? 'none'}`,
    weight: 18,
    bc: 0.025,
    bcModel,
    caliber: '.22',
  } as Omit<Projectile, 'id' | 'createdAt' | 'updatedAt'>);
}

function seedSession(overrides: Partial<Session>): Session {
  return sessionStore.create({
    name: 'Test',
    input: {
      muzzleVelocity: 280,
      bc: 0.025,
      projectileWeight: 18,
      sightHeight: 50,
      zeroRange: 30,
      maxRange: 100,
      rangeStep: 5,
      weather: {
        temperature: 15, humidity: 50, pressure: 1013, altitude: 0,
        windSpeed: 0, windAngle: 0, source: 'manual', timestamp: '',
      },
      dragModel: 'G1',
    },
    results: [],
    tags: [],
    favorite: false,
    ...overrides,
  } as Omit<Session, 'id' | 'createdAt' | 'updatedAt'>);
}

describe('exportAllData — public boundary', () => {
  it.each(INTERNAL_DRAG_LAWS)(
    'rewrites projectile.bcModel %s → G1 in the exported JSON',
    (law) => {
      seedProjectile(law);
      const json = JSON.parse(exportAllData());
      const exported = json.projectiles[0];
      expect(exported.bcModel).toBe('G1');
      // Original is preserved in the underlying store (export is non-mutating).
      expect(projectileStore.getAll()[0].bcModel).toBe(law);
    },
  );

  it('preserves public projectile.bcModel values verbatim', () => {
    seedProjectile('G7');
    const json = JSON.parse(exportAllData());
    expect(json.projectiles[0].bcModel).toBe('G7');
  });

  it('preserves customDragTable on a projectile that needed bcModel sanitisation', () => {
    projectileStore.create({
      brand: 'X', model: 'slug', weight: 30, bc: 0.04, bcModel: 'SLG1',
      caliber: '.30',
      customDragTable: [{ mach: 0.5, cd: 0.3 }, { mach: 1.0, cd: 0.5 }],
    } as Omit<Projectile, 'id' | 'createdAt' | 'updatedAt'>);
    const json = JSON.parse(exportAllData());
    expect(json.projectiles[0].bcModel).toBe('G1');
    expect(json.projectiles[0].customDragTable).toEqual([
      { mach: 0.5, cd: 0.3 },
      { mach: 1.0, cd: 0.5 },
    ]);
  });

  it.each(INTERNAL_DRAG_LAWS)(
    'rewrites session.dragLawEffective %s → G1 in the exported JSON',
    (law) => {
      seedSession({ dragLawEffective: law });
      const json = JSON.parse(exportAllData());
      expect(json.sessions[0].dragLawEffective).toBe('G1');
    },
  );

  it.each(INTERNAL_DRAG_LAWS)(
    'rewrites session.input.dragModel %s → G1 in the exported JSON',
    (law) => {
      const s = seedSession({});
      // Mutate after creation to bypass type-check inside store.create
      s.input.dragModel = law;
      sessionStore.update(s.id, { input: s.input });
      const json = JSON.parse(exportAllData());
      expect(json.sessions[0].input.dragModel).toBe('G1');
    },
  );

  it('preserves a public session unchanged across the export boundary', () => {
    seedSession({
      profileId: 'legacy',
      dragLawEffective: 'G7',
      dragLawRequested: 'G7',
      input: {
        ...seedSession({}).input,
        dragModel: 'G7',
      },
    });
    const json = JSON.parse(exportAllData());
    const s = json.sessions[json.sessions.length - 1];
    expect(s.dragLawEffective).toBe('G7');
    expect(s.dragLawRequested).toBe('G7');
    expect(s.input.dragModel).toBe('G7');
    expect(s.profileId).toBe('legacy');
  });

  it('exposes ZERO internal MERO laws across the entire payload (full scan)', () => {
    INTERNAL_DRAG_LAWS.forEach(law => {
      seedProjectile(law);
      const s = seedSession({ dragLawEffective: law, dragLawRequested: law });
      s.input.dragModel = law;
      sessionStore.update(s.id, { input: s.input });
    });
    const raw = exportAllData();
    INTERNAL_DRAG_LAWS.forEach(law => {
      expect(raw, `leaked ${law} in export JSON`).not.toMatch(new RegExp(`"${law}"`));
    });
  });
});
