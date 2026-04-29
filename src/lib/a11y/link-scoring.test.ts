import { describe, it, expect } from 'vitest';
import { scoreLinkMatch, pickBestLink, normaliseHref } from './link-scoring';

const at = (pathname: string, search = '', hash = '') => ({ pathname, search, hash });

describe('normaliseHref', () => {
  it('resolves relative hrefs against the base pathname', () => {
    expect(normaliseHref('settings', '/admin')?.pathname).toBe('/settings');
    expect(normaliseHref('./tab', '/admin/users')?.pathname).toBe('/admin/tab');
  });

  it('strips trailing slashes (except root)', () => {
    expect(normaliseHref('/diary/', '/')?.pathname).toBe('/diary');
    expect(normaliseHref('/', '/')?.pathname).toBe('/');
  });

  it('sorts query params alphabetically', () => {
    expect(normaliseHref('/x?b=2&a=1', '/')?.search).toBe('a=1&b=2');
  });

  it('preserves the hash fragment', () => {
    expect(normaliseHref('/x#top', '/')?.hash).toBe('top');
  });
});

describe('scoreLinkMatch', () => {
  it('scores exact path + identical search highest', () => {
    const a = scoreLinkMatch('/settings?tab=data', at('/settings', '?tab=data'));
    const b = scoreLinkMatch('/settings', at('/settings', '?tab=data'));
    expect(a).toBeGreaterThan(b);
  });

  it('treats reordered query params as identical', () => {
    const reordered = scoreLinkMatch('/x?b=2&a=1', at('/x', '?a=1&b=2'));
    const exact = scoreLinkMatch('/x?a=1&b=2', at('/x', '?a=1&b=2'));
    expect(reordered).toBe(exact);
  });

  it('scores a search SUBSET above a search MISMATCH on the same path', () => {
    const subset = scoreLinkMatch('/x?a=1', at('/x', '?a=1&b=2'));
    const mismatch = scoreLinkMatch('/x?a=2', at('/x', '?a=1&b=2'));
    expect(subset).toBeGreaterThan(mismatch);
    expect(mismatch).toBeGreaterThan(0); // path-equal still meaningful
  });

  it('handles relative hrefs by resolving against the current path', () => {
    // From `/admin`, a relative href "settings" resolves to `/settings`.
    const s = scoreLinkMatch('settings', at('/settings'));
    expect(s).toBeGreaterThan(0);
  });

  it('treats trailing slashes as equivalent', () => {
    const a = scoreLinkMatch('/diary/', at('/diary'));
    const b = scoreLinkMatch('/diary', at('/diary'));
    expect(a).toBe(b);
    expect(a).toBeGreaterThan(0);
  });

  it('ignores the hash by default', () => {
    const withHash = scoreLinkMatch('/x#top', at('/x'));
    const noHash = scoreLinkMatch('/x', at('/x'));
    expect(withHash).toBe(noHash);
  });

  it('rewards matching hash when includeHash is true', () => {
    const matching = scoreLinkMatch('/x#top', { ...at('/x', '', '#top'), includeHash: true });
    const mismatching = scoreLinkMatch('/x#bottom', { ...at('/x', '', '#top'), includeHash: true });
    expect(matching).toBeGreaterThan(mismatching);
  });

  it('does NOT let the root link "/" outscore deeper matches', () => {
    const root = scoreLinkMatch('/', at('/diary'));
    const deeper = scoreLinkMatch('/diary', at('/diary'));
    expect(root).toBe(0);
    expect(deeper).toBeGreaterThan(0);
  });

  it('matches only on segment boundaries (no partial-segment prefix)', () => {
    // `/set` should NOT match `/settings` — would be confusing for users.
    expect(scoreLinkMatch('/set', at('/settings'))).toBe(0);
    // `/settings` DOES match `/settings/profile` (true sub-route).
    expect(scoreLinkMatch('/settings', at('/settings/profile'))).toBeGreaterThan(0);
  });

  it('returns 0 for unrelated paths', () => {
    expect(scoreLinkMatch('/foo', at('/bar'))).toBe(0);
    expect(scoreLinkMatch('', at('/bar'))).toBe(0);
  });
});

describe('pickBestLink', () => {
  const fakeLink = (href: string) => ({
    href,
    getAttribute: (name: string) => (name === 'href' ? href : null),
  });

  it('returns the candidate with the highest score', () => {
    const links = [
      fakeLink('/settings'),
      fakeLink('/settings?tab=data'),
      fakeLink('/diary'),
    ];
    const best = pickBestLink(links, at('/settings', '?tab=data'));
    expect(best?.href).toBe('/settings?tab=data');
  });

  it('picks the more specific link when params are reordered', () => {
    const links = [fakeLink('/x?a=1&b=2'), fakeLink('/x?b=2&a=1')];
    const best = pickBestLink(links, at('/x', '?a=1&b=2'));
    // Both score identically — stable selection returns the first one.
    expect(best?.href).toBe('/x?a=1&b=2');
  });

  it('returns null when no candidate matches', () => {
    const links = [fakeLink('/foo'), fakeLink('/bar')];
    expect(pickBestLink(links, at('/baz'))).toBeNull();
  });
});