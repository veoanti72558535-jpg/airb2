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

/**
 * Tiny bounded LRU-ish cache. We use plain Maps and rely on insertion-order
 * iteration to evict the oldest entry when we exceed `max`. Memoising here
 * matters because `pickBestLink` runs over every link in the More panel on
 * every focus pass and React re-renders can hammer the same hrefs hundreds
 * of times during a single session.
 */
const SEARCH_CACHE_MAX = 128;
const HREF_CACHE_MAX = 256;
const CTX_CACHE_MAX = 16;

const searchCache = new Map<string, string>();
function cacheGet<K, V>(map: Map<K, V>, key: K): V | undefined {
  return map.get(key);
}
function cacheSet<K, V>(map: Map<K, V>, key: K, value: V, max: number): V {
  if (map.has(key)) map.delete(key);
  map.set(key, value);
  if (map.size > max) {
    const oldest = map.keys().next().value as K | undefined;
    if (oldest !== undefined) map.delete(oldest);
  }
  return value;
}

function sortSearch(search: string): string {
  if (!search || search === '?') return '';
  const raw = search.startsWith('?') ? search.slice(1) : search;
  if (!raw) return '';
  const cached = cacheGet(searchCache, raw);
  if (cached !== undefined) return cached;
  // URLSearchParams preserves insertion order; rebuild after sort.
  const params = new URLSearchParams(raw);
  const entries: [string, string][] = [];
  params.forEach((v, k) => entries.push([k, v]));
  entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const out = entries
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  return cacheSet(searchCache, raw, out, SEARCH_CACHE_MAX);
}

/**
 * Normalise an arbitrary href (absolute, root-relative, relative, hash-only)
 * against a base pathname so we can compare apples to apples.
 */
const hrefCache = new Map<string, NormalisedUrl | null>();
export function normaliseHref(href: string, basePathname: string): NormalisedUrl | null {
  if (typeof href !== 'string' || href.length === 0) return null;
  const key = `${basePathname}\u0000${href}`;
  const cached = cacheGet(hrefCache, key);
  if (cached !== undefined) return cached;
  try {
    // Relative hrefs need a base. Build one from the current pathname so
    // `./tab` resolves under the right segment.
    const safeBase = basePathname.startsWith('/') ? basePathname : `/${basePathname}`;
    const u = new URL(href, `${ORIGIN}${safeBase}`);
    const out: NormalisedUrl = {
      pathname: stripTrailingSlash(u.pathname),
      search: sortSearch(u.search),
      hash: u.hash.startsWith('#') ? u.hash.slice(1) : u.hash,
    };
    return cacheSet(hrefCache, key, out, HREF_CACHE_MAX);
  } catch {
    return cacheSet(hrefCache, key, null, HREF_CACHE_MAX);
  }
}

const ctxCache = new Map<string, NormalisedUrl>();
function normaliseContext(ctx: ScoringContext): NormalisedUrl {
  const path = ctx.pathname || '/';
  const search = ctx.search ?? '';
  const hash = ctx.hash ?? '';
  const key = `${path}\u0000${search}\u0000${hash}`;
  const cached = cacheGet(ctxCache, key);
  if (cached !== undefined) return cached;
  const out: NormalisedUrl = {
    pathname: stripTrailingSlash(ctx.pathname || '/'),
    search: sortSearch(ctx.search ?? ''),
    hash: (ctx.hash ?? '').replace(/^#/, ''),
  };
  return cacheSet(ctxCache, key, out, CTX_CACHE_MAX);
}

/**
 * Returns the parsed query params of a normalised search string as a
 * Record. Empty search → empty object.
 */
const parsedSearchCache = new Map<string, Record<string, string>>();
function parseSorted(search: string): Record<string, string> {
  if (!search) return {};
  const cached = cacheGet(parsedSearchCache, search);
  if (cached !== undefined) return cached;
  const out: Record<string, string> = {};
  for (const pair of search.split('&')) {
    const eq = pair.indexOf('=');
    if (eq < 0) { out[decodeURIComponent(pair)] = ''; continue; }
    out[decodeURIComponent(pair.slice(0, eq))] = decodeURIComponent(pair.slice(eq + 1));
  }
  return cacheSet(parsedSearchCache, search, out, SEARCH_CACHE_MAX);
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
  return scoreAgainstNormalised(href, cur, ctx.includeHash === true);
}

/**
 * Internal: score `href` against a pre-normalised current location. This is
 * the hot path used by `pickBestLink` so the per-call cost stays at one
 * `normaliseHref` cache lookup instead of re-normalising the context for
 * every link in the panel.
 */
function scoreAgainstNormalised(
  href: string,
  cur: NormalisedUrl,
  includeHash: boolean,
): number {
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
    if (includeHash) {
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
  // Normalise the context ONCE per call. Every link then reuses the same
  // pre-parsed pathname/search/hash and benefits from the href cache too,
  // turning the per-link cost into a Map lookup in the steady state.
  const cur = normaliseContext(ctx);
  const includeHash = ctx.includeHash === true;
  for (const link of links) {
    const href = link.getAttribute('href') ?? '';
    const s = scoreAgainstNormalised(href, cur, includeHash);
    if (s > bestScore) {
      bestScore = s;
      best = link;
    }
  }
  return best;
}

/**
 * Test-only escape hatch to drop every memoisation cache. Kept tiny and
 * unconditional so unit tests can guarantee deterministic state without
 * needing to import individual cache instances.
 */
export function __clearLinkScoringCaches(): void {
  searchCache.clear();
  hrefCache.clear();
  ctxCache.clear();
  parsedSearchCache.clear();
}