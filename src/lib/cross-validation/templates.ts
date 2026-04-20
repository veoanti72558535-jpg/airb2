/**
 * BUILD — Templates JSON pour démarrer rapidement un cas de validation
 * comparative externe (ChairGun Elite / Strelok Pro / MERO / générique).
 *
 * Règles d'or :
 *  - AUCUNE donnée numérique de référence externe n'est inventée. Les
 *    `rows` de chaque référence ne contiennent QUE le squelette : une
 *    ligne vide avec `range: 0` à éditer (le schéma impose `min(1)`).
 *  - Les `inputs` (projectile / vitesse / atmosphère / etc.) utilisent
 *    des **placeholders neutres et plausibles** côté airgun .22, choisis
 *    pour que le template VALIDE le schéma Zod sans frottement. Ils
 *    DOIVENT être édités par l'opérateur avant toute comparaison réelle.
 *  - Chaque template documente son intention dans `notes` + `comment`.
 *
 * Toute référence à des numéros de version applicative ("ChairGun Elite",
 * "Strelok Pro 6.x", "MERO Mobile") reste générique : on ne s'engage sur
 * aucun build précis tant que l'opérateur ne l'a pas relevé.
 */

import type {
  UserCrossValidationCase,
  UserReference,
} from './user-case-schema';

export type TemplateKind = 'chairgun-elite' | 'strelok-pro' | 'mero' | 'generic';

export interface TemplateDescriptor {
  kind: TemplateKind;
  /** Libellé court (UI). */
  label: string;
  /** Phrase d'aide affichée à côté du bouton. */
  hint: string;
  /** Nom de fichier suggéré. */
  filenameSuggestion: string;
}

export const TEMPLATE_DESCRIPTORS: TemplateDescriptor[] = [
  {
    kind: 'chairgun-elite',
    label: 'ChairGun Elite',
    hint: 'Squelette préconfiguré pour relever une table ChairGun Elite.',
    filenameSuggestion: 'chairgun-elite.template.json',
  },
  {
    kind: 'strelok-pro',
    label: 'Strelok Pro',
    hint: 'Squelette préconfiguré pour relever une table Strelok Pro.',
    filenameSuggestion: 'strelok-pro.template.json',
  },
  {
    kind: 'mero',
    label: 'MERO',
    hint: 'Squelette préconfiguré pour relever une sortie MERO.',
    filenameSuggestion: 'mero.template.json',
  },
  {
    kind: 'generic',
    label: 'Générique',
    hint: 'Cas vide complet — aucune source pré-sélectionnée.',
    filenameSuggestion: 'generic.template.json',
  },
];

/**
 * Inputs squelette communs aux templates. Choix `.22 pellet 18 gr` à
 * 280 m/s — combinaison la plus représentative côté PCP airgun pour
 * démarrer un relevé. AUCUN engagement physique : c'est juste un
 * placeholder qui passe la validation Zod.
 */
function placeholderInputs(): UserCrossValidationCase['inputs'] {
  return {
    projectileName: 'TO FILL — projectile name',
    projectileType: 'pellet',
    caliber: '.22',
    diameterMm: 5.5,
    weightGrains: 18,
    bc: 0.025,
    bcModel: 'GA',
    muzzleVelocity: 280,
    sightHeight: 40,
    zeroDistance: 30,
    rangeMax: 100,
    rangeStep: 10,
    rangeStart: 0,
    // Atmosphère intentionnellement vide → le mapper retombera sur ICAO
    // standard. À renseigner dès que la source documente l'atmosphère.
    sourceUnitsNote: 'TO FILL — units actually displayed by the source',
    comment:
      'Placeholder values — replace with what the external source actually shows.',
  };
}

/**
 * Construit la référence squelette d'un template — une seule ligne vide
 * (range=0, aucune métrique). C'est volontaire : l'opérateur ajoutera
 * une ligne par distance effectivement lue dans la source.
 */
function placeholderReference(
  source: UserReference['meta']['source'],
  versionPlaceholder: string,
  notes: string,
): UserReference {
  return {
    meta: {
      source,
      version: versionPlaceholder,
      confidence: 'B',
      extractionMethod: 'manual-entry',
      extractedAt: new Date().toISOString().slice(0, 10),
      assumptions: [],
      notes,
    },
    rows: [{ range: 0 }],
  };
}

