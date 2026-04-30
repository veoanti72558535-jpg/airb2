/**
 * Contract tests for `validateBallisticInputSI` — the helper that
 * QuickCalc (and any future call site such as a live BallisticTable
 * call site) must `await` BEFORE invoking `calculateTrajectory`.
 *
 * The helper MUST :
 *   - return `no-supabase` when the Supabase client is null (offline);
 *   - return `no-auth` when configured but unauthenticated;
 *   - propagate hard rejections (`display-unit-detected`, …);
 *   - never throw.
 *
 * Coupled with `isHardRejection`, callers can build a single, uniform
 * gating policy : block on hard rejections, fall back to local-only on
 * infra failures.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: null as unknown,
  isSupabaseConfigured: () => false,
}));

import {
  validateBallisticInputSI,
  isHardRejection,
  HARD_REJECTION_CODES,
  type BallisticComputeResponse,
} from './ballistic-compute-client';
import type { BallisticInput } from './types';
import * as supaModule from '@/integrations/supabase/client';

const REF_INPUT: BallisticInput = {
  bc: 0.025,
  projectileWeight: 18,
  muzzleVelocity: 280,
  sightHeight: 40,
  zeroRange: 30,
  maxRange: 100,
  rangeStep: 10,
  weather: {
    temperature: 15,
    humidity: 50,
    pressure: 1013.25,
    altitude: 0,
    windSpeed: 0,
    windAngle: 90,
    source: 'manual',
    timestamp: new Date().toISOString(),
  },
  clickValue: 0.1,
  clickUnit: 'MRAD',
};

describe('validateBallisticInputSI — gating contract', () => {
  beforeEach(() => {
    // Reset the mocked module to "no client" between tests.
    (supaModule as { supabase: unknown }).supabase = null;
  });

  it('returns no-supabase (soft) when the client is null', async () => {
    const res = await validateBallisticInputSI(REF_INPUT);
    expect(res.ok).toBe(false);
    expect((res as { code: string }).code).toBe('no-supabase');
    expect(isHardRejection(res)).toBe(false);
  });

  it('returns no-auth (soft) when authenticated session is absent', async () => {
    (supaModule as { supabase: unknown }).supabase = {
      auth: { getSession: async () => ({ data: { session: null } }) },
      functions: { invoke: async () => { throw new Error('should not be called'); } },
    };
    const res = await validateBallisticInputSI(REF_INPUT);
    expect(res.ok).toBe(false);
    expect((res as { code: string }).code).toBe('no-auth');
    expect(isHardRejection(res)).toBe(false);
  });

  it('propagates hard rejection from the edge function', async () => {
    const rejection: BallisticComputeResponse = {
      ok: false,
      code: 'display-unit-detected',
      message: 'muzzleVelocityFps is forbidden',
      offendingPath: '$.muzzleVelocityFps',
    };
    (supaModule as { supabase: unknown }).supabase = {
      auth: { getSession: async () => ({ data: { session: { user: { id: 'u' } } } }) },
      functions: { invoke: async () => ({ data: rejection, error: null }) },
    };
    const res = await validateBallisticInputSI(REF_INPUT);
    expect(res.ok).toBe(false);
    expect(isHardRejection(res)).toBe(true);
    expect((res as { code: string }).code).toBe('display-unit-detected');
  });

  it('returns ok=true with normalized payload when the guardrail accepts', async () => {
    const accepted: BallisticComputeResponse = {
      ok: true,
      units: 'SI',
      engineVersion: 2,
      normalized: { ...REF_INPUT, units: 'SI' },
    };
    (supaModule as { supabase: unknown }).supabase = {
      auth: { getSession: async () => ({ data: { session: { user: { id: 'u' } } } }) },
      functions: { invoke: async () => ({ data: accepted, error: null }) },
    };
    const res = await validateBallisticInputSI(REF_INPUT);
    expect(res.ok).toBe(true);
    expect(isHardRejection(res)).toBe(false);
  });

  it('downgrades transport errors to network-error (soft)', async () => {
    (supaModule as { supabase: unknown }).supabase = {
      auth: { getSession: async () => ({ data: { session: { user: { id: 'u' } } } }) },
      functions: { invoke: async () => ({ data: null, error: { message: 'fetch failed' } }) },
    };
    const res = await validateBallisticInputSI(REF_INPUT);
    expect(res.ok).toBe(false);
    expect((res as { code: string }).code).toBe('network-error');
    expect(isHardRejection(res)).toBe(false);
  });

  it('exposes a stable list of hard rejection codes', () => {
    expect(HARD_REJECTION_CODES).toContain('display-unit-detected');
    expect(HARD_REJECTION_CODES).toContain('out-of-si-range');
    expect(HARD_REJECTION_CODES).toContain('missing-units-sentinel');
    // soft codes MUST NOT be in the list (otherwise QuickCalc would
    // hard-block offline users — violates the offline-first memo).
    expect(HARD_REJECTION_CODES).not.toContain('no-auth');
    expect(HARD_REJECTION_CODES).not.toContain('no-supabase');
    expect(HARD_REJECTION_CODES).not.toContain('network-error');
  });
});