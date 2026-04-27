/**
 * G5 — Session sharing via shareable URL / QR code.
 * Encodes session data as a compressed Base64 token in a URL fragment.
 * The receiving user can import it into their library.
 */
import type { Session } from '@/lib/types';

/** Compress and encode a session into a shareable token. */
export function encodeSessionToken(session: Session): string {
  const data = JSON.stringify({
    n: session.name,
    i: session.input,
    r: session.results?.slice(0, 50), // limit to 50 rows to keep URL short
    t: session.tags,
    bc: session.input.bc,
    mv: session.input.muzzleVelocity,
    z: session.input.zeroRange,
  });
  return btoa(encodeURIComponent(data));
}

/** Decode a session token back into importable data. */
export function decodeSessionToken(token: string): Partial<Session> | null {
  try {
    const data = JSON.parse(decodeURIComponent(atob(token)));
    return {
      name: data.n ? `${data.n} (importé)` : 'Session importée',
      input: data.i,
      results: data.r ?? [],
      tags: data.t ?? ['imported'],
    };
  } catch {
    return null;
  }
}

/** Generate a shareable URL with the session embedded. */
export function getShareUrl(session: Session): string {
  const token = encodeSessionToken(session);
  return `${window.location.origin}/sessions?import=${token}`;
}

/** Copy share URL to clipboard. */
export async function copyShareUrl(session: Session): Promise<boolean> {
  try {
    const url = getShareUrl(session);
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}
