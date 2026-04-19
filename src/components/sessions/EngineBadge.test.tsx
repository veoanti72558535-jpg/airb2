import { afterEach, beforeEach, describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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
