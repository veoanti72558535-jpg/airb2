/**
 * Session recalculation — Tranche C.
 *
 * Pure helper that takes a SOURCE session, re-runs the engine with the
 * current resolved profile, and returns the data needed to persist a NEW
 * linked session. NEVER mutates the source.
 *
 * Honesty contract:
 *  - Always returns a fresh metadata bundle (`buildSessionMetadata`).
 *  - The new session carries `derivedFromSessionId = source.id`.
 *  - The original is left untouched — callers MUST use `sessionStore.create`
 *    on the returned payload, never `update` on the source.
 *
 * No engine changes. No silent profile selector. The "current profile" is
 * whatever the engine resolves today for the source's input — same default
 * dispatch the rest of the app uses.
 */

import { calculateTrajectory } from '@/lib/ballistics';
import { buildSessionMetadata } from '@/lib/session-metadata';
import { LEGACY_PROFILE } from '@/lib/ballistics/profiles';
import type { Session } from '@/lib/types';
import type { ProfileId } from '@/lib/ballistics/types';

export interface RecalcPayload {
  /** Fields to feed into `sessionStore.create(...)`. */
  draft: Omit<Session, 'id' | 'createdAt' | 'updatedAt'>;
  /** Profile id resolved for this recalculation (today = legacy by default). */
  resolvedProfileId: ProfileId;
}

/**
 * Build the data needed to create a recalculated copy of `source`.
 *
 * @param source       Original session (already normalised or raw).
 * @param newName      Display name for the copy. Caller composes the suffix.
 * @param now          Optional ISO timestamp injection for tests.
 */
export function buildRecalcPayload(
  source: Session,
  newName: string,
  now: string = new Date().toISOString(),
): RecalcPayload {
  // Today the app dispatches every Quick Calc through the legacy profile by
  // default (no engineConfig on input). We mirror that here so the copy is
  // honest about which profile produced it. When/if a profile selector ever
  // exists, this is the single line to evolve.
  const resolvedProfileId: ProfileId = LEGACY_PROFILE.id;

  // Re-run the engine with the SAME input. We deliberately do NOT mutate
  // engineConfig here — the source's engineConfig (if any) is preserved.
  const input = source.input;
  const results = calculateTrajectory(input);
  const metadata = buildSessionMetadata(input, now);

  const draft: Omit<Session, 'id' | 'createdAt' | 'updatedAt'> = {
    name: newName,
    airgunId: source.airgunId,
    tuneId: source.tuneId,
    projectileId: source.projectileId,
    opticId: source.opticId,
    input,
    results,
    notes: source.notes,
    tags: [...(source.tags ?? [])],
    favorite: false,
    derivedFromSessionId: source.id,
    ...metadata,
  };

  return { draft, resolvedProfileId };
}

/**
 * Compose a localised "(recalculated)" suffix on a session name. Idempotent
 * enough for one click — repeated recalculations append `(2)`, `(3)`…
 */
export function composeRecalcName(
  originalName: string,
  suffix: string,
  existingNames: string[],
): string {
  const base = `${originalName.trim()} ${suffix}`.trim();
  if (!existingNames.includes(base)) return base;
  let n = 2;
  while (existingNames.includes(`${base} (${n})`)) n++;
  return `${base} (${n})`;
}
