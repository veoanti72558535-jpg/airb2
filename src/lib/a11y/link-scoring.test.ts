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

describe('segment-boundary alignment — edge cases', () => {
  // These cases used to be the source of subtle "wrong link highlighted"
  // bugs in the More panel: similarly-named top-level routes, accidental
  // double slashes from string concatenation, and dynamic path segments
  // (e.g. `/sessions/:id`) that look like prefixes of one another.

  describe('similar-prefix segments', () => {
    it('does NOT match /app against /app2 (segment must be complete)', () => {
      expect(scoreLinkMatch('/app', at('/app2'))).toBe(0);
      expect(scoreLinkMatch('/app', at('/app2/details'))).toBe(0);
    });

    it('does NOT match /app2 against /app', () => {
      expect(scoreLinkMatch('/app2', at('/app'))).toBe(0);
    });

    it('still matches /app against true sub-routes /app/...', () => {
      expect(scoreLinkMatch('/app', at('/app'))).toBeGreaterThan(0);
      expect(scoreLinkMatch('/app', at('/app/users'))).toBeGreaterThan(0);
    });

    it('picks the most specific link between /app and /app2 siblings', () => {
      const links = [
        { href: '/app', getAttribute: (n: string) => (n === 'href' ? '/app' : null) },
        { href: '/app2', getAttribute: (n: string) => (n === 'href' ? '/app2' : null) },
      ];
      expect(pickBestLink(links, at('/app2'))?.href).toBe('/app2');
      expect(pickBestLink(links, at('/app'))?.href).toBe('/app');
      expect(pickBestLink(links, at('/app2/foo'))?.href).toBe('/app2');
    });

    it('disambiguates /sessions vs /sessions-archive (hyphen boundary)', () => {
      // `-archive` is part of the same segment, so /sessions must NOT
      // claim /sessions-archive.
      expect(scoreLinkMatch('/sessions', at('/sessions-archive'))).toBe(0);
      expect(scoreLinkMatch('/sessions-archive', at('/sessions-archive'))).toBeGreaterThan(0);
    });
  });

  describe('double slashes in routes', () => {
    it('treats a stray double slash in the candidate as a different path', () => {
      // `/app//users` is technically a different pathname from `/app/users`
      // — we do NOT silently collapse it, otherwise we would mask routing
      // bugs. But a clean `/app` candidate should still match the user
      // currently sitting at `/app//users` as a parent route.
      expect(scoreLinkMatch('/app//users', at('/app/users'))).toBe(0);
      expect(scoreLinkMatch('/app', at('/app//users'))).toBeGreaterThan(0);
    });

    it('matches /app//users to itself (exact)', () => {
      const exact = scoreLinkMatch('/app//users', at('/app//users'));
      const parent = scoreLinkMatch('/app', at('/app//users'));
      expect(exact).toBeGreaterThan(parent);
    });

    it('strips a single trailing slash but preserves internal doubles', () => {
      // Trailing slash equivalence still applies on top of preserved
      // internal doubles.
      const a = scoreLinkMatch('/app//users/', at('/app//users'));
      const b = scoreLinkMatch('/app//users', at('/app//users'));
      expect(a).toBe(b);
    });
  });

  describe('dynamic path parameters (resolved hrefs)', () => {
    // React Router params are already substituted by the time the link
    // hits the DOM (e.g. <Link to={`/sessions/${id}`}>). The scorer never
    // sees `:id`; it sees concrete values like `/sessions/42`.

    it('exact-matches a resolved param route', () => {
      const exact = scoreLinkMatch('/sessions/42', at('/sessions/42'));
      expect(exact).toBeGreaterThan(0);
    });

    it('parent /sessions matches a child /sessions/:id route', () => {
      const parent = scoreLinkMatch('/sessions', at('/sessions/42'));
      const exact = scoreLinkMatch('/sessions/42', at('/sessions/42'));
      expect(parent).toBeGreaterThan(0);
      expect(exact).toBeGreaterThan(parent);
    });

    it('does NOT confuse /sessions/42 with /sessions/421', () => {
      // Same segment-boundary rule applies inside dynamic segments —
      // `42` is not a prefix of `421` for our purposes.
      expect(scoreLinkMatch('/sessions/42', at('/sessions/421'))).toBe(0);
      expect(scoreLinkMatch('/sessions/421', at('/sessions/42'))).toBe(0);
    });

    it('picks the deepest matching link among siblings', () => {
      const links = [
        { href: '/sessions', getAttribute: (n: string) => (n === 'href' ? '/sessions' : null) },
        { href: '/sessions/42', getAttribute: (n: string) => (n === 'href' ? '/sessions/42' : null) },
        { href: '/sessions/42/edit', getAttribute: (n: string) => (n === 'href' ? '/sessions/42/edit' : null) },
      ];
      expect(pickBestLink(links, at('/sessions/42'))?.href).toBe('/sessions/42');
      expect(pickBestLink(links, at('/sessions/42/edit'))?.href).toBe('/sessions/42/edit');
      expect(pickBestLink(links, at('/sessions/99'))?.href).toBe('/sessions');
    });

    it('picks /app2/:id over /app for /app2/7', () => {
      const links = [
        { href: '/app', getAttribute: (n: string) => (n === 'href' ? '/app' : null) },
        { href: '/app2/7', getAttribute: (n: string) => (n === 'href' ? '/app2/7' : null) },
      ];
      expect(pickBestLink(links, at('/app2/7'))?.href).toBe('/app2/7');
    });
  });
});

