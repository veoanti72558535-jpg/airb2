/**
 * Cross-validation — BUILD-A — Case assembler.
 *
 * Compose un `CrossValidationCase` à partir de morceaux fournis par
 * l'appelant (qui s'occupe de la lecture I/O — fixture, fetch, fs node
 * en test). Cela maintient le module pur et compatible navigateur, sans
 * dépendance à `fs` ou `node:path`.
 *
 * Le futur runner BUILD-B utilisera Vite glob imports pour rassembler
 * les fixtures ; les tests utilisent fs. Ici on ne tranche pas.
 */

import { parseExternalReferenceCsv, type LoaderResult } from './loader';
import type {
  CrossValidationCase,
  ExternalReference,
  ReferenceMeta,
} from './types';
import type { BallisticInput } from '@/lib/types';

export interface AssembleReferenceInput {
  meta: ReferenceMeta;
  csv: string;
}

export interface AssembleCaseInput {
  id: string;
  description: string;
  tags?: string[];
  inputs: BallisticInput;
  references: AssembleReferenceInput[];
  notes?: string;
}

export interface AssembledCase {
  case: CrossValidationCase;
  /** Per-reference loader warnings, keyed by reference index. */
  warningsByReference: Array<LoaderResult['warnings']>;
}

/**
 * Assemble a case from already-loaded raw materials. Throws if any CSV
 * is unparseable or if no reference is provided.
 */
export function assembleCrossValidationCase(
  input: AssembleCaseInput,
): AssembledCase {
  if (!input.references || input.references.length === 0) {
    throw new Error(
      `Case "${input.id}" has no references — at least one is required`,
    );
  }

  const references: ExternalReference[] = [];
  const warningsByReference: Array<LoaderResult['warnings']> = [];

  for (const ref of input.references) {
    const parsed = parseExternalReferenceCsv(ref.csv);
    references.push({ meta: ref.meta, rows: parsed.rows });
    warningsByReference.push(parsed.warnings);
  }

  const cvCase: CrossValidationCase = {
    id: input.id,
    description: input.description,
    tags: input.tags,
    inputs: input.inputs,
    references,
    notes: input.notes,
  };

  return { case: cvCase, warningsByReference };
}