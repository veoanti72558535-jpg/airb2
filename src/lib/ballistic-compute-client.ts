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
        | 'method-not-allowed' | 'server-misconfigured';
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
  const payload: SiBallisticPayload = { ...input, units: 'SI' };
  const { data, error } = await supabase.functions.invoke<BallisticComputeResponse>(
    'ballistic-compute',
    { body: payload },
  );
  if (error) {
    // supabase-js throws on non-2xx; the function's body is still in `error.context`.
    // Surface a uniform shape so callers branch on `ok` only.
    return {
      ok: false,
      code: 'invalid-input',
      message: error.message,
    };
  }
  return data!;
}