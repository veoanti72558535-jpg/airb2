import { describe, it, expect } from 'vitest';
import {
  TEMPLATE_DESCRIPTORS,
  SOURCE_GUIDES,
  makeChairgunEliteTemplate,
  makeGenericTemplate,
  makeMeroTemplate,
  makeStrelokProTemplate,
  makeTemplate,
  templateToJson,
  type TemplateKind,
} from './templates';
import { validateUserCase } from './user-case-schema';
import type { UserCrossValidationCase } from './user-case-schema';

const ALL_KINDS: TemplateKind[] = ['chairgun-elite', 'strelok-pro', 'mero', 'generic'];

describe('cross-validation/templates — schema validity', () => {
  for (const kind of ALL_KINDS) {
    it(`template "${kind}" passes the Zod schema`, () => {
      const tpl = makeTemplate(kind);
      const result = validateUserCase(tpl);
      if (!result.ok) {
        // Expose les issues en clair pour debug si jamais le schéma change.
        // eslint-disable-next-line no-console
        console.error(`[${kind}] issues:`, result.issues);
      }
      expect(result.ok).toBe(true);
    });

    it(`template "${kind}" round-trips through JSON parse`, () => {
      const json = templateToJson(kind);
      const reparsed = JSON.parse(json);
      expect(validateUserCase(reparsed).ok).toBe(true);
    });
  }
});

describe('cross-validation/templates — no invented external data', () => {
  // Aucune ligne de référence ne doit contenir un drop / velocity / tof /
  // windDrift / energy renseigné. C'est la garantie écrite : un template
  // n'est PAS un cas réel.
  for (const kind of ALL_KINDS) {
    it(`template "${kind}" leaves every reference row metric undefined`, () => {
      const tpl = makeTemplate(kind);
      for (const ref of tpl.references) {
        for (const row of ref.rows) {
          expect(row.drop).toBeUndefined();
          expect(row.velocity).toBeUndefined();
          expect(row.tof).toBeUndefined();
          expect(row.windDrift).toBeUndefined();
          expect(row.energy).toBeUndefined();
        }
      }
    });
  }
});

describe('cross-validation/templates — source binding', () => {
  it('ChairGun template targets chairgun-elite', () => {
    const tpl = makeChairgunEliteTemplate();
    expect(tpl.references[0].meta.source).toBe('chairgun-elite');
  });
  it('Strelok template targets strelok-pro', () => {
    const tpl = makeStrelokProTemplate();
    expect(tpl.references[0].meta.source).toBe('strelok-pro');
  });
  it('MERO template targets mero', () => {
    const tpl = makeMeroTemplate();
    expect(tpl.references[0].meta.source).toBe('mero');
  });
  it('Generic template targets auxiliary', () => {
    const tpl = makeGenericTemplate();
    expect(tpl.references[0].meta.source).toBe('auxiliary');
  });

  it('every template includes a "template" tag for traceability', () => {
    for (const kind of ALL_KINDS) {
      const tpl: UserCrossValidationCase = makeTemplate(kind);
      expect(tpl.tags).toContain('template');
    }
  });

  it('every template defaults extractionMethod to manual-entry or documents otherwise', () => {
    for (const kind of ALL_KINDS) {
      const tpl = makeTemplate(kind);
      for (const ref of tpl.references) {
        expect(ref.meta.extractionMethod).toBe('manual-entry');
      }
    }
  });
});

describe('cross-validation/templates — descriptors & guides registry', () => {
  it('exposes one descriptor per template kind', () => {
    const kinds = TEMPLATE_DESCRIPTORS.map((d) => d.kind).sort();
    expect(kinds).toEqual([...ALL_KINDS].sort());
  });

  it('exposes guides for every external app source (chairgun, strelok, mero)', () => {
    expect(Object.keys(SOURCE_GUIDES).sort()).toEqual(
      ['chairgun-elite', 'mero', 'strelok-pro'],
    );
  });

  it('every guide section has at least one bullet (non-empty)', () => {
    for (const guide of Object.values(SOURCE_GUIDES)) {
      for (const section of guide.sections) {
        expect(section.bulletKeys.length).toBeGreaterThan(0);
      }
    }
  });
});