/**
 * Cross-validation module — BUILD-A.
 * Public surface re-exported here for ergonomic imports elsewhere.
 */

export type {
  CrossValidationCase,
  CrossValidationConfidence,
  CrossValidationExtractionMethod,
  CrossValidationSource,
  ExternalReference,
  ExternalReferenceRow,
  ReferenceMeta,
} from './types';
export { CSV_COLUMN_ALIASES, CSV_REQUIRED_COLUMNS } from './types';

export {
  CsvLoaderError,
  parseExternalReferenceCsv,
  type LoaderResult,
  type LoaderWarning,
} from './loader';

export {
  assembleCrossValidationCase,
  type AssembleCaseInput,
  type AssembleReferenceInput,
  type AssembledCase,
} from './case-loader';

export {
  DEFAULT_TOLERANCES,
  isWithinTolerance,
  type ComparableMetric,
  type MetricTolerance,
} from './tolerances';

export {
  compareReference,
  runCaseComparison,
  type CaseComparisonResult,
  type ComparisonStatus,
  type ComparisonWarning,
  type CompareOptions,
  type LineComparison,
  type MetricComparison,
  type MetricSummary,
  type ReferenceComparisonResult,
} from './compare';

// BUILD-C bis — schéma utilisateur + persistance locale (UI-friendly).
export {
  makeEmptyReferenceRow,
  makeEmptyUserCase,
  makeEmptyUserReference,
  mapUserCaseToCrossValidationCase,
  parseUserCaseJson,
  validateUserCase,
  type UserCrossValidationCase,
  type UserInputs,
  type UserReference,
  type UserReferenceMeta,
  type UserReferenceRow,
  type ValidationFailure,
  type ValidationIssue,
  type ValidationResult,
  type ValidationSuccess,
} from './user-case-schema';

export {
  USER_CASES_STORAGE_KEY,
  userCaseRepo,
  type CreateResult,
  type StoredUserCase,
} from './user-case-repo';

// BUILD — Quick paste import helper (TSV / CSV / SCSV).
export {
  mergeRows,
  parsePastedRows,
  type PasteImportResult,
  type PasteSeparator,
} from './paste-import';

// BUILD — Templates JSON + guides de saisie source-spécifiques.
export {
  SOURCE_GUIDES,
  TEMPLATE_DESCRIPTORS,
  makeChairgunEliteTemplate,
  makeGenericTemplate,
  makeMeroTemplate,
  makeStrelokProTemplate,
  makeTemplate,
  templateToJson,
  type SourceGuide,
  type SourceGuideSection,
  type TemplateDescriptor,
  type TemplateKind,
} from './templates';

// NOTE: `fixture-discovery` n'est PAS ré-exporté ici. Il importe
// `node:fs` et n'est utilisable que côté tests / runner Node. L'importer
// ici casserait le bundle navigateur. Les consommateurs Node l'importent
// directement : `import { loadAllCases } from '@/lib/cross-validation/fixture-discovery'`.

// NOTE: `golden-validator` n'est PAS ré-exporté ici pour la même raison
// (il dépend de `fixture-discovery` → `node:fs`). Importer côté Node :
// `import { validateGoldenCases } from '@/lib/cross-validation/golden-validator'`.