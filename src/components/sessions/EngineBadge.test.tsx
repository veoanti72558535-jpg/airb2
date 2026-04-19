import { afterEach, beforeEach, describe, it, expect } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { I18nProvider } from '@/lib/i18n';
import { EngineBadge, resolveBadgeState } from '@/components/sessions/EngineBadge';
import { projectileStore, opticStore } from '@/lib/storage';
import type { Session } from '@/lib/types';

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 'test',
    name: 'Test',
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
    calculatedAt: '2026-01-01T00:00:00Z',
    calculatedAtSource: 'frozen',
    metadataInferred: false,
    cdProvenance: 'legacy-piecewise',
    dragLawEffective: 'G1',
    dragLawRequested: 'G1',
    ...overrides,
  };
}

function renderBadge(session: Session) {
  return render(
    <I18nProvider>
      <TooltipProvider>
        <EngineBadge session={session} />
      </TooltipProvider>
    </I18nProvider>,
  );
}

/**
 * Radix Tooltip ne rend son contenu qu'à l'ouverture. En jsdom, on déclenche
 * l'ouverture via `focus` sur le trigger (le pattern `pointerenter` n'est pas
 * fiable sans pointer events). `act` autour pour les state updates.
 */
function openTooltip() {
  const trigger = screen.getByLabelText(/Moteur:|Engine:/);
  act(() => {
    fireEvent.focus(trigger);
  });
}

describe('EngineBadge — variants', () => {
  it('renders Legacy badge for a modern legacy session', () => {
    renderBadge(makeSession({ profileId: 'legacy' }));
    expect(screen.getByText('Legacy')).toBeInTheDocument();
  });

  it('renders MERO beta badge for a mero session', () => {
    renderBadge(makeSession({ profileId: 'mero', cdProvenance: 'derived-p2' }));
    expect(screen.getByText('MERO beta')).toBeInTheDocument();
  });

  it('renders Legacy v0 badge when metadata is inferred', () => {
    // Even if profileId says mero, inferred metadata wins — honesty rule.
    renderBadge(makeSession({
      profileId: 'mero',
      metadataInferred: true,
      calculatedAtSource: 'inferred-from-updatedAt',
    }));
    expect(screen.getByText('Legacy v0')).toBeInTheDocument();
    // Must NOT call this session "MERO" in the visible label.
    expect(screen.queryByText('MERO beta')).not.toBeInTheDocument();
  });

  it('falls back to Legacy when profileId is undefined', () => {
    renderBadge(makeSession({ profileId: undefined }));
    expect(screen.getByText('Legacy')).toBeInTheDocument();
  });
});

describe('EngineBadge — resolveBadgeState (pure)', () => {
  it('inferred wins over mero', () => {
    const s = makeSession({ profileId: 'mero', metadataInferred: true });
    expect(resolveBadgeState(s).variant).toBe('legacy-v0');
  });
  it('mero when not inferred', () => {
    expect(resolveBadgeState(makeSession({ profileId: 'mero' })).variant).toBe('mero-beta');
  });
  it('legacy by default', () => {
    expect(resolveBadgeState(makeSession()).variant).toBe('legacy');
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Tranche F.5 — tooltip enrichi avec `Importé depuis : …` quand au moins
// une entité liée (projectile / optique) porte un `importedFrom`. La
// résolution lit les stores réels via `resolveSessionImportedFrom`.
// ──────────────────────────────────────────────────────────────────────────
describe('EngineBadge — Tranche F.5 imported-from tooltip', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('does not render the imported-from line when no entity is imported', () => {
    renderBadge(makeSession());
    openTooltip();
    expect(screen.queryByTestId('engine-badge-imported-from')).not.toBeInTheDocument();
  });

  it('renders the projectile imported-from line when only the projectile is imported', () => {
    const p = projectileStore.create({
      brand: 'JSB', model: 'Hades', weight: 16.2, bc: 0.025, caliber: '.22',
      importedFrom: 'strelok',
    });
    renderBadge(makeSession({ projectileId: p.id }));
    openTooltip();
    expect(screen.getByTestId('imported-from-projectile')).toBeInTheDocument();
    expect(screen.queryByTestId('imported-from-optic')).not.toBeInTheDocument();
    expect(screen.getByTestId('imported-from-projectile').textContent).toContain('Strelok');
  });

  it('renders the optic imported-from line when only the optic is imported', () => {
    const o = opticStore.create({
      name: 'Element Helix', clickUnit: 'MRAD', clickValue: 0.1,
      importedFrom: 'json-user',
    });
    renderBadge(makeSession({ opticId: o.id }));
    openTooltip();
    expect(screen.getByTestId('imported-from-optic')).toBeInTheDocument();
    expect(screen.queryByTestId('imported-from-projectile')).not.toBeInTheDocument();
    expect(screen.getByTestId('imported-from-optic').textContent).toContain('JSON utilisateur');
  });

  it('renders BOTH lines when projectile + optic are both imported', () => {
    const p = projectileStore.create({
      brand: 'JSB', model: 'Hades', weight: 16.2, bc: 0.025, caliber: '.22',
      importedFrom: 'chairgun',
    });
    const o = opticStore.create({
      name: 'Athlon Helos', clickUnit: 'MRAD', clickValue: 0.1,
      importedFrom: 'airballistik',
    });
    renderBadge(makeSession({ projectileId: p.id, opticId: o.id }));
    openTooltip();
    expect(screen.getByTestId('imported-from-projectile').textContent).toContain('ChairGun');
    expect(screen.getByTestId('imported-from-optic').textContent).toContain('AirBallistik');
  });

  it('does not crash when the linked entities are missing from the stores', () => {
    renderBadge(makeSession({ projectileId: 'ghost-1', opticId: 'ghost-2' }));
    openTooltip();
    expect(screen.queryByTestId('engine-badge-imported-from')).not.toBeInTheDocument();
  });

  it('keeps the existing variant logic untouched (legacy → Legacy)', () => {
    const p = projectileStore.create({
      brand: 'JSB', model: 'Hades', weight: 16.2, bc: 0.025, caliber: '.22',
      importedFrom: 'strelok',
    });
    renderBadge(makeSession({ projectileId: p.id }));
    expect(screen.getByText('Legacy')).toBeInTheDocument();
  });
});
