/**
 * Tranche F.5 — Tests du helper `resolveSessionImportedFrom`.
 *
 * On manipule les vrais stores (localStorage via createCRUD) pour vérifier
 * la résolution réelle, le silence sur entités absentes, et la robustesse
 * legacy (session sans projectileId/opticId).
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  resolveSessionImportedFrom,
  hasAnyImportedFrom,
  importSourceLabelKey,
} from './imported-from';
import { projectileStore, opticStore } from './storage';
import type { Session } from './types';

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 'sess-1',
    name: 'S',
    input: {
      muzzleVelocity: 280, bc: 0.025, projectileWeight: 18,
      sightHeight: 50, zeroRange: 30, maxRange: 50, rangeStep: 10,
      weather: {
        temperature: 15, humidity: 50, pressure: 1013, altitude: 0,
        windSpeed: 0, windAngle: 0, source: 'manual', timestamp: '',
      },
    },
    results: [],
    tags: [],
    favorite: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    profileId: 'legacy',
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe('resolveSessionImportedFrom', () => {
  it('returns empty for a legacy session with no entity links', () => {
    const info = resolveSessionImportedFrom(makeSession());
    expect(info).toEqual({});
    expect(hasAnyImportedFrom(info)).toBe(false);
  });

  it('returns empty when projectileId points to a missing projectile', () => {
    const info = resolveSessionImportedFrom(
      makeSession({ projectileId: 'does-not-exist' }),
    );
    expect(info).toEqual({});
  });

  it('returns the projectile importedFrom when present', () => {
    const p = projectileStore.create({
      brand: 'JSB',
      model: 'Hades',
      weight: 16.2,
      bc: 0.025,
      caliber: '.22',
      bcModel: 'G1',
      importedFrom: 'strelok',
    });
    const info = resolveSessionImportedFrom(
      makeSession({ projectileId: p.id }),
    );
    expect(info.projectile).toBe('strelok');
    expect(info.optic).toBeUndefined();
    expect(hasAnyImportedFrom(info)).toBe(true);
  });

  it('returns the optic importedFrom when present', () => {
    const o = opticStore.create({
      name: 'Athlon Helos',
      clickUnit: 'MRAD',
      clickValue: 0.1,
      importedFrom: 'json-user',
    });
    const info = resolveSessionImportedFrom(
      makeSession({ opticId: o.id }),
    );
    expect(info.optic).toBe('json-user');
    expect(info.projectile).toBeUndefined();
  });

  it('returns both when projectile + optic are imported', () => {
    const p = projectileStore.create({
      brand: 'JSB', model: 'Hades', weight: 16.2, bc: 0.025, caliber: '.22',
      importedFrom: 'chairgun',
    });
    const o = opticStore.create({
      name: 'Element Helix', clickUnit: 'MRAD', clickValue: 0.1,
      importedFrom: 'airballistik',
    });
    const info = resolveSessionImportedFrom(
      makeSession({ projectileId: p.id, opticId: o.id }),
    );
    expect(info.projectile).toBe('chairgun');
    expect(info.optic).toBe('airballistik');
  });

  it('omits importedFrom when entity exists but has no marker', () => {
    const p = projectileStore.create({
      brand: 'JSB', model: 'Exact', weight: 8.44, bc: 0.022, caliber: '.177',
    });
    const info = resolveSessionImportedFrom(
      makeSession({ projectileId: p.id }),
    );
    expect(info.projectile).toBeUndefined();
    expect(hasAnyImportedFrom(info)).toBe(false);
  });
});

describe('importSourceLabelKey', () => {
  it('maps every ImportSource to a translation key', () => {
    expect(importSourceLabelKey('json-user')).toBe('import.source.jsonUser');
    expect(importSourceLabelKey('preset-internal')).toBe('import.source.presetInternal');
    expect(importSourceLabelKey('strelok')).toBe('import.source.strelok');
    expect(importSourceLabelKey('chairgun')).toBe('import.source.chairgun');
    expect(importSourceLabelKey('airballistik')).toBe('import.source.airballistik');
  });
});