function baseCase(
  caseIdSuffix: string,
  title: string,
  references: UserReference[],
  notes: string,
): UserCrossValidationCase {
  return {
    caseId: `template-${caseIdSuffix}`,
    title,
    description:
      'Template — replace placeholders with actual data. No external value is invented.',
    tags: ['template'],
    inputs: placeholderInputs(),
    references,
    notes,
    schemaVersion: 1,
  };
}

export function makeChairgunEliteTemplate(): UserCrossValidationCase {
  return baseCase(
    'chairgun-elite',
    'Template — ChairGun Elite (.22 pellet)',
    [
      placeholderReference(
        'chairgun-elite',
        'ChairGun Elite — TO FILL (build/version)',
        [
          'TO FILL — note ChairGun version + drag model selected.',
          'Record only rows actually displayed by ChairGun.',
          'Confirm units before entry (m, mm, m/s, hPa abs).',
        ].join(' '),
      ),
    ],
    [
      'ChairGun Elite template.',
      '— Cross-check projectile, BC, muzzle velocity, sight height and zero range against the source.',
      '— Do NOT fill any metric you cannot read directly.',
      '— `extractedAt` set to today; adjust if you re-import an older capture.',
    ].join('\n'),
  );
}

export function makeStrelokProTemplate(): UserCrossValidationCase {
  return baseCase(
    'strelok-pro',
    'Template — Strelok Pro (.22 pellet)',
    [
      placeholderReference(
        'strelok-pro',
        'Strelok Pro — TO FILL (build/version)',
        [
          'TO FILL — note Strelok build, store source, mod state.',
          'Note exact projectile entry name + BC model used (G1/G7/GA…).',
          'Wind angle convention: clarify clock vs degrees before reading.',
        ].join(' '),
      ),
    ],
    [
      'Strelok Pro template.',
      '— Confirm whether the install is the official Play Store / App Store version.',
      '— Strelok exposes wind drift in cm or MOA depending on settings — convert to mm if needed.',
      '— Do NOT extrapolate intermediate distances; record only what Strelok actually shows.',
    ].join('\n'),
  );
}

export function makeMeroTemplate(): UserCrossValidationCase {
  return baseCase(
    'mero',
    'Template — MERO (.22 pellet)',
    [
      placeholderReference(
        'mero',
        'MERO — TO FILL (build/version)',
        [
          'TO FILL — note MERO build + selected drag law / profile.',
          'Document any non-standard convention (wind, atmosphere reference).',
          'Record only metrics MERO actually displays — no inferred coefficients.',
        ].join(' '),
      ),
    ],
    [
      'MERO template.',
      '— Identify the drag law / profile in use (e.g. GA, GS, custom). Add it to `assumptions`.',
      '— Pressure: clarify station vs sea-level before recording.',
      '— MERO is NOT yet exposed as an engine profile in AirBallistik (see mem://constraints/mero-exposure-gates). Comparison is for inspection, not calibration.',
    ].join('\n'),
  );
}

export function makeGenericTemplate(): UserCrossValidationCase {
  return baseCase(
    'generic',
    'Template — Generic external case',
    [
      placeholderReference(
        'auxiliary',
        'TO FILL — external source name + version',
        'Generic skeleton — set source, confidence and extraction method explicitly.',
      ),
    ],
    [
      'Generic template.',
      '— Use this when none of ChairGun / Strelok / MERO matches the source.',
      '— Set `meta.source` to the closest enum value or `auxiliary` and document precisely in notes.',
    ].join('\n'),
  );
}

/** Factory dispatch — pure, testable. */
export function makeTemplate(kind: TemplateKind): UserCrossValidationCase {
  switch (kind) {
    case 'chairgun-elite':
      return makeChairgunEliteTemplate();
    case 'strelok-pro':
      return makeStrelokProTemplate();
    case 'mero':
      return makeMeroTemplate();
    case 'generic':
    default:
      return makeGenericTemplate();
  }
}

/** Sérialise le template en JSON formaté (2 spaces) pour le téléchargement. */
export function templateToJson(kind: TemplateKind): string {
  return JSON.stringify(makeTemplate(kind), null, 2);
}

