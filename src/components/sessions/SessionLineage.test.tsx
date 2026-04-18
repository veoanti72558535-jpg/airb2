/**
 * Tranche C — SessionLineage rendering tests.
 *
 * Verifies the filiation chips: parent reference and linked-copies count.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from '@/lib/i18n';
import { SessionLineage } from './SessionLineage';
import type { Session } from '@/lib/types';

function s(id: string, name: string, derivedFrom?: string): Session {
  return {
    id, name,
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
    derivedFromSessionId: derivedFrom,
  };
}

function renderLineage(session: Session, all: Session[]) {
  return render(
    <I18nProvider>
      <MemoryRouter>
        <SessionLineage session={session} allSessions={all} />
      </MemoryRouter>
    </I18nProvider>,
  );
}

describe('SessionLineage', () => {
  it('renders nothing for a standalone session with no copies', () => {
    const { container } = renderLineage(s('a', 'A'), [s('a', 'A')]);
    expect(container.firstChild).toBeNull();
  });

  it('shows "Derived from: <name>" with a link when parent exists', () => {
    const parent = s('p', 'Original');
    const child = s('c', 'Copy', 'p');
    renderLineage(child, [parent, child]);
    expect(screen.getByText(/Derived from|Issue de/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Original' })).toBeInTheDocument();
  });

  it('marks parent as deleted when it cannot be found', () => {
    const child = s('c', 'Copy', 'missing');
    renderLineage(child, [child]);
    expect(screen.getByText(/Source session deleted|Session source supprimée/))
      .toBeInTheDocument();
  });

  it('shows linked copies count on the parent', () => {
    const parent = s('p', 'Original');
    const c1 = s('c1', 'Copy 1', 'p');
    const c2 = s('c2', 'Copy 2', 'p');
    renderLineage(parent, [parent, c1, c2]);
    expect(screen.getByText(/Linked copies|Copies liées/)).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
