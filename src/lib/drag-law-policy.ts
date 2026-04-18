/**
 * Drag-law public-exposure policy — Tranche D.
 *
 * Single source of truth for "which drag laws may cross a public boundary".
 *
 * Background
 * ----------
 * The engine's `DragModel` type is intentionally wide — it carries 8 laws so
 * the MERO profile (P2 beta, internal-only) can resolve Cd for slug-specific
 * curves. But only four laws are validated for public surfaces:
 *
 *   PUBLIC  : G1 · G7 · GA · GS
 *   INTERNAL: RA4 · GA2 · SLG0 · SLG1   (MERO beta, never UI-selectable)
 *
 * Anything that flows in from a user (import JSON, paste, file upload) or
 * out to a user (export JSON, share link, projectile catalogue card,
 * EngineBadge tooltip, CalculationMetadataBlock) MUST be filtered through
 * this module. The engine itself is free to keep using the wide set.
 *
 * Policy
 * ------
 * - `isPublicDragLaw(x)` — type guard, returns true iff `x` is one of the
 *   four V1 UI laws.
 * - `sanitizePublicDragLaw(x, fallback?)` — accepts ANY input (string, undef,
 *   typo, internal MERO law) and returns a guaranteed-safe `DragModel`. The
 *   default fallback is `G1` (the historical projectile default and the
 *   value that has the highest probability of producing a "safe-ish" trajectory
 *   when nothing better is known).
 * - `sanitizeProjectileForPublic(p)` — projectile-shaped sanitiser. Returns
 *   the projectile unchanged when its `bcModel` is public, otherwise rewrites
 *   the field to `G1` and reports it via the `replaced` flag so the caller
 *   can surface a non-alarmist toast/warning.
 * - `sanitizeSessionForPublic(s)` — strips internal-only drag laws from any
 *   audit-trail field on a Session before it crosses a public boundary
 *   (export JSON, future share link). Mutates a shallow copy only.
 *
 * What this module does NOT do
 * ----------------------------
 * - It does not narrow the engine's `DragModel` type.
 * - It does not block writes to localStorage by other Lovable users — those
 *   stay private to their browser.
 * - It does not strip `customDragTable`. Custom tables are user-provided
 *   data points (Doppler radar, JBM exports) and remain valid public content.
 */

import type { DragModel, Projectile, Session } from './types';

/** The four V1 drag laws that may appear in any public surface. */
export const PUBLIC_DRAG_LAWS: readonly DragModel[] = ['G1', 'G7', 'GA', 'GS'] as const;

/** The four MERO laws kept engine-internal. Listed for tests/audits only. */
export const INTERNAL_DRAG_LAWS: readonly DragModel[] = ['RA4', 'GA2', 'SLG0', 'SLG1'] as const;

const PUBLIC_SET: ReadonlySet<string> = new Set(PUBLIC_DRAG_LAWS);

/** Type guard — true iff `law` is a public V1 drag law. */
export function isPublicDragLaw(law: unknown): law is DragModel {
  return typeof law === 'string' && PUBLIC_SET.has(law);
}

/**
 * Coerce any value into a public-safe `DragModel`. Returns `fallback`
 * (default `G1`) when the input is missing, malformed, or an internal-only
 * MERO law.
 *
 * Always safe to call on untrusted input.
 */
export function sanitizePublicDragLaw(
  raw: unknown,
  fallback: DragModel = 'G1',
): DragModel {
  if (isPublicDragLaw(raw)) return raw;
  // fallback itself must be public — guard against misuse.
  return isPublicDragLaw(fallback) ? fallback : 'G1';
}

export interface SanitizeProjectileResult {
  projectile: Projectile;
  /** True when `bcModel` was rewritten because it was non-public/invalid. */
  replaced: boolean;
  /** The original (rejected) value, for logging/UX messaging. */
  originalBcModel?: unknown;
}

/**
 * Returns a public-safe shallow copy of a projectile. When `bcModel` is
 * non-public (RA4/GA2/SLG0/SLG1, undefined, or unknown string), it is
 * replaced by `G1` and `replaced=true`. Custom drag tables are preserved.
 *
 * Pure: never mutates the input.
 */
export function sanitizeProjectileForPublic<T extends Partial<Projectile>>(
  p: T,
): { projectile: T; replaced: boolean; originalBcModel?: unknown } {
  const original = (p as { bcModel?: unknown }).bcModel;
  // Allow `undefined` → preserved (consumers default to G1 themselves).
  if (original === undefined) {
    return { projectile: p, replaced: false };
  }
  if (isPublicDragLaw(original)) {
    return { projectile: p, replaced: false };
  }
  return {
    projectile: { ...p, bcModel: 'G1' as DragModel },
    replaced: true,
    originalBcModel: original,
  };
}

/**
 * Returns a public-safe shallow copy of a session. Strips internal-only
 * drag laws from `dragLawEffective` and `dragLawRequested`. Other audit
 * metadata (provenance, profileId, calculatedAt…) is preserved as-is —
 * it is not a leak vector.
 *
 * Pure: never mutates the input.
 */
export function sanitizeSessionForPublic<T extends Partial<Session>>(s: T): T {
  let next: T = s;
  if (s.dragLawEffective !== undefined && !isPublicDragLaw(s.dragLawEffective)) {
    next = { ...next, dragLawEffective: 'G1' as DragModel };
  }
  if (s.dragLawRequested !== undefined && !isPublicDragLaw(s.dragLawRequested)) {
    next = { ...next, dragLawRequested: 'G1' as DragModel };
  }
  // Sanitise the nested input.dragModel as well — it is part of the
  // exported snapshot and would otherwise reveal an internal law.
  const input = (s as { input?: { dragModel?: unknown } }).input;
  if (input && input.dragModel !== undefined && !isPublicDragLaw(input.dragModel)) {
    next = {
      ...next,
      input: { ...input, dragModel: 'G1' as DragModel },
    } as T;
  }
  return next;
}
