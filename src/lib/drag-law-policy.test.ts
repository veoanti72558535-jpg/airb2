/**
 * Tranche D — drag-law public-exposure policy tests.
 *
 * Invariants under audit:
 *  1. The four V1 laws (G1/G7/GA/GS) are accepted on every public surface.
 *  2. The four MERO laws (RA4/GA2/SLG0/SLG1) NEVER cross a public boundary —
 *     they are coerced to a safe public fallback (G1 by default).
 *  3. Garbage input (typo, undefined, number, object) is coerced safely.
 *  4. `customDragTable` is preserved by the projectile sanitiser (Doppler
 *     data is user-owned and remains valid public content).
 *  5. Sessions strip internal laws from BOTH the audit-trail fields
 *     (`dragLawEffective` / `dragLawRequested`) AND the embedded
 *     `input.dragModel` snapshot.
 */

import { describe, it, expect } from 'vitest';
import {
  PUBLIC_DRAG_LAWS,
  INTERNAL_DRAG_LAWS,
  isPublicDragLaw,
  sanitizePublicDragLaw,
  sanitizeProjectileForPublic,
  sanitizeSessionForPublic,
} from './drag-law-policy';
import type { DragModel, Projectile, Session } from './types';

describe('drag-law-policy — whitelist constants', () => {
  it('PUBLIC_DRAG_LAWS holds exactly the four V1 laws', () => {
    expect([...PUBLIC_DRAG_LAWS]).toEqual(['G1', 'G7', 'GA', 'GS']);
  });

  it('INTERNAL_DRAG_LAWS holds exactly the four MERO laws', () => {
    expect([...INTERNAL_DRAG_LAWS]).toEqual(['RA4', 'GA2', 'SLG0', 'SLG1']);
  });

  it('PUBLIC and INTERNAL sets are disjoint', () => {
    const inter = PUBLIC_DRAG_LAWS.filter(l => (INTERNAL_DRAG_LAWS as readonly string[]).includes(l));
    expect(inter).toEqual([]);
  });
});

describe('isPublicDragLaw', () => {
  it.each(PUBLIC_DRAG_LAWS)('accepts public law %s', (law) => {
    expect(isPublicDragLaw(law)).toBe(true);
  });

  it.each(INTERNAL_DRAG_LAWS)('rejects internal MERO law %s', (law) => {
    expect(isPublicDragLaw(law)).toBe(false);
  });

  it('rejects undefined / null / non-string', () => {
    expect(isPublicDragLaw(undefined)).toBe(false);
    expect(isPublicDragLaw(null)).toBe(false);
    expect(isPublicDragLaw(42)).toBe(false);
    expect(isPublicDragLaw({})).toBe(false);
  });

  it('rejects unknown strings (typo / lowercase)', () => {
    expect(isPublicDragLaw('g1')).toBe(false);
    expect(isPublicDragLaw('G99')).toBe(false);
  });
});

describe('sanitizePublicDragLaw', () => {
  it.each(PUBLIC_DRAG_LAWS)('passes through public law %s', (law) => {
    expect(sanitizePublicDragLaw(law)).toBe(law);
  });

  it.each(INTERNAL_DRAG_LAWS)('rewrites internal MERO law %s to G1', (law) => {
    expect(sanitizePublicDragLaw(law)).toBe('G1');
  });

  it('rewrites unknown / undefined to G1 by default', () => {
    expect(sanitizePublicDragLaw(undefined)).toBe('G1');
    expect(sanitizePublicDragLaw('typo')).toBe('G1');
    expect(sanitizePublicDragLaw(null)).toBe('G1');
  });

  it('honours an explicit public fallback', () => {
    expect(sanitizePublicDragLaw('SLG1', 'G7')).toBe('G7');
  });

  it('falls back to G1 even if a non-public fallback is supplied (defensive)', () => {
    // Caller misuse: should never pass an internal law as fallback. We
    // still want a safe answer rather than propagating the leak.
    expect(sanitizePublicDragLaw('typo', 'RA4' as DragModel)).toBe('G1');
  });
});

