/**
 * Tests dédiés à l'extension bullets4 de la pipeline d'import projectile.
 *
 * Couvre :
 *   - propagation des nouveaux champs (diameterMm/In, weightUnit, bcG1/G7,
 *     bcZones, lengthMm/In, sourceDbId, sourceTable, caliberLabel) ;
 *   - dérivation automatique du `caliber` quand seul `diameterIn` est
 *     fourni (note `caliber-derived-from-diameter`) ;
 *   - remap `bullets4-db` → `json-user` côté `importedFrom`, à la fois
 *     quand la source utilisateur est `bullets4-db` et quand la source
 *     utilisateur est `json-user` mais que le payload est tagué ;
 *   - acceptation et stockage de `bcZones` (sans exploitation moteur) ;
 *   - rétrocompatibilité : un payload V1 minimal continue de produire un
 *     item `ok` sans warnings.
 */

import { describe, it, expect } from 'vitest';
import { importProjectilesPreview } from './import-pipeline';

describe('import projectile — extension bullets4', () => {
  it('propagates all new bullets4 fields verbatim', () => {
    const preview = importProjectilesPreview(
      [
        {
          brand: 'JSB',
          model: 'Hades',
          weight: 15.89,
          weightUnit: 'gr',
          weightGrains: 15.89,
          weightGrams: 1.03,
          bc: 0.021,
          bcModel: 'G1',
          bcG1: 0.021,
          bcG7: 0.011,
          caliber: '.22',
          caliberLabel: '.22 (5.5mm)',
          diameterMm: 5.5,
          diameterIn: 0.2165,
          lengthMm: 8.4,
          lengthIn: 0.331,
          projectileType: 'pellet',
          sourceDbId: 'b4_12345',
          sourceTable: 'bullets4_pellets',
        },
      ],
      { source: 'json-user' },
    );
    expect(preview.okCount).toBe(1);
    const data = preview.items[0].data!;
    expect(data.weightUnit).toBe('gr');
    expect(data.weightGrains).toBe(15.89);
    expect(data.weightGrams).toBe(1.03);
    expect(data.bcG1).toBe(0.021);
    expect(data.bcG7).toBe(0.011);
    expect(data.caliberLabel).toBe('.22 (5.5mm)');
    expect(data.diameterMm).toBe(5.5);
    expect(data.diameterIn).toBe(0.2165);
    expect(data.lengthMm).toBe(8.4);
    expect(data.lengthIn).toBe(0.331);
    expect(data.sourceDbId).toBe('b4_12345');
    expect(data.sourceTable).toBe('bullets4_pellets');
  });

  it('accepts new projectileType values bb and dart', () => {
    const preview = importProjectilesPreview(
      [
        { brand: 'X', model: 'BB', weight: 5.1, bc: 0.005, caliber: '.177', projectileType: 'bb' },
        { brand: 'X', model: 'Dart', weight: 8, bc: 0.01, caliber: '.22', projectileType: 'dart' },
      ],
      { source: 'json-user' },
    );
    expect(preview.okCount).toBe(2);
    expect(preview.items[0].data?.projectileType).toBe('bb');
    expect(preview.items[1].data?.projectileType).toBe('dart');
  });

  it('accepts and stores bcZones (engine does not consume them yet)', () => {
    const preview = importProjectilesPreview(
      [
        {
          brand: 'X',
          model: 'Y',
          weight: 30,
          bc: 0.05,
          caliber: '.30',
          bcZones: [
            { bc: 0.062, minVelocity: 800 },
            { bc: 0.058, minVelocity: 600 },
            { bc: 0.052, minVelocity: 400 },
          ],
        },
      ],
      { source: 'json-user' },
    );
    expect(preview.okCount).toBe(1);
    expect(preview.items[0].data?.bcZones).toEqual([
      { bc: 0.062, minVelocity: 800 },
      { bc: 0.058, minVelocity: 600 },
      { bc: 0.052, minVelocity: 400 },
    ]);
  });

  it('preserves bcZones=null distinct from absent', () => {
    const preview = importProjectilesPreview(
      [{ brand: 'X', model: 'Y', weight: 30, bc: 0.05, caliber: '.30', bcZones: null }],
      { source: 'json-user' },
    );
    expect(preview.okCount).toBe(1);
    expect(preview.items[0].data?.bcZones).toBeNull();
  });

  it('derives caliber from diameterIn when caliber is missing', () => {
    const preview = importProjectilesPreview(
      [
        {
          brand: 'JSB',
          model: 'Match',
          weight: 8.4,
          bc: 0.018,
          diameterIn: 0.177,
          // pas de caliber
        },
      ],
      { source: 'json-user' },
    );
    expect(preview.sanitizedCount).toBe(1);
    const item = preview.items[0];
    expect(item.status).toBe('sanitized');
    expect(item.data?.caliber).toBe('.17');
    expect(item.notes?.some(n => n.code === 'caliber-derived-from-diameter')).toBe(true);
  });

  it('derives caliber from diameterMm when neither caliber nor diameterIn are present', () => {
    const preview = importProjectilesPreview(
      [{ brand: 'X', model: 'Y', weight: 18, bc: 0.025, diameterMm: 5.5 }],
      { source: 'json-user' },
    );
    expect(preview.sanitizedCount).toBe(1);
    expect(preview.items[0].data?.caliber).toBe('.22');
  });

  it('leaves caliber empty (no rejection) when diameter cannot be derived', () => {
    const preview = importProjectilesPreview(
      [{ brand: 'X', model: 'Y', weight: 18, bc: 0.025 }],
      { source: 'json-user' },
    );
    // Pas rejeté, juste un caliber vide — l'UI complétera.
    expect(preview.rejectedCount).toBe(0);
    expect(preview.items[0].data?.caliber).toBe('');
  });

  it('does NOT override an explicit caliber even when diameterIn is present', () => {
    const preview = importProjectilesPreview(
      [
        {
          brand: 'X',
          model: 'Y',
          weight: 18,
          bc: 0.025,
          caliber: '.22 LR',
          diameterIn: 0.224, // dérivation possible mais ignorée
        },
      ],
      { source: 'json-user' },
    );
    expect(preview.okCount).toBe(1);
    expect(preview.items[0].data?.caliber).toBe('.22 LR');
    expect(preview.items[0].notes ?? []).toEqual([]);
  });

  it('remaps source=bullets4-db to importedFrom=json-user with a sanitisation note', () => {
    const preview = importProjectilesPreview(
      [{ brand: 'X', model: 'Y', weight: 18, bc: 0.025, caliber: '.22' }],
      { source: 'bullets4-db' },
    );
    expect(preview.sanitizedCount).toBe(1);
    const item = preview.items[0];
    expect(item.data?.importedFrom).toBe('json-user');
    expect(item.notes?.some(n => n.code === 'imported-from-remapped')).toBe(true);
  });

  it('remaps payload-tagged importedFrom=bullets4-db to json-user even when source=json-user', () => {
    const preview = importProjectilesPreview(
      [
        {
          brand: 'X',
          model: 'Y',
          weight: 18,
          bc: 0.025,
          caliber: '.22',
          importedFrom: 'bullets4-db',
        },
      ],
      { source: 'json-user' },
    );
    expect(preview.sanitizedCount).toBe(1);
    expect(preview.items[0].data?.importedFrom).toBe('json-user');
  });

  it('combines caliber-derive + bullets4-db remap in a single sanitized item', () => {
    const preview = importProjectilesPreview(
      [
        {
          brand: 'X',
          model: 'Y',
          weight: 18,
          bc: 0.025,
          diameterIn: 0.224,
          sourceDbId: 'b4_42',
          sourceTable: 'bullets4_pellets',
        },
      ],
      { source: 'bullets4-db' },
    );
    const item = preview.items[0];
    expect(item.status).toBe('sanitized');
    expect(item.data?.caliber).toBe('.224');
    expect(item.data?.importedFrom).toBe('json-user');
    expect(item.data?.sourceDbId).toBe('b4_42');
    expect(item.data?.sourceTable).toBe('bullets4_pellets');
    const codes = (item.notes ?? []).map(n => n.code).sort();
    expect(codes).toEqual(['caliber-derived-from-diameter', 'imported-from-remapped']);
  });

  it('remains backward compatible : V1 minimal payload stays "ok" without notes', () => {
    const preview = importProjectilesPreview(
      [{ brand: 'JSB', model: 'Hades', weight: 15.89, bc: 0.021, caliber: '.22' }],
      { source: 'json-user' },
    );
    expect(preview.okCount).toBe(1);
    expect(preview.sanitizedCount).toBe(0);
    expect(preview.items[0].notes ?? []).toEqual([]);
  });
});
