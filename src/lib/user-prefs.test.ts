import { describe, it, expect, beforeEach } from 'vitest';
import {
  userScopedKey,
  readUserPref,
  writeUserPref,
  migrateGuestPrefToUser,
} from './user-prefs';

const KEY = 'test-pref';

describe('user-prefs', () => {
  beforeEach(() => localStorage.clear());

  it('userScopedKey appends the user id when present', () => {
    expect(userScopedKey('foo', null)).toBe('foo');
    expect(userScopedKey('foo', undefined)).toBe('foo');
    expect(userScopedKey('foo', 'abc')).toBe('foo:abc');
  });

  it('writes mirror to both the user bucket and the guest bucket', () => {
    writeUserPref(KEY, 'alice', 'en');
    expect(localStorage.getItem('test-pref:alice')).toBe('en');
    // Mirror so first-paint after reload (before auth resolves) sees the
    // user's last choice instead of the default.
    expect(localStorage.getItem('test-pref')).toBe('en');
  });

  it('reads from the user bucket first, falling back to guest', () => {
    localStorage.setItem('test-pref', 'fr'); // pre-existing guest value
    // No user bucket yet → falls back to guest
    expect(readUserPref(KEY, 'alice')).toBe('fr');
    // Once the user has their own value, it wins over guest
    localStorage.setItem('test-pref:alice', 'en');
    expect(readUserPref(KEY, 'alice')).toBe('en');
  });

  it('returns null when nothing is stored', () => {
    expect(readUserPref(KEY, null)).toBeNull();
    expect(readUserPref(KEY, 'alice')).toBeNull();
  });

  it('migrates the guest value into the user bucket on first sign-in only', () => {
    localStorage.setItem('test-pref', 'fr');
    migrateGuestPrefToUser(KEY, 'alice');
    expect(localStorage.getItem('test-pref:alice')).toBe('fr');

    // Pre-existing user value is never overwritten by a later migration.
    localStorage.setItem('test-pref:alice', 'en');
    localStorage.setItem('test-pref', 'fr');
    migrateGuestPrefToUser(KEY, 'alice');
    expect(localStorage.getItem('test-pref:alice')).toBe('en');
  });

  it('isolates buckets between two users on the same device', () => {
    writeUserPref(KEY, 'alice', 'en');
    writeUserPref(KEY, 'bob', 'fr');
    expect(readUserPref(KEY, 'alice')).toBe('en');
    expect(readUserPref(KEY, 'bob')).toBe('fr');
  });
});
