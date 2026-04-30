/**
 * Client helper for the `ballistic-compute` edge function — the SI
 * guardrail. Every call must explicitly assert `units: "SI"` at the
 * root; this helper enforces that assertion at the type level so we
 * cannot accidentally POST a display-unit payload from the app.
 *
 * The endpoint VALIDATES — it does not run the engine. The engine itself
 * stays client-side (`@/lib/ballistics`). On `ok: true`, callers may
 * forward `normalized` straight to `calculateTrajectory`.
 */
import { supabase } from '@/integrations/supabase/client';
import type { BallisticInput } from '@/lib/types';

/** Strictly-typed SI envelope. The literal `units: "SI"` makes it
 *  impossible to POST without the sentinel the backend requires. */
export type SiBallisticPayload = BallisticInput & { units: 'SI' };

export type BallisticComputeResponse =
  | { ok: true; units: 'SI'; engineVersion: 2; normalized: SiBallisticPayload }
  | {
      ok: false;
      code:
        | 'no-auth' | 'invalid-jwt'
        | 'bad-json' | 'missing-units-sentinel'
        | 'display-unit-detected' | 'out-of-si-range' | 'invalid-input'
        | 'method-not-allowed' | 'server-misconfigured'
        | 'no-supabase' | 'network-error';
      message: string;
      offendingPath?: string;
      issues?: unknown;
    };

/**
 * Validate a ballistic input against the backend SI guardrail.
 * Throws on transport errors; returns the structured response otherwise.
 */
export async function validateBallisticInputSI(
  input: BallisticInput,
): Promise<BallisticComputeResponse> {
  // Self-hosted / offline fallback : when Supabase is not configured the
  // guardrail edge function is unreachable. Callers MUST treat this as
  // "unverified" rather than a hard rejection (offline-first contract).
  if (!supabase) {
    return {
      ok: false,
      code: 'no-supabase',
      message: 'Supabase client not configured — backend guardrail unavailable.',
    };
  }
  // Same idea for unauthenticated visitors : the edge function requires a
  // JWT. We surface a dedicated `no-auth` code so QuickCalc / future call
  // sites can decide between "block" and "fall back to local-only".
  try {
    const { data: sess } = await supabase.auth.getSession();
    if (!sess?.session) {
      return {
        ok: false,
        code: 'no-auth',
        message: 'No authenticated session — guardrail skipped.',
      };
    }
  } catch (e) {
    return {
      ok: false,
      code: 'no-auth',
      message: e instanceof Error ? e.message : 'Auth check failed.',
    };
  }
  const payload: SiBallisticPayload = { ...input, units: 'SI' };
  try {
    const { data, error } = await supabase.functions.invoke<BallisticComputeResponse>(
      'ballistic-compute',
      { body: payload },
    );
    if (error) {
      // supabase-js throws on non-2xx; the function's body is still in `error.context`.
      // Surface a uniform shape so callers branch on `ok` only.
      return {
        ok: false,
        code: 'network-error',
        message: error.message,
      };
    }
    return data!;
  } catch (e) {
    return {
      ok: false,
      code: 'network-error',
      message: e instanceof Error ? e.message : 'Network call failed.',
    };
  }
}

/**
 * Codes returned by the guardrail that represent a HARD rejection
 * (the input itself violates the SI contract). Any other failure code
 * (`no-supabase`, `no-auth`, `network-error`, `server-misconfigured`,
 * `method-not-allowed`) means the guardrail could not run — callers
 * may decide to fall back to a local-only computation marked as
 * "unverified" in the UI.
 */
export const HARD_REJECTION_CODES = [
  'bad-json',
  'missing-units-sentinel',
  'display-unit-detected',
  'out-of-si-range',
  'invalid-input',
  'invalid-jwt',
] as const;

export type HardRejectionCode = (typeof HARD_REJECTION_CODES)[number];

export function isHardRejection(
  res: BallisticComputeResponse,
): res is Extract<BallisticComputeResponse, { ok: false }> & { code: HardRejectionCode } {
  return res.ok === false
    && (HARD_REJECTION_CODES as readonly string[]).includes(res.code);
}