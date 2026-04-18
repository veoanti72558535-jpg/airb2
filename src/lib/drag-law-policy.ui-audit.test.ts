/**
 * Tranche D — UI surface audit.
 *
 * Static structural assertion that the public projectile editor (the only
 * place where a user can pick a `bcModel`) never offers an internal MERO
 * law in its `<select>`. Done as a source-text scan rather than a render
 * test because the form is conditionally mounted behind several state
 * toggles and the policy must hold even if a future refactor re-arranges
 * the JSX.
 *
 * Companion to `EngineBadge.test.tsx` and `CalculationMetadataBlock.test.tsx`,
 * which cover the read-side surfaces.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { INTERNAL_DRAG_LAWS, PUBLIC_DRAG_LAWS } from './drag-law-policy';

function readSrc(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), 'utf-8');
}

describe('UI surface — drag-law dropdowns are whitelist-only', () => {
  it('ProjectilesPage select offers only the V1 public laws', () => {
    const src = readSrc('src/pages/ProjectilesPage.tsx');

    // Each public law must be offered as an <option value="...">
    for (const law of PUBLIC_DRAG_LAWS) {
      expect(src, `missing public option ${law}`).toMatch(
        new RegExp(`<option value=["']${law}["']`),
      );
    }

    // No internal MERO law may appear as a value="..." anywhere in this
    // file (defensive — catches a future "added it just to test").
    for (const law of INTERNAL_DRAG_LAWS) {
      expect(src, `leaked internal law ${law} in ProjectilesPage`).not.toMatch(
        new RegExp(`value=["']${law}["']`),
      );
    }
  });

  it('ProjectileSection (calc) select offers only the V1 public laws', () => {
    const src = readSrc('src/components/calc/ProjectileSection.tsx');
    for (const law of PUBLIC_DRAG_LAWS) {
      expect(src).toMatch(new RegExp(`<option value=["']${law}["']`));
    }
    for (const law of INTERNAL_DRAG_LAWS) {
      expect(src).not.toMatch(new RegExp(`value=["']${law}["']`));
    }
  });

  it('DragTableEditor reference toggles are typed to the V1 subset only', () => {
    const src = readSrc('src/components/projectiles/DragTableEditor.tsx');
    // The narrowed type alias must list exactly the public laws.
    expect(src).toMatch(/type UiDragModel = ['"]G1['"] \| ['"]G7['"] \| ['"]GA['"] \| ['"]GS['"]/);
    // And no MERO law must appear as a Cd-toggle key.
    for (const law of INTERNAL_DRAG_LAWS) {
      expect(src).not.toMatch(new RegExp(`['"]${law}['"]\\s*:`));
    }
  });
});
