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

// NOTE: `fixture-discovery` n'est PAS ré-exporté ici. Il importe
// `node:fs` et n'est utilisable que côté tests / runner Node. L'importer
// ici casserait le bundle navigateur. Les consommateurs Node l'importent
// directement : `import { loadAllCases } from '@/lib/cross-validation/fixture-discovery'`.