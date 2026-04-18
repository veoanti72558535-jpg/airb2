/**
 * Tranche C — RecalculateDialog rendering tests.
 *
 * Focuses on the honesty contract:
 *  - same-profile case shows the "still creates a copy" note,
 *  - different-profile case shows the explicit warning,
 *  - confirm calls the store and emits the linked copy.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@/lib/i18n';
import { RecalculateDialog } from './RecalculateDialog';
import { sessionStore } from '@/lib/storage';
import type { Session } from '@/lib/types';

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 'src-1',
    name: 'Original',
    input: {
      muzzleVelocity: 280, bc: 0.025, projectileWeight: 18,
      sightHeight: 50, zeroRange: 30, maxRange: 50, rangeStep: 10,
      weather: {
        temperature: 15, humidity: 50, pressure: 1013, altitude: 0,
        windSpeed: 0, windAngle: 0, source: 'manual', timestamp: '',
      },
      dragModel: 'G1',
    },
    results: [],
    tags: [],
    favorite: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    profileId: 'legacy',
    calculatedAt: '2026-01-01T00:00:00Z',
    calculatedAtSource: 'frozen',
    metadataInferred: false,
    cdProvenance: 'legacy-piecewise',
    dragLawEffective: 'G1',
    dragLawRequested: 'G1',
    engineVersion: 1,
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
});

function renderDialog(source: Session, onCreated = vi.fn()) {
  return {
    onCreated,
    ...render(
      <I18nProvider>
        <RecalculateDialog open source={source} onOpenChange={() => {}} onCreated={onCreated} />
      </I18nProvider>,
    ),
  };
}

describe('RecalculateDialog', () => {
  it('shows the "same profile" note for a legacy source', () => {
    renderDialog(makeSession({ profileId: 'legacy' }));
    expect(
      screen.getByText(/same profile|même profil/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/may differ significantly|différer de façon significative/i))
      .not.toBeInTheDocument();
  });

  it('shows the explicit warning when source profile differs from target', () => {
    renderDialog(makeSession({ profileId: 'mero' }));
    expect(
      screen.getByText(/may differ significantly|différer de façon significative/i),
    ).toBeInTheDocument();
  });

  it('on confirm, creates a NEW session with derivedFromSessionId and never mutates the source', () => {
    const source = sessionStore.create({
      name: 'Persist',
      input: makeSession().input,
      results: [],
      tags: [],
      favorite: false,
    });
    const onCreated = vi.fn();
    render(
      <I18nProvider>
        <RecalculateDialog
          open
          source={source}
          onOpenChange={() => {}}
          onCreated={onCreated}
        />
      </I18nProvider>,
    );
    const confirm = screen.getByRole('button', {
      name: /create recalculated copy|créer une copie recalculée/i,
    });
    fireEvent.click(confirm);

    expect(onCreated).toHaveBeenCalledTimes(1);
    const created = onCreated.mock.calls[0][0] as Session;
    expect(created.id).not.toBe(source.id);
    expect(created.derivedFromSessionId).toBe(source.id);
    expect(created.metadataInferred).toBe(false);
    expect(created.calculatedAtSource).toBe('frozen');

    // Source row in storage is untouched.
    const stillThere = sessionStore.getById(source.id);
    expect(stillThere).toBeDefined();
    expect(stillThere?.derivedFromSessionId).toBeUndefined();
    expect(stillThere?.name).toBe('Persist');

    // Two sessions now.
    expect(sessionStore.getAll()).toHaveLength(2);
  });

  it('appends the localised "(recalculated)" suffix to the copy name', () => {
    const source = sessionStore.create({
      name: 'Foo',
      input: makeSession().input,
      results: [],
      tags: [],
      favorite: false,
    });
    const onCreated = vi.fn();
    render(
      <I18nProvider>
        <RecalculateDialog
          open
          source={source}
          onOpenChange={() => {}}
          onCreated={onCreated}
        />
      </I18nProvider>,
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: /create recalculated copy|créer une copie recalculée/i,
      }),
    );
    const created = onCreated.mock.calls[0][0] as Session;
    expect(created.name).toMatch(/Foo \((recalculée|recalculated)\)/);
  });
});
