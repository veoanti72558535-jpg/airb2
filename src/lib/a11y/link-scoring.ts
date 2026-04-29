/**
 * Active-link scoring used by the "More" panel focus picker.
 *
 * Goal: when several links could legitimately claim the current route,
 * pick the **most relevant** one — not just the longest prefix in raw
 * string form. The picker normalises both sides so equivalent URLs score
 * the same regardless of how the author wrote them.
 *
 * Normalisation steps applied to both the candidate href and the current
 * location:
 *   • Resolve relative hrefs (`settings`, `./settings`) against the
 *     current pathname using the URL constructor.
 *   • Strip trailing slashes (except for the root "/") so `/diary/` and
 *     `/diary` are equivalent.
 *   • Sort query params alphabetically so `?a=1&b=2` and `?b=2&a=1` match.
 *   • Strip the hash by default — same-page anchors should NOT outscore
 *     a real route match. Callers can opt back in via `includeHash`.
 *
 * Scoring (higher = more relevant):
 *   • full equality (path + sorted search [+ hash]) → very high score.
 *   • path equality, search of candidate is a subset of current      → high.
 *   • current pathname starts with candidate pathname (segment match) → length-based.
 *   • else                                                            → 0.
 *
 * Pure / DOM-free so it can be unit-tested without jsdom URL quirks
 * leaking through (we still rely on the global `URL` constructor, which
 * Node ≥ 10 and every browser provide).
 */

export interface ScoringContext {
  /** Current pathname, e.g. `location.pathname`. */
  pathname: string;
  /** Current search string, e.g. `location.search` (with leading `?` or empty). */
  search?: string;
  /** Current hash, e.g. `location.hash` (with leading `#` or empty). */
  hash?: string;
  /** When true, hash equality contributes to the score. Default: false. */
  includeHash?: boolean;
}

interface NormalisedUrl {
  pathname: string;
  /** Sorted "k=v&k2=v2" string, no leading `?`. Empty when no params. */
  search: string;
  /** Hash without leading `#`. Empty when no hash. */
  hash: string;
}

const ORIGIN = 'http://__a11y_score__.local';

function stripTrailingSlash(p: string): string {
  if (p.length > 1 && p.endsWith('/')) return p.slice(0, -1);
  return p;
}

function sortSearch(search: string): string {
  if (!search || search === '?') return '';
  const raw = search.startsWith('?') ? search.slice(1) : search;
  if (!raw) return '';
  // URLSearchParams preserves insertion order; rebuild after sort.
  const params = new URLSearchParams(raw);
  const entries: [string, string][] = [];
  params.forEach((v, k) => entries.push([k, v]));
  entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
}

/**
 * Normalise an arbitrary href (absolute, root-relative, relative, hash-only)
 * against a base pathname so we can compare apples to apples.
 */
export function normaliseHref(href: string, basePathname: string): NormalisedUrl | null {
  if (typeof href !== 'string' || href.length === 0) return null;
  try {
    // Relative hrefs need a base. Build one from the current pathname so
    // `./tab` resolves under the right segment.
    const safeBase = basePathname.startsWith('/') ? basePathname : `/${basePathname}`;
    const u = new URL(href, `${ORIGIN}${safeBase}`);
    return {
      pathname: stripTrailingSlash(u.pathname),
      search: sortSearch(u.search),
      hash: u.hash.startsWith('#') ? u.hash.slice(1) : u.hash,
    };
  } catch {
    return null;
  }
}

function normaliseContext(ctx: ScoringContext): NormalisedUrl {
  return {
    pathname: stripTrailingSlash(ctx.pathname || '/'),
    search: sortSearch(ctx.search ?? ''),
    hash: (ctx.hash ?? '').replace(/^#/, ''),
  };
}

/**
 * Returns the parsed query params of a normalised search string as a
 * Record. Empty search → empty object.
 */
function parseSorted(search: string): Record<string, string> {
  if (!search) return {};
  const out: Record<string, string> = {};
  for (const pair of search.split('&')) {
    const eq = pair.indexOf('=');
    if (eq < 0) { out[decodeURIComponent(pair)] = ''; continue; }
    out[decodeURIComponent(pair.slice(0, eq))] = decodeURIComponent(pair.slice(eq + 1));
  }
  return out;
}

function isSearchSubset(candidate: string, current: string): boolean {
  if (!candidate) return true;
  const cand = parseSorted(candidate);
  const cur = parseSorted(current);
  for (const [k, v] of Object.entries(cand)) {
    if (cur[k] !== v) return false;
  }
  return true;
}

/**
 * Score a single href against a routing context. Higher score = better
 * match. A score of 0 means "no match at all".
 *
 * Scoring scale (kept monotonic so callers can naively pick the max):
 *   1_000_000 + len  → exact pathname + same search + (hash if requested)
 *     500_000 + len  → exact pathname + candidate search ⊆ current search
 *      10_000 + len  → exact pathname (different search params on candidate)
 *           len      → current pathname starts with candidate pathname
 *           0        → no relationship
 */
export function scoreLinkMatch(href: string, ctx: ScoringContext): number {
  const cur = normaliseContext(ctx);
  const cand = normaliseHref(href, cur.pathname);
  if (!cand) return 0;

  const pathLen = cand.pathname.length;

  // Pathname must at least be a segment-aligned prefix to qualify.
  if (cand.pathname !== cur.pathname) {
    if (cand.pathname === '/') {
      // Root link only matches the root route exactly — never score it as
      // a generic prefix or it would always win against deeper links.
      return cur.pathname === '/' ? pathLen : 0;
    }
    if (cur.pathname === cand.pathname || cur.pathname.startsWith(cand.pathname + '/')) {
      return pathLen;
    }
    return 0;
  }

  // From here, paths are equal — compare search & (optionally) hash.
  if (cand.search === cur.search) {
    if (ctx.includeHash) {
      const hashEq = cand.hash === cur.hash;
      return (hashEq ? 1_000_000 : 500_000) + pathLen;
    }
    return 1_000_000 + pathLen;
  }
  if (isSearchSubset(cand.search, cur.search)) {
    return 500_000 + pathLen;
  }
  // Same path but conflicting params — still a meaningful match, just
  // weaker than a subset/equal one.
  return 10_000 + pathLen;
}

/**
 * Convenience: pick the highest-scoring element from a list. Returns
 * `null` when no candidate scores above 0. Stable: ties resolve to the
 * first match in input order.
 */
export function pickBestLink<T extends { getAttribute(name: string): string | null }>(
  links: T[],
  ctx: ScoringContext,
): T | null {
  let best: T | null = null;
  let bestScore = 0;
  for (const link of links) {
    const href = link.getAttribute('href') ?? '';
    const s = scoreLinkMatch(href, ctx);
    if (s > bestScore) {
      bestScore = s;
      best = link;
    }
  }
  return best;
}