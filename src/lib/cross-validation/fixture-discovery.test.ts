/**
 * BUILD-C — Test E2E découverte → harness.
 *
 * Asserte que le pipeline complet
 *   filesystem → manifest → loader CSV → assembleur → harness BUILD-B
 * tient debout sur les cas réellement présents dans le repo, sans
 * inventer aucune donnée externe.
 *
 * À l'instant T (BUILD-C honnête, sans données externes fournies par
 * l'utilisateur), le seul cas présent est le pilote bootstrap
 * `case-22-pellet-18gr-270-zero30` étiqueté confiance C / source
 * `auxiliary`. Le test l'asserte explicitement pour empêcher quiconque
 * de confondre ce cas avec une vraie référence.
 */

import { describe, it, expect } from 'vitest';
import {
  loadAllCases,
  listCaseDirectories,
  loadCaseFromDirectory,
} from './fixture-discovery';
import { runCaseComparison } from './compare';

describe('fixture-discovery — découverte filesystem', () => {
  it('découvre au moins un cas dans le repo', () => {
    const dirs = listCaseDirectories();
    expect(dirs.length).toBeGreaterThan(0);
  });

  it('charge chaque cas découvert sans lever', () => {
    const cases = loadAllCases();
    expect(cases.length).toBeGreaterThan(0);
    for (const { case: c } of cases) {
      expect(c.id).toBeTruthy();
      expect(c.references.length).toBeGreaterThan(0);
      for (const ref of c.references) {
        expect(ref.rows.length).toBeGreaterThan(0);
        expect(['A', 'B', 'C']).toContain(ref.meta.confidence);
      }
    }
  });
});

describe('fixture-discovery — pipeline E2E avec harness BUILD-B', () => {
  it('exécute le harness sur tous les cas et produit un statut structuré', () => {
    const cases = loadAllCases();
    for (const { case: c } of cases) {
      const result = runCaseComparison(c);
      expect(result.caseId).toBe(c.id);
      expect(result.perReference.length).toBe(c.references.length);
      expect(['PASS', 'INDICATIVE', 'FAIL']).toContain(result.status);
    }
  });

  it('cas pilote bootstrap (auxiliary, confiance C) ne peut JAMAIS être PASS', () => {
    // Garde-fou anti-régression : tant qu'aucune donnée externe RÉELLE
    // (ChairGun/Strelok/MERO confiance A/B) n'est saisie, le seul cas
    // présent reste un bootstrap synthétique. Il doit être classé soit
    // INDICATIVE (confiance C, mais valeurs proches) soit FAIL (chiffres
    // approximatifs hors tolérance) — JAMAIS PASS. Toute promotion en
    // PASS = quelqu'un a maquillé un bootstrap en validation forte.
    const cases = loadAllCases();
    const bootstrap = cases.find(
      (c) => c.case.id === 'case-22-pellet-18gr-270-zero30',
    );
    expect(bootstrap).toBeDefined();
    if (!bootstrap) return;

    const onlyConfidenceC = bootstrap.case.references.every(
      (r) => r.meta.confidence === 'C',
    );
    const onlyAuxiliary = bootstrap.case.references.every(
      (r) => r.meta.source === 'auxiliary',
    );
    expect(onlyConfidenceC).toBe(true);
    expect(onlyAuxiliary).toBe(true);

    const result = runCaseComparison(bootstrap.case);
    expect(result.status).not.toBe('PASS');
    expect(['INDICATIVE', 'FAIL']).toContain(result.status);
  });
});

describe('fixture-discovery — robustesse', () => {
  it('listCaseDirectories rend [] sur racine inexistante', () => {
    expect(listCaseDirectories('/tmp/__does_not_exist__/cv')).toEqual([]);
  });

  it('loadCaseFromDirectory lève si case.json manque', () => {
    expect(() => loadCaseFromDirectory('/tmp/__does_not_exist__/cv/x')).toThrow(
      /case\.json/,
    );
  });
});
