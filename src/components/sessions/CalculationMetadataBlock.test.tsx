import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { I18nProvider } from '@/lib/i18n';
import { CalculationMetadataBlock } from '@/components/sessions/CalculationMetadataBlock';
import type { Session, DragModel } from '@/lib/types';

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 'm', name: 'Meta',
    input: {
      muzzleVelocity: 280, bc: 0.025, projectileWeight: 18,
      sightHeight: 50, zeroRange: 30, maxRange: 50, rangeStep: 10,
      weather: {
        temperature: 15, humidity: 50, pressure: 1013, altitude: 0,
        windSpeed: 0, windAngle: 0, source: 'manual', timestamp: '',
      },
    },
    results: [],
    tags: [],
    favorite: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    profileId: 'legacy',
    cdProvenance: 'legacy-piecewise',
    dragLawEffective: 'G1',
    dragLawRequested: 'G1',
    calculatedAt: '2026-01-01T00:00:00Z',
    calculatedAtSource: 'frozen',
    metadataInferred: false,
    ...overrides,
  };
}

function renderBlock(session: Session) {
  return render(
    <I18nProvider>
      <TooltipProvider>
        <CalculationMetadataBlock session={session} defaultOpen />
      </TooltipProvider>
    </I18nProvider>,
  );
}

describe('CalculationMetadataBlock', () => {
  it('shows "Données partielles" when metadataInferred is true', () => {
    renderBlock(makeSession({ metadataInferred: true, calculatedAtSource: 'inferred-from-updatedAt' }));
    expect(screen.getByText(/Données partielles|Partial data/i)).toBeInTheDocument();
  });

  it('does not show partial-data line when metadata is frozen', () => {
    renderBlock(makeSession({ metadataInferred: false }));
    expect(screen.queryByText(/Données partielles|Partial data/i)).not.toBeInTheDocument();
  });

  it.each<DragModel>(['RA4', 'GA2', 'SLG0', 'SLG1'])(
    'never leaks internal MERO drag law %s — strips to "Custom"',
    (law) => {
      renderBlock(makeSession({ dragLawEffective: law, dragLawRequested: law }));
      expect(screen.queryByText(law)).not.toBeInTheDocument();
      // "Custom" appears at least once (effective + requested).
      expect(screen.getAllByText('Custom').length).toBeGreaterThan(0);
    },
  );

  it('renders public drag laws verbatim', () => {
    renderBlock(makeSession({ dragLawEffective: 'G7', dragLawRequested: 'G7' }));
    expect(screen.getAllByText('G7').length).toBeGreaterThan(0);
  });
});
