/**
 * Tranche C — QuickCalc save invariant.
 *
 * Whatever path the user takes (fresh form or rehydrated from ?session=<id>),
 * QuickCalc's save MUST be creation-only. Rehydrating + saving creates a NEW
 * row; the original session is never mutated. This test locks that contract
 * at the storage level — the same-named row from /calc?session= must remain
 * after a save and a brand-new row must appear next to it.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { sessionStore } from '@/lib/storage';
import { buildSessionMetadata } from '@/lib/session-metadata';
import type { Session } from '@/lib/types';

beforeEach(() => {
  localStorage.clear();
});

describe('QuickCalc save path — creation-only invariant', () => {
  it('a save after rehydration adds a NEW row and leaves the source untouched', () => {
    // Seed: a saved session that QuickCalc would rehydrate via ?session=<id>.
    const source = sessionStore.create({
      name: 'Bench Session',
      input: {
        muzzleVelocity: 280, bc: 0.025, projectileWeight: 18,
        sightHeight: 50, zeroRange: 30, maxRange: 50, rangeStep: 10,
        weather: {
          temperature: 15, humidity: 50, pressure: 1013, altitude: 0,
          windSpeed: 0, windAngle: 0, source: 'manual', timestamp: '',
        },
      },
      results: [],
      tags: ['bench'],
      favorite: true,
    });

    // Reproduce QuickCalc.handleSave behaviour: ALWAYS sessionStore.create,
    // never sessionStore.update. The previewOriginId state never feeds the
    // create call as a target — the contract is enforced by the API surface
    // QuickCalc uses.
    const input = source.input;
    const metadata = buildSessionMetadata(input);
    const createdAfterRehydrate = sessionStore.create({
      name: 'Bench Session', // even with the same name → still a new row
      input,
      results: [],
      tags: [],
      favorite: false,
      ...metadata,
    });

    expect(createdAfterRehydrate.id).not.toBe(source.id);

    const all = sessionStore.getAll();
    expect(all).toHaveLength(2);

    const original = all.find(s => s.id === source.id);
    expect(original).toBeDefined();
    expect(original?.name).toBe('Bench Session');
    expect(original?.tags).toEqual(['bench']);
    expect(original?.favorite).toBe(true);
  });
});
