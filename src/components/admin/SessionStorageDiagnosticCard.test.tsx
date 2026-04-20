import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@/lib/i18n';
import { SessionStorageDiagnosticCard } from './SessionStorageDiagnosticCard';
import {
  __resetSessionRepoForTests,
  LEGACY_SESSIONS_LOCALSTORAGE_KEY,
  SESSIONS_MIGRATION_FLAG_KEY,
  writeSessionsToIdb,
} from '@/lib/session-repo';
import { sessionStore } from '@/lib/storage';
import type { Session } from '@/lib/types';

function fakeSession(i: number): Session {
  return {
    id: `s-${i}`,
    name: `Session ${i}`,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    input: {} as Session['input'],
    results: [],
    tags: [],
    favorite: false,
  } as Session;
}

const renderCard = () =>
  render(
    <I18nProvider>
      <SessionStorageDiagnosticCard />
    </I18nProvider>,
  );

describe('SessionStorageDiagnosticCard', () => {
  beforeEach(async () => {
    await __resetSessionRepoForTests();
    sessionStore.__resetForTests();
  });

  it('renders the healthy nominal case (IDB available, migrated, no legacy)', async () => {
    localStorage.setItem(SESSIONS_MIGRATION_FLAG_KEY, '2024-05-01T00:00:00.000Z');
    await writeSessionsToIdb([fakeSession(1), fakeSession(2), fakeSession(3)]);
    sessionStore.__hydrate([fakeSession(1), fakeSession(2), fakeSession(3)]);

    renderCard();

    await waitFor(() => {
      expect(screen.getByTestId('session-diag-backend')).toBeInTheDocument();
    });
    expect(screen.getByTestId('session-diag-backend').textContent).toMatch(/IndexedDB/i);
    expect(screen.getByTestId('session-diag-migration').textContent?.toLowerCase()).toMatch(/oui|yes/);
    expect(screen.getByTestId('session-diag-legacy').textContent?.toLowerCase()).toMatch(/non|no/);
    expect(screen.getByTestId('session-diag-count').textContent).toBe('3');
    expect(screen.queryByTestId('session-diag-degraded')).not.toBeInTheDocument();
  });

  it('flags legacy key presence when migration has not run yet', async () => {
    localStorage.setItem(LEGACY_SESSIONS_LOCALSTORAGE_KEY, JSON.stringify([fakeSession(1)]));

    renderCard();

    await waitFor(() => {
      expect(screen.getByTestId('session-diag-legacy')).toBeInTheDocument();
    });
    expect(screen.getByTestId('session-diag-legacy').textContent?.toLowerCase()).toMatch(/oui|yes/);
    expect(screen.getByTestId('session-diag-migration').textContent?.toLowerCase()).toMatch(
      /pending|attente|à faire|en attente/i,
    );
  });

  it('shows degraded mode when IDB read fails', async () => {
    const repo = await import('@/lib/session-repo');
    const spy = vi
      .spyOn(repo, 'readSessionsFromIdb')
      .mockRejectedValueOnce(new Error('IDB down'));

    renderCard();

    await waitFor(() => {
      expect(screen.getByTestId('session-diag-degraded')).toBeInTheDocument();
    });
    expect(screen.getByTestId('session-diag-backend').textContent?.toLowerCase()).toMatch(
      /degraded|dégradé/i,
    );

    spy.mockRestore();
  });
});