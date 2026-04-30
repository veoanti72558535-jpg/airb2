import { describe, it, expect } from 'vitest';
import { sortFavoriteSessions, getSortedFavorites } from './session-favorites';
import type { Session } from './types';

function mk(partial: Partial<Session>): Session {
  return {
    id: partial.id ?? 'x',
    name: partial.name ?? 'x',
    input: { bc: 0.03 } as any,
    results: [],
    tags: [],
    favorite: partial.favorite ?? true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: partial.updatedAt ?? '2025-01-01T00:00:00Z',
    ...partial,
  } as Session;
}

describe('sortFavoriteSessions', () => {
  it('orders by updatedAt DESC then name ASC', () => {
    const a = mk({ id: 'a', name: 'Bravo', updatedAt: '2025-04-10T10:00:00Z' });
    const b = mk({ id: 'b', name: 'Alpha', updatedAt: '2025-04-12T10:00:00Z' });
    const c = mk({ id: 'c', name: 'Charlie', updatedAt: '2025-04-12T10:00:00Z' });
    const out = sortFavoriteSessions([a, b, c]);
    expect(out.map((s) => s.id)).toEqual(['b', 'c', 'a']);
  });

  it('does not mutate input', () => {
    const arr = [mk({ id: '1', updatedAt: '2025-01-01' }), mk({ id: '2', updatedAt: '2025-02-01' })];
    const snapshot = [...arr];
    sortFavoriteSessions(arr);
    expect(arr).toEqual(snapshot);
  });

  it('treats invalid updatedAt as oldest', () => {
    const good = mk({ id: 'g', updatedAt: '2025-04-12T10:00:00Z' });
    const bad = mk({ id: 'b', updatedAt: 'not-a-date' });
    expect(sortFavoriteSessions([bad, good])[0].id).toBe('g');
  });

  it('getSortedFavorites filters non-favorites first', () => {
    const fav = mk({ id: 'f', favorite: true, updatedAt: '2025-01-01' });
    const notFav = mk({ id: 'n', favorite: false, updatedAt: '2025-12-01' });
    const out = getSortedFavorites([fav, notFav]);
    expect(out.map((s) => s.id)).toEqual(['f']);
  });
});
