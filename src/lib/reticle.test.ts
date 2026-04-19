/**
 * Tranche F.1 — Tests data-model du store réticules + helpers reticle.ts.
 * Aucun test UI : F.1 est strictement modèle/persistance.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { reticleStore, projectileStore, opticStore } from './storage';
import type { Reticle } from './types';
import {
  RETICLE_UNITS,
  RETICLE_TYPES,
  isReticleUnit,
  isReticleType,
  isPlausibleReticleShape,
} from './reticle';

beforeEach(() => {
  localStorage.clear();
});

type NewReticle = Omit<Reticle, 'id' | 'createdAt' | 'updatedAt'>;

const baseReticle: NewReticle = {
  brand: 'Vortex',
  model: 'EBR-7C',
  type: 'mrad-grid',
  unit: 'MRAD',
  subtension: 1,
  focalPlane: 'FFP',
};

describe('reticleStore — Tranche F.1', () => {
  it('exists and starts empty', () => {
    expect(reticleStore).toBeDefined();
    expect(reticleStore.getAll()).toEqual([]);
  });

  it('create / getById / getAll roundtrip', () => {
    const created = reticleStore.create(baseReticle);
    expect(created.id).toMatch(/.+/);
    expect(created.createdAt).toMatch(/T/);
    expect(created.updatedAt).toBe(created.createdAt);
    expect(reticleStore.getAll()).toHaveLength(1);
    expect(reticleStore.getById(created.id)).toEqual(created);
  });

  it('update mutates fields and bumps updatedAt', async () => {
    const r = reticleStore.create(baseReticle);
    await new Promise(res => setTimeout(res, 5));
    const updated = reticleStore.update(r.id, { notes: 'tested at 100m' });
    expect(updated?.notes).toBe('tested at 100m');
    expect(updated?.updatedAt).not.toBe(r.updatedAt);
    expect(updated?.createdAt).toBe(r.createdAt);
  });

  it('delete removes the record', () => {
    const r = reticleStore.create(baseReticle);
    expect(reticleStore.delete(r.id)).toBe(true);
    expect(reticleStore.getAll()).toHaveLength(0);
    expect(reticleStore.delete(r.id)).toBe(false);
  });

  it('persists across re-reads via localStorage', () => {
    const r = reticleStore.create(baseReticle);
    // simulate fresh load — store reads from localStorage every call
    const reloaded = reticleStore.getById(r.id);
    expect(reloaded).toEqual(r);
  });

  it('accepts importedFrom marker without breaking the type', () => {
    const r = reticleStore.create({ ...baseReticle, importedFrom: 'strelok' });
    expect(r.importedFrom).toBe('strelok');
  });

  it('does not collide with other stores in localStorage', () => {
    reticleStore.create(baseReticle);
    expect(projectileStore.getAll()).toEqual([]);
    expect(opticStore.getAll()).toEqual([]);
  });
});

describe('reticle helpers — canonical units & types', () => {
  it('exposes only MOA and MRAD as canonical reticle units', () => {
    expect([...RETICLE_UNITS]).toEqual(['MOA', 'MRAD']);
  });

  it('rejects "mil" as a canonical reticle unit (must be MRAD internally)', () => {
    expect(isReticleUnit('mil')).toBe(false);
    expect(isReticleUnit('MOA')).toBe(true);
    expect(isReticleUnit('MRAD')).toBe(true);
  });

  it('exposes the full closed taxonomy of reticle types', () => {
    expect([...RETICLE_TYPES]).toEqual([
      'mil-dot',
      'moa-grid',
      'mrad-grid',
      'duplex',
      'bdc',
      'other',
    ]);
    expect(isReticleType('foo')).toBe(false);
    expect(isReticleType('mil-dot')).toBe(true);
  });

  it('isPlausibleReticleShape rejects mil-as-unit and missing fields', () => {
    expect(isPlausibleReticleShape({ ...baseReticle })).toBe(true);
    expect(isPlausibleReticleShape({ ...baseReticle, unit: 'mil' })).toBe(false);
    expect(isPlausibleReticleShape({ ...baseReticle, subtension: 0 })).toBe(false);
    expect(isPlausibleReticleShape({ ...baseReticle, type: 'unknown' })).toBe(false);
    expect(isPlausibleReticleShape(null)).toBe(false);
  });
});

describe('Tranche F.1 — backwards compatibility', () => {
  it('absence of pcp-reticles key in storage does not break getAll', () => {
    localStorage.removeItem('pcp-reticles');
    expect(reticleStore.getAll()).toEqual([]);
  });

  it('legacy projectiles without importedFrom remain valid', () => {
    const p = projectileStore.create({
      brand: 'JSB', model: 'Hades', weight: 15.89, bc: 0.021,
      caliber: '.22',
    } as Parameters<typeof projectileStore.create>[0]);
    expect(p.importedFrom).toBeUndefined();
    // round-trip
    expect(projectileStore.getById(p.id)?.importedFrom).toBeUndefined();
  });

  it('legacy optics without importedFrom remain valid', () => {
    const o = opticStore.create({
      name: 'Athlon Helos BTR',
      clickUnit: 'MRAD',
      clickValue: 0.1,
    } as Parameters<typeof opticStore.create>[0]);
    expect(o.importedFrom).toBeUndefined();
  });
});