describe('absolute hrefs with a different baseURL', () => {
  // The scorer uses an internal sentinel origin to resolve relative hrefs.
  // When a link is written as a full absolute URL (different host, port,
  // scheme, or even a sub-path base like `/app/`), only the *pathname*
  // should drive the segment-boundary calculation. The origin must never
  // leak into the comparison and the segment math must stay stable.

  it('matches an absolute href when only the pathname differs from the current origin', () => {
    // Different host than the sentinel — pathname still aligns.
    const s = scoreLinkMatch('https://example.com/settings', at('/settings'));
    expect(s).toBeGreaterThan(0);
  });

  it('treats two absolute hrefs with different origins but identical paths as equivalent', () => {
    const a = scoreLinkMatch('https://example.com/diary', at('/diary'));
    const b = scoreLinkMatch('http://other.test:8080/diary', at('/diary'));
    const c = scoreLinkMatch('/diary', at('/diary'));
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it('keeps segment-boundary alignment for absolute hrefs (no /app vs /app2 leak)', () => {
    expect(scoreLinkMatch('https://example.com/app', at('/app2'))).toBe(0);
    expect(scoreLinkMatch('https://example.com/app2', at('/app'))).toBe(0);
    expect(scoreLinkMatch('https://example.com/app', at('/app/users'))).toBeGreaterThan(0);
  });

  it('preserves search ordering equivalence on absolute hrefs', () => {
    const reordered = scoreLinkMatch('https://example.com/x?b=2&a=1', at('/x', '?a=1&b=2'));
    const exact = scoreLinkMatch('/x?a=1&b=2', at('/x', '?a=1&b=2'));
    expect(reordered).toBe(exact);
  });

  it('ignores the origin when picking the best link among mixed absolute/relative hrefs', () => {
    const fakeLink = (href: string) => ({
      href,
      getAttribute: (n: string) => (n === 'href' ? href : null),
    });
    const links = [
      fakeLink('https://cdn.example.com/sessions'),
      fakeLink('http://other.test/sessions/42'),
      fakeLink('/sessions/42/edit'),
    ];
    expect(pickBestLink(links, at('/sessions/42'))?.href).toBe('http://other.test/sessions/42');
    expect(pickBestLink(links, at('/sessions/42/edit'))?.href).toBe('/sessions/42/edit');
    expect(pickBestLink(links, at('/sessions/99'))?.href).toBe('https://cdn.example.com/sessions');
  });

  it('resolves a relative href against a base pathname that contains a sub-path (e.g. /app/)', () => {
    // Simulates an app deployed under a sub-path. The base pathname is
    // `/app/users` — a relative `./profile` must resolve to `/app/profile`,
    // NOT to `/profile` and NOT to anything involving the sentinel origin.
    const n = normaliseHref('./profile', '/app/users');
    expect(n?.pathname).toBe('/app/profile');

    // And the score reflects that resolution against a current location
    // that lives under the same sub-path.
    const s = scoreLinkMatch('./profile', at('/app/profile'));
    expect(s).toBeGreaterThan(0);
  });

  it('does not let an absolute href with a matching origin-like path fool the segment check', () => {
    // The sentinel origin used internally is `http://__a11y_score__.local`.
    // An author-supplied absolute URL whose host happens to *look* path-ish
    // must still be parsed as an origin, never as a pathname segment.
    const s = scoreLinkMatch('https://__a11y_score__.local/app', at('/app'));
    expect(s).toBeGreaterThan(0);
    // And it must NOT match an unrelated path just because the host string
    // contains characters that resemble one.
    expect(scoreLinkMatch('https://example.com/foo', at('/bar'))).toBe(0);
  });

  it('strips trailing slashes consistently on absolute hrefs', () => {
    const a = scoreLinkMatch('https://example.com/diary/', at('/diary'));
    const b = scoreLinkMatch('https://example.com/diary', at('/diary'));
    expect(a).toBe(b);
    expect(a).toBeGreaterThan(0);
  });

  it('preserves internal double slashes on absolute hrefs (no silent collapsing)', () => {
    // Same rule as relative hrefs: `/app//users` is a different pathname
    // from `/app/users` and we surface that, even when wrapped in an
    // absolute URL.
    expect(scoreLinkMatch('https://example.com/app//users', at('/app/users'))).toBe(0);
    expect(scoreLinkMatch('https://example.com/app', at('/app//users'))).toBeGreaterThan(0);
  });
});