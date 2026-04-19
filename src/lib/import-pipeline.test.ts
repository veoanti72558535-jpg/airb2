/**
 * Tranche F.2 — Tests pipeline d'import (pure, dry-run).
 *
 * Couvre projectiles, optiques, réticules + sécurité payload + dédup.
 * Pas de mock UI, pas d'écriture storage.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  importProjectilesPreview,
  importOpticsPreview,
  importReticlesPreview,
  runImportPreview,
  MAX_ITEMS,
  MAX_PAYLOAD_BYTES,
  type ProjectileImportItem,
  type ReticleImportItem,
} from './import-pipeline';
import { INTERNAL_DRAG_LAWS, PUBLIC_DRAG_LAWS } from './drag-law-policy';

const SOURCE = 'json-user' as const;

// ---------------------------------------------------------------------------
// Projectiles
// ---------------------------------------------------------------------------

describe('importProjectilesPreview — happy path & sanitisation', () => {
  it('imports a public-law projectile as ok', () => {
    const preview = importProjectilesPreview(
      [{ brand: 'JSB', model: 'Hades', weight: 15.89, bc: 0.021, bcModel: 'G1', caliber: '.22' }],
      { source: SOURCE },
    );
    expect(preview.entityType).toBe('projectile');
    expect(preview.okCount).toBe(1);
    expect(preview.sanitizedCount).toBe(0);
    expect(preview.rejectedCount).toBe(0);
    expect(preview.items[0].status).toBe('ok');
    expect(preview.items[0].data?.bcModel).toBe('G1');
    expect(preview.items[0].data?.importedFrom).toBe(SOURCE);
  });

  it.each(INTERNAL_DRAG_LAWS)(
    'sanitises internal MERO law %s → G1',
    (law) => {
      const preview = importProjectilesPreview(
        [{ brand: 'X', model: 'Y', weight: 30, bc: 0.05, bcModel: law, caliber: '.30' }],
        { source: SOURCE },
      );
      const item = preview.items[0] as ProjectileImportItem;
      expect(item.status).toBe('sanitized');
      expect(item.data?.bcModel).toBe('G1');
      expect(item.notes?.[0].code).toBe('drag-law-replaced');
      expect(item.notes?.[0].originalValue).toBe(law);
      expect(preview.sanitizedCount).toBe(1);
    },
  );

  it('sanitises an unknown drag law to G1', () => {
    const preview = importProjectilesPreview(
      [{ brand: 'X', model: 'Y', weight: 18, bc: 0.025, bcModel: 'GZ9', caliber: '.22' }],
      { source: SOURCE },
    );
    const item = preview.items[0];
    expect(item.status).toBe('sanitized');
    expect(item.data?.bcModel).toBe('G1');
  });

  it('rejects a projectile with an out-of-bounds customDragTable point', () => {
    const preview = importProjectilesPreview(
      [{
        brand: 'X', model: 'Y', weight: 18, bc: 0.025, caliber: '.22',
        customDragTable: [{ mach: 0.5, cd: 0.3 }, { mach: 7, cd: 0.5 }],
      }],
      { source: SOURCE },
    );
    expect(preview.rejectedCount).toBe(1);
    expect(preview.items[0].status).toBe('rejected');
    expect(preview.items[0].issues?.length).toBeGreaterThan(0);
  });

  it('rejects items with unknown fields (.strict())', () => {
    const preview = importProjectilesPreview(
      [{ brand: 'X', model: 'Y', weight: 18, bc: 0.025, caliber: '.22', evil: 'payload' }],
      { source: SOURCE },
    );
    expect(preview.rejectedCount).toBe(1);
  });

  it('drops the imported `id` field (id is never re-emitted)', () => {
    const preview = importProjectilesPreview(
      [{ id: 'attacker-controlled', brand: 'X', model: 'Y', weight: 18, bc: 0.025, caliber: '.22' }],
      { source: SOURCE },
    );
    // .strict() rejette les champs inconnus → l'`id` est traité comme tel.
    expect(preview.rejectedCount).toBe(1);
    expect(preview.items[0].data).toBeUndefined();
  });

  it.each(PUBLIC_DRAG_LAWS)('preserves public law %s untouched', (law) => {
    const preview = importProjectilesPreview(
      [{ brand: 'X', model: `M-${law}`, weight: 18, bc: 0.025, bcModel: law, caliber: '.22' }],
      { source: SOURCE },
    );
    expect(preview.items[0].status).toBe('ok');
    expect(preview.items[0].data?.bcModel).toBe(law);
  });
});

// ---------------------------------------------------------------------------
// Optiques
// ---------------------------------------------------------------------------

describe('importOpticsPreview', () => {
  it('imports a valid optic as ok', () => {
    const preview = importOpticsPreview(
      [{ name: 'Vortex Strike Eagle', clickUnit: 'MRAD', clickValue: 0.1 }],
      { source: SOURCE },
    );
    expect(preview.okCount).toBe(1);
    expect(preview.items[0].data?.importedFrom).toBe(SOURCE);
  });

  it('flags duplicate optics (intra-batch)', () => {
    const preview = importOpticsPreview(
      [
        { name: 'Athlon BTR', clickUnit: 'MRAD', clickValue: 0.1 },
        { name: 'athlon btr', clickUnit: 'MRAD', clickValue: 0.1 },
      ],
      { source: SOURCE },
    );
    expect(preview.okCount).toBe(1);
    expect(preview.duplicateCount).toBe(1);
    expect(preview.items[1].status).toBe('duplicate');
  });

  it('flags duplicate optics against existing data', () => {
    const preview = importOpticsPreview(
      [{ name: 'Existing Scope', clickUnit: 'MOA', clickValue: 0.25 }],
      {
        source: SOURCE,
        existing: { optics: [{ name: 'Existing Scope' }] },
      },
    );
    expect(preview.duplicateCount).toBe(1);
    expect(preview.okCount).toBe(0);
  });

  it('rejects unknown fields on optic', () => {
    const preview = importOpticsPreview(
      [{ name: 'X', clickUnit: 'MOA', clickValue: 0.25, secret: 1 }],
      { source: SOURCE },
    );
    expect(preview.rejectedCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Réticules
// ---------------------------------------------------------------------------

describe('importReticlesPreview — unit canonicalisation', () => {
  it.each(['MOA', 'MRAD'] as const)('imports unit %s untouched as ok', (unit) => {
    const preview = importReticlesPreview(
      [{ brand: 'B', model: `M-${unit}`, type: 'mil-dot', unit, subtension: 1 }],
      { source: SOURCE },
    );
    expect(preview.okCount).toBe(1);
    expect(preview.items[0].data?.unit).toBe(unit);
  });

  it('canonicalises mil → MRAD and marks sanitized', () => {
    const preview = importReticlesPreview(
      [{ brand: 'B', model: 'M', type: 'mil-dot', unit: 'mil', subtension: 1 }],
      { source: SOURCE },
    );
    const item = preview.items[0] as ReticleImportItem;
    expect(item.status).toBe('sanitized');
    expect(item.data?.unit).toBe('MRAD');
    expect(item.notes?.[0].code).toBe('reticle-unit-canonicalised');
    expect(preview.sanitizedCount).toBe(1);
  });

  it('rejects an invalid type', () => {
    const preview = importReticlesPreview(
      [{ brand: 'B', model: 'M', type: 'plasma', unit: 'MRAD', subtension: 1 }],
      { source: SOURCE },
    );
    expect(preview.rejectedCount).toBe(1);
  });

  it('NEVER emits unit:"mil" in normalised output across a mixed batch', () => {
    const preview = importReticlesPreview(
      [
        { brand: 'A', model: '1', type: 'mil-dot', unit: 'mil', subtension: 1 },
        { brand: 'B', model: '2', type: 'mrad-grid', unit: 'MRAD', subtension: 0.5 },
        { brand: 'C', model: '3', type: 'moa-grid', unit: 'MOA', subtension: 1 },
      ],
      { source: SOURCE },
    );
    for (const it of preview.items) {
      if (it.data) expect(it.data.unit).not.toBe('mil');
    }
  });

  it('flags duplicate reticles (case-insensitive intra-batch)', () => {
    const preview = importReticlesPreview(
      [
        { brand: 'Vortex', model: 'EBR-7C', type: 'mrad-grid', unit: 'MRAD', subtension: 1 },
        { brand: 'vortex', model: 'ebr-7c', type: 'mrad-grid', unit: 'MRAD', subtension: 1 },
      ],
      { source: SOURCE },
    );
    expect(preview.okCount).toBe(1);
    expect(preview.duplicateCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Sécurité / limites
// ---------------------------------------------------------------------------

describe('Pipeline — security limits & purity', () => {
  it('rejects payloads larger than MAX_PAYLOAD_BYTES', () => {
    const big = ' '.repeat(MAX_PAYLOAD_BYTES + 1);
    const preview = importProjectilesPreview(big, { source: SOURCE });
    expect(preview.fatalError?.code).toBe('payload-too-large');
    expect(preview.total).toBe(0);
  });

  it('rejects invalid JSON strings', () => {
    const preview = importProjectilesPreview('not-json{', { source: SOURCE });
    expect(preview.fatalError?.code).toBe('invalid-json');
  });

  it('rejects payloads exceeding MAX_ITEMS', () => {
    const arr = Array.from({ length: MAX_ITEMS + 1 }, (_, i) => ({
      brand: 'X', model: `M${i}`, weight: 18, bc: 0.025, caliber: '.22',
    }));
    const preview = importProjectilesPreview(arr, { source: SOURCE });
    expect(preview.fatalError?.code).toBe('too-many-items');
  });

  it('rejects strings that exceed the max length (200 chars)', () => {
    const preview = importProjectilesPreview(
      [{ brand: 'X'.repeat(201), model: 'Y', weight: 18, bc: 0.025, caliber: '.22' }],
      { source: SOURCE },
    );
    expect(preview.rejectedCount).toBe(1);
  });

  it('does NOT call localStorage during a full preview run', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const removeItem = vi.spyOn(Storage.prototype, 'removeItem');
    importProjectilesPreview(
      [{ brand: 'X', model: 'Y', weight: 18, bc: 0.025, caliber: '.22' }],
      { source: SOURCE },
    );
    importOpticsPreview(
      [{ name: 'A', clickUnit: 'MOA', clickValue: 0.25 }],
      { source: SOURCE },
    );
    importReticlesPreview(
      [{ brand: 'B', model: 'M', type: 'mil-dot', unit: 'MRAD', subtension: 1 }],
      { source: SOURCE },
    );
    expect(setItem).not.toHaveBeenCalled();
    expect(removeItem).not.toHaveBeenCalled();
    setItem.mockRestore();
    removeItem.mockRestore();
  });

  it('runImportPreview façade dispatches on entityType', () => {
    const p = runImportPreview('projectile',
      [{ brand: 'X', model: 'Y', weight: 18, bc: 0.025, caliber: '.22' }],
      { source: SOURCE },
    );
    expect(p.entityType).toBe('projectile');
    const r = runImportPreview('reticle',
      [{ brand: 'B', model: 'M', type: 'mil-dot', unit: 'MRAD', subtension: 1 }],
      { source: SOURCE },
    );
    expect(r.entityType).toBe('reticle');
  });

  it('rejects a non-array payload', () => {
    const preview = importProjectilesPreview({ brand: 'X' }, { source: SOURCE });
    expect(preview.fatalError?.code).toBe('not-an-array');
  });
});

// ---------------------------------------------------------------------------
// Dédup contre existants
// ---------------------------------------------------------------------------

describe('Pipeline — deduplication', () => {
  it('detects projectile duplicates against existing data', () => {
    const preview = importProjectilesPreview(
      [{ brand: 'JSB', model: 'Hades', weight: 15.89, bc: 0.021, caliber: '.22' }],
      {
        source: SOURCE,
        existing: {
          projectiles: [{ brand: 'jsb', model: 'hades', weight: 15.89, caliber: '.22' }],
        },
      },
    );
    expect(preview.duplicateCount).toBe(1);
    expect(preview.okCount).toBe(0);
  });

  it('detects projectile duplicates intra-batch', () => {
    const preview = importProjectilesPreview(
      [
        { brand: 'JSB', model: 'Hades', weight: 15.89, bc: 0.021, caliber: '.22' },
        { brand: 'JSB', model: 'Hades', weight: 15.89, bc: 0.021, caliber: '.22' },
      ],
      { source: SOURCE },
    );
    expect(preview.okCount).toBe(1);
    expect(preview.duplicateCount).toBe(1);
  });
});