function makeProjectile(overrides: Partial<Projectile> = {}): Projectile {
  return {
    id: 'p1',
    brand: 'JSB',
    model: 'Exact',
    weight: 18,
    bc: 0.025,
    bcModel: 'G1',
    caliber: '.22',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('sanitizeProjectileForPublic', () => {
  it('passes through a projectile with a public bcModel', () => {
    const p = makeProjectile({ bcModel: 'G7' });
    const r = sanitizeProjectileForPublic(p);
    expect(r.replaced).toBe(false);
    expect(r.projectile.bcModel).toBe('G7');
    expect(r.projectile).toBe(p); // identity preserved when no change
  });

  it.each(INTERNAL_DRAG_LAWS)('rewrites internal MERO bcModel %s to G1', (law) => {
    const p = makeProjectile({ bcModel: law });
    const r = sanitizeProjectileForPublic(p);
    expect(r.replaced).toBe(true);
    expect(r.originalBcModel).toBe(law);
    expect(r.projectile.bcModel).toBe('G1');
    // never mutates the original
    expect(p.bcModel).toBe(law);
  });

  it('rewrites unknown bcModel string to G1 with replaced=true', () => {
    const p = makeProjectile({ bcModel: 'CUSTOM' as DragModel });
    const r = sanitizeProjectileForPublic(p);
    expect(r.replaced).toBe(true);
    expect(r.projectile.bcModel).toBe('G1');
  });

  it('preserves undefined bcModel without flagging replacement', () => {
    const p = makeProjectile({ bcModel: undefined });
    const r = sanitizeProjectileForPublic(p);
    expect(r.replaced).toBe(false);
    expect(r.projectile.bcModel).toBeUndefined();
  });

  it('preserves customDragTable when sanitising bcModel', () => {
    const table = [{ mach: 0.5, cd: 0.3 }];
    const p = makeProjectile({ bcModel: 'SLG1', customDragTable: table });
    const r = sanitizeProjectileForPublic(p);
    expect(r.projectile.customDragTable).toBe(table);
  });
});

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 's1',
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
    profileId: 'legacy',
    dragLawEffective: 'G1',
    dragLawRequested: 'G1',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('sanitizeSessionForPublic', () => {
  it('passes through a session with public laws everywhere', () => {
    const s = makeSession({ dragLawEffective: 'G7', dragLawRequested: 'G7', input: { ...makeSession().input, dragModel: 'G7' } });
    const out = sanitizeSessionForPublic(s);
    expect(out.dragLawEffective).toBe('G7');
    expect(out.dragLawRequested).toBe('G7');
    expect(out.input!.dragModel).toBe('G7');
  });

  it.each(INTERNAL_DRAG_LAWS)('strips internal law %s from dragLawEffective', (law) => {
    const s = makeSession({ dragLawEffective: law });
    const out = sanitizeSessionForPublic(s);
    expect(out.dragLawEffective).toBe('G1');
    // original is untouched
    expect(s.dragLawEffective).toBe(law);
  });

  it.each(INTERNAL_DRAG_LAWS)('strips internal law %s from dragLawRequested', (law) => {
    const s = makeSession({ dragLawRequested: law });
    const out = sanitizeSessionForPublic(s);
    expect(out.dragLawRequested).toBe('G1');
  });

  it('strips internal law from nested input.dragModel', () => {
    const s = makeSession({ input: { ...makeSession().input, dragModel: 'SLG1' } });
    const out = sanitizeSessionForPublic(s);
    expect(out.input!.dragModel).toBe('G1');
    // and does not touch sibling input fields
    expect(out.input!.muzzleVelocity).toBe(280);
  });

  it('preserves audit metadata that is NOT a drag-law leak vector', () => {
    const s = makeSession({
      profileId: 'mero',
      cdProvenance: 'derived-p2',
      calculatedAtSource: 'frozen',
      metadataInferred: false,
    });
    const out = sanitizeSessionForPublic(s);
    expect(out.profileId).toBe('mero');
    expect(out.cdProvenance).toBe('derived-p2');
    expect(out.calculatedAtSource).toBe('frozen');
  });
});