// -----------------------------------------------------------------------------
// Guides de saisie source-spécifiques
// -----------------------------------------------------------------------------

export interface SourceGuideSection {
  /** Clé i18n du titre de section. */
  titleKey: string;
  /** Clés i18n des points (puces). */
  bulletKeys: string[];
}

export interface SourceGuide {
  kind: TemplateKind;
  /** Clé i18n du libellé court (titre du guide). */
  labelKey: string;
  sections: SourceGuideSection[];
}

/**
 * Définition statique des guides de saisie. Tout passe par i18n — aucun
 * texte humain n'est codé en dur ici. Les sections couvrent : inputs à
 * relever, outputs à relever, unités, limites, points critiques.
 */
export const SOURCE_GUIDES: Record<Exclude<TemplateKind, 'generic'>, SourceGuide> = {
  'chairgun-elite': {
    kind: 'chairgun-elite',
    labelKey: 'crossValidation.guide.chairgun.label',
    sections: [
      {
        titleKey: 'crossValidation.guide.section.inputs',
        bulletKeys: [
          'crossValidation.guide.chairgun.inputs.projectile',
          'crossValidation.guide.chairgun.inputs.bc',
          'crossValidation.guide.chairgun.inputs.velocity',
          'crossValidation.guide.chairgun.inputs.zeroSight',
          'crossValidation.guide.chairgun.inputs.atmosphere',
        ],
      },
      {
        titleKey: 'crossValidation.guide.section.outputs',
        bulletKeys: [
          'crossValidation.guide.chairgun.outputs.tableRows',
          'crossValidation.guide.chairgun.outputs.noFill',
        ],
      },
      {
        titleKey: 'crossValidation.guide.section.units',
        bulletKeys: ['crossValidation.guide.chairgun.units'],
      },
      {
        titleKey: 'crossValidation.guide.section.limits',
        bulletKeys: [
          'crossValidation.guide.chairgun.limits.captureSource',
          'crossValidation.guide.chairgun.limits.rangeStep',
        ],
      },
    ],
  },
  'strelok-pro': {
    kind: 'strelok-pro',
    labelKey: 'crossValidation.guide.strelok.label',
    sections: [
      {
        titleKey: 'crossValidation.guide.section.inputs',
        bulletKeys: [
          'crossValidation.guide.strelok.inputs.projectile',
          'crossValidation.guide.strelok.inputs.bcModel',
          'crossValidation.guide.strelok.inputs.modVersion',
          'crossValidation.guide.strelok.inputs.windAtmo',
        ],
      },
      {
        titleKey: 'crossValidation.guide.section.outputs',
        bulletKeys: [
          'crossValidation.guide.strelok.outputs.columns',
          'crossValidation.guide.strelok.outputs.noColumn',
        ],
      },
      {
        titleKey: 'crossValidation.guide.section.units',
        bulletKeys: ['crossValidation.guide.strelok.units'],
      },
      {
        titleKey: 'crossValidation.guide.section.limits',
        bulletKeys: [
          'crossValidation.guide.strelok.limits.windAngle',
          'crossValidation.guide.strelok.limits.assumptions',
        ],
      },
    ],
  },
  mero: {
    kind: 'mero',
    labelKey: 'crossValidation.guide.mero.label',
    sections: [
      {
        titleKey: 'crossValidation.guide.section.inputs',
        bulletKeys: [
          'crossValidation.guide.mero.inputs.dragLaw',
          'crossValidation.guide.mero.inputs.profile',
          'crossValidation.guide.mero.inputs.atmosphere',
        ],
      },
      {
        titleKey: 'crossValidation.guide.section.outputs',
        bulletKeys: [
          'crossValidation.guide.mero.outputs.displayed',
          'crossValidation.guide.mero.outputs.noInfer',
        ],
      },
      {
        titleKey: 'crossValidation.guide.section.units',
        bulletKeys: ['crossValidation.guide.mero.units'],
      },
      {
        titleKey: 'crossValidation.guide.section.limits',
        bulletKeys: [
          'crossValidation.guide.mero.limits.gate',
          'crossValidation.guide.mero.limits.assumptions',
        ],
      },
    ],
  },
};