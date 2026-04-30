/**
 * Smoke tests for the UI unit-debug toggle.
 * State is purely local (localStorage) — these tests don't touch the
 * ballistic engine, only the small store + helpers used by <UnitTag />.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { setUnitDebug } from './unit-debug';

describe('unit-debug store', () => {
  beforeEach(() => localStorage.clear());

  it('is off by default', () => {
    expect(localStorage.getItem('airballistik-debug-units')).toBeNull();
  });

  it('persists on/off via setUnitDebug', () => {
    setUnitDebug(true);
    expect(localStorage.getItem('airballistik-debug-units')).toBe('1');
    setUnitDebug(false);
    expect(localStorage.getItem('airballistik-debug-units')).toBeNull();
  });
});
