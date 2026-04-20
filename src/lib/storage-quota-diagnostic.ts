/**
 * Tranche Admin Storage — Diagnostic global de capacité navigateur.
 *
 * Lecture seule, aucun side-effect, aucun polling. Encapsule
 * `navigator.storage.estimate()` derrière un snapshot stable et honnête :
 *  - si l'API n'est pas exposée → `supported: false`
 *  - si l'API renvoie des champs partiels → on garde `null` plutôt que
 *    d'inventer une valeur
 *  - si l'API rejette → `supported: false` + message court
 *
 * Le seuil qualitatif (`severity`) est volontairement large : c'est une
 * estimation navigateur, pas une métrique exacte. Voir critères ci-dessous.
 */

export type QuotaSeverity = 'normal' | 'watch' | 'critical' | 'unknown';

export interface StorageQuotaDiagnostic {
  /** L'API `navigator.storage.estimate` est-elle utilisable ? */
  supported: boolean;
  /** Octets utilisés estimés. `null` si non communiqué. */
  usageBytes: number | null;
  /** Quota total estimé en octets. `null` si non communiqué. */
  quotaBytes: number | null;
  /** Pourcentage 0..100 si calculable, sinon `null`. */
  usagePercent: number | null;
  /** Indication qualitative pour bandeau UI. */
  severity: QuotaSeverity;
  /** Message court d'erreur si l'API a rejeté ou n'existe pas. */
  errorHint: string | null;
}

/** Seuils volontairement larges — c'est une estimation navigateur. */
export const QUOTA_WATCH_PERCENT = 70;
export const QUOTA_CRITICAL_PERCENT = 90;

function classify(percent: number | null): QuotaSeverity {
  if (percent == null) return 'unknown';
  if (percent >= QUOTA_CRITICAL_PERCENT) return 'critical';
  if (percent >= QUOTA_WATCH_PERCENT) return 'watch';
  return 'normal';
}

/**
 * Snapshot read-only de la capacité de stockage du navigateur.
 * Ne modifie jamais l'état, ne déclenche jamais de polling.
 */
export async function getStorageQuotaDiagnostic(): Promise<StorageQuotaDiagnostic> {
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  const estimate = nav?.storage?.estimate?.bind(nav.storage);

  if (typeof estimate !== 'function') {
    return {
      supported: false,
      usageBytes: null,
      quotaBytes: null,
      usagePercent: null,
      severity: 'unknown',
      errorHint: 'navigator.storage.estimate unavailable',
    };
  }

  try {
    const result = await estimate();
    const usage = typeof result.usage === 'number' && result.usage >= 0 ? result.usage : null;
    const quota = typeof result.quota === 'number' && result.quota > 0 ? result.quota : null;
    const percent =
      usage != null && quota != null ? Math.min(100, Math.round((usage / quota) * 1000) / 10) : null;

    return {
      supported: true,
      usageBytes: usage,
      quotaBytes: quota,
      usagePercent: percent,
      severity: classify(percent),
      errorHint: null,
    };
  } catch (err) {
    return {
      supported: false,
      usageBytes: null,
      quotaBytes: null,
      usagePercent: null,
      severity: 'unknown',
      errorHint: err instanceof Error ? err.message : 'estimate() rejected',
    };
  }
}

/** Formate un nombre d'octets en MB avec 1 décimale (UI compacte). */
export function formatBytesMB(bytes: number | null): string {
  if (bytes == null) return '—';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  if (mb >= 10) return `${mb.toFixed(0)} MB`;
  return `${mb.toFixed(1)} MB`;
}