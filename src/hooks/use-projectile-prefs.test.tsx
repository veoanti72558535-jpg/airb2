import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  useProjectilePrefs,
  RECENTS_MAX,
  __PROJECTILE_PREFS_KEYS,
} from './use-projectile-prefs';

beforeEach(() => {
  localStorage.clear();
});

describe('useProjectilePrefs — favorites', () => {
  it('starts empty', () => {
    const { result } = renderHook(() => useProjectilePrefs());
    expect(result.current.favorites).toEqual([]);
    expect(result.current.isFavorite('p-1')).toBe(false);
  });

  it('toggleFavorite adds and removes an id', () => {
    const { result } = renderHook(() => useProjectilePrefs());
    act(() => result.current.toggleFavorite('p-1'));
    expect(result.current.favorites).toEqual(['p-1']);
    expect(result.current.isFavorite('p-1')).toBe(true);
    act(() => result.current.toggleFavorite('p-1'));
    expect(result.current.favorites).toEqual([]);
    expect(result.current.isFavorite('p-1')).toBe(false);
  });

  it('persists favorites to localStorage and reads them back', () => {
    const { result, unmount } = renderHook(() => useProjectilePrefs());
    act(() => result.current.toggleFavorite('p-1'));
    act(() => result.current.toggleFavorite('p-2'));
    unmount();
    expect(JSON.parse(localStorage.getItem(__PROJECTILE_PREFS_KEYS.FAVORITES_KEY)!))
      .toEqual(['p-2', 'p-1']);

    const next = renderHook(() => useProjectilePrefs());
    expect(next.result.current.favorites).toEqual(['p-2', 'p-1']);
  });

  it('ignores empty ids', () => {
    const { result } = renderHook(() => useProjectilePrefs());
    act(() => result.current.toggleFavorite(''));
    expect(result.current.favorites).toEqual([]);
  });
});

describe('useProjectilePrefs — recents', () => {
  it('pushRecent puts the most recent first and de-duplicates', () => {
    const { result } = renderHook(() => useProjectilePrefs());
    act(() => result.current.pushRecent('a'));
    act(() => result.current.pushRecent('b'));
    act(() => result.current.pushRecent('a'));
    expect(result.current.recents).toEqual(['a', 'b']);
  });

  it('caps recents to RECENTS_MAX', () => {
    const { result } = renderHook(() => useProjectilePrefs());
    act(() => {
      for (let i = 0; i < RECENTS_MAX + 5; i++) result.current.pushRecent(`p-${i}`);
    });
    expect(result.current.recents).toHaveLength(RECENTS_MAX);
    // Most recent push first
    expect(result.current.recents[0]).toBe(`p-${RECENTS_MAX + 4}`);
  });

  it('ignores empty ids in recents (manual entry)', () => {
    const { result } = renderHook(() => useProjectilePrefs());
    act(() => result.current.pushRecent(''));
    expect(result.current.recents).toEqual([]);
  });

  it('clearRecents empties the list', () => {
    const { result } = renderHook(() => useProjectilePrefs());
    act(() => result.current.pushRecent('a'));
    act(() => result.current.pushRecent('b'));
    act(() => result.current.clearRecents());
    expect(result.current.recents).toEqual([]);
  });

  it('persists recents to localStorage', () => {
    const { result, unmount } = renderHook(() => useProjectilePrefs());
    act(() => result.current.pushRecent('p-x'));
    unmount();
    expect(JSON.parse(localStorage.getItem(__PROJECTILE_PREFS_KEYS.RECENTS_KEY)!))
      .toEqual(['p-x']);
  });
});

describe('useProjectilePrefs — robustness', () => {
  it('survives malformed storage gracefully', () => {
    localStorage.setItem(__PROJECTILE_PREFS_KEYS.FAVORITES_KEY, '{not json');
    localStorage.setItem(__PROJECTILE_PREFS_KEYS.RECENTS_KEY, 'null');
    const { result } = renderHook(() => useProjectilePrefs());
    expect(result.current.favorites).toEqual([]);
    expect(result.current.recents).toEqual([]);
  });

  it('strips non-string entries from stored arrays', () => {
    localStorage.setItem(
      __PROJECTILE_PREFS_KEYS.FAVORITES_KEY,
      JSON.stringify(['ok', 42, null, '']),
    );
    const { result } = renderHook(() => useProjectilePrefs());
    expect(result.current.favorites).toEqual(['ok']);
  });
});
