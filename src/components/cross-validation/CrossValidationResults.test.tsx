/**
 * Tests UI — `CrossValidationResults`.
 *
 * Le composant est purement présentationnel : on lui injecte des
 * `CaseComparisonResult` fabriqués à la main (pas d'appel moteur), pour
 * vérifier qu'il rend honnêtement chaque branche du modèle.
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { I18nProvider } from '@/lib/i18n';
import { CrossValidationResults } from './CrossValidationResults';
import type { CaseComparisonResult } from '@/lib/cross-validation';
import { DEFAULT_TOLERANCES } from '@/lib/cross-validation';

function renderWithI18n(ui: React.ReactElement) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

function makeResult(overrides: Partial<CaseComparisonResult> = {}): CaseComparisonResult {
  return {
    caseId: 'demo-case',
    status: 'PASS',
    perReference: [],
    ...overrides,
  };
}

describe('CrossValidationResults — global summary', () => {
  it('renders consolidated status and case title', () => {
    const result = makeResult({
      status: 'PASS',
      perReference: [
        {
          caseId: 'demo-case',
          source: 'chairgun',
          version: 'Elite 1.x',
          confidence: 'A',
          status: 'PASS',
          lines: [],
          metricSummaries: [],
          warnings: [],
        },
      ],
    });
    renderWithI18n(<CrossValidationResults result={result} caseTitle="My case" />);
    // Statut consolidé
    expect(screen.getAllByTestId('cv-status-PASS').length).toBeGreaterThan(0);
    expect(screen.getByText(/My case/)).toBeInTheDocument();
    // Compteurs
    expect(screen.getByText('PASS').nextSibling?.textContent ?? '').toMatch(/1/);
  });

  it('shows zero references state honestly', () => {
    const result = makeResult({ status: 'INDICATIVE', perReference: [] });
    renderWithI18n(<CrossValidationResults result={result} />);
    // Aucun bloc référence rendu
    expect(screen.queryByTestId('cv-results-ref-0')).toBeNull();
    // Message vide visible
    expect(
      screen.getByText(/Aucune référence|No reference in the result/i),
    ).toBeInTheDocument();
  });
});

describe('CrossValidationResults — per-reference rendering', () => {
  const failResult = makeResult({
    status: 'FAIL',
    perReference: [
      {
        caseId: 'demo-case',
        source: 'strelok-pro',
        version: '6.x',
        confidence: 'B',
        status: 'FAIL',
        lines: [
          {
            range: 50,
            engineRowFound: true,
            metrics: [
              {
                metric: 'drop',
                engineValue: -25,
                referenceValue: -20,
                absoluteDelta: -5,
                relativeDelta: -0.25,
                withinTolerance: false,
                tolerance: DEFAULT_TOLERANCES.drop,
              },
              {
                metric: 'velocity',
                engineValue: 270,
                referenceValue: 269,
                absoluteDelta: 1,
                relativeDelta: 1 / 269,
                withinTolerance: true,
                tolerance: DEFAULT_TOLERANCES.velocity,
              },
            ],
            metricsMissingInReference: ['tof', 'windDrift', 'energy'],
          },
        ],
        metricSummaries: [
          { metric: 'drop', count: 1, failures: 1, maxAbsDelta: 5, maxRelDelta: 0.25 },
          { metric: 'velocity', count: 1, failures: 0, maxAbsDelta: 1, maxRelDelta: 1 / 269 },
        ],
        warnings: [],
      },
    ],
  });

  it('renders per-reference badges (source, version, confidence, status)', () => {
    renderWithI18n(<CrossValidationResults result={failResult} />);
    const block = screen.getByTestId('cv-results-ref-0');
    expect(within(block).getByText('strelok-pro')).toBeInTheDocument();
    expect(within(block).getByText('v6.x')).toBeInTheDocument();
    // Confidence label includes confidence letter
    expect(within(block).getByText(/B$/)).toBeInTheDocument();
    // FAIL status badge present (on the trigger header)
    expect(within(block).getAllByTestId('cv-status-FAIL').length).toBeGreaterThan(0);
  });

  it('renders metric summary rows with failure highlighted', () => {
    renderWithI18n(<CrossValidationResults result={failResult} />);
    expect(screen.getByTestId('cv-metric-summary-drop')).toBeInTheDocument();
    expect(screen.getByTestId('cv-metric-summary-velocity')).toBeInTheDocument();
  });

  it('renders per-distance line and indicates failure on the failing metric', () => {
    renderWithI18n(<CrossValidationResults result={failResult} />);
    // FAIL block is open by default → drop line at 50m exists
    expect(screen.getByTestId('cv-line-drop-50')).toBeInTheDocument();
    expect(screen.getByTestId('cv-line-velocity-50')).toBeInTheDocument();
  });
});

describe('CrossValidationResults — honesty wrt missing/partial data', () => {
  it('renders a missing-engine-row line as a warning row', () => {
    const result = makeResult({
      status: 'INDICATIVE',
      perReference: [
        {
          caseId: 'demo-case',
          source: 'chairgun',
          version: 'Elite 1.x',
          confidence: 'A',
          status: 'INDICATIVE',
          lines: [
            {
              range: 73,
              engineRowFound: false,
              metrics: [],
              metricsMissingInReference: [],
            },
          ],
          metricSummaries: [],
          warnings: [
            {
              kind: 'no-engine-row-at-range',
              detail: 'No engine row at range=73 m (rangeStep=10)',
            },
          ],
        },
      ],
    });
    renderWithI18n(<CrossValidationResults result={result} />);
    // Warnings block visible (block opens manually via click)
    fireEvent.click(screen.getByTestId('cv-results-ref-0').querySelector('button')!);
    expect(
      screen.getByText(/No engine row at range=73 m|range=73/i),
    ).toBeInTheDocument();
  });

  it('shows confidence-C note explicitly', () => {
    const result = makeResult({
      status: 'INDICATIVE',
      perReference: [
        {
          caseId: 'demo-case',
          source: 'auxiliary',
          version: 'JBM',
          confidence: 'C',
          status: 'INDICATIVE',
          lines: [],
          metricSummaries: [],
          warnings: [],
        },
      ],
    });
    renderWithI18n(<CrossValidationResults result={result} />);
    // Open the collapsible to reveal the note
    fireEvent.click(screen.getByTestId('cv-results-ref-0').querySelector('button')!);
    expect(screen.getByTestId('cv-results-ref-0-confC-note')).toBeInTheDocument();
  });

  it('handles a metric absent on the reference side without inventing values', () => {
    const result = makeResult({
      status: 'PASS',
      perReference: [
        {
          caseId: 'demo-case',
          source: 'chairgun',
          version: 'Elite 1.x',
          confidence: 'A',
          status: 'PASS',
          lines: [
            {
              range: 50,
              engineRowFound: true,
              metrics: [
                {
                  metric: 'drop',
                  engineValue: -20,
                  referenceValue: -20,
                  absoluteDelta: 0,
                  relativeDelta: 0,
                  withinTolerance: true,
                  tolerance: DEFAULT_TOLERANCES.drop,
                },
              ],
              metricsMissingInReference: ['velocity', 'tof', 'windDrift', 'energy'],
            },
          ],
          metricSummaries: [
            { metric: 'drop', count: 1, failures: 0, maxAbsDelta: 0, maxRelDelta: 0 },
          ],
          warnings: [],
        },
      ],
    });
    renderWithI18n(<CrossValidationResults result={result} />);
    // Open the collapsible (PASS = closed by default)
    fireEvent.click(screen.getByTestId('cv-results-ref-0').querySelector('button')!);
    // Only the `drop` line is built — no fake `velocity` row exists
    expect(screen.getByTestId('cv-line-drop-50')).toBeInTheDocument();
    expect(screen.queryByTestId('cv-line-velocity-50')).toBeNull();
  });
});

describe('CrossValidationResults — actions', () => {
  it('invokes onClose and onExportJson callbacks', () => {
    const result = makeResult({ status: 'INDICATIVE', perReference: [] });
    let closed = false;
    let exported = false;
    renderWithI18n(
      <CrossValidationResults
        result={result}
        onClose={() => {
          closed = true;
        }}
        onExportJson={() => {
          exported = true;
        }}
      />,
    );
    fireEvent.click(screen.getByTestId('cv-results-export'));
    fireEvent.click(screen.getByTestId('cv-results-close'));
    expect(exported).toBe(true);
    expect(closed).toBe(true);
  });
});