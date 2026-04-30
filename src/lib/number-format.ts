/**
 * Display-only number formatter.
 *
 * Single source of truth for how numeric values are rendered across
 * the app once the ballistic engine has produced them in SI reference.
 * The engine itself NEVER calls into this file — it would defeat the
 * determinism contract enforced by
 * `ballistics-units-determinism.test.ts`.
 *
 * Three orthogonal knobs (all live in `AppSettings.numberFormat`):
 *   • `decimals`        : 0..6, or `undefined` for the auto heuristic
 *                         (≥100 → 0, otherwise 2). Auto matches the
 *                         legacy behaviour of every existing surface,
 *                         so any consumer that omits the setting keeps
 *                         rendering the exact same strings.
 *   • `scientific`      : forces "1.23e-4"-style notation when |value|
 *                         falls outside [1e-3, 1e6). Useful for very
 *                         small BCs or very large kJ readings.
 *   • `groupThousands`  : insert the active locale's thousands
 *                         separator (NBSP in fr, comma in en). On by
 *                         default.
 *
 * Pure function — no React, no localStorage. The caller (`useNumberFormat`)
 * pulls the prefs and the locale.
 */

export interface NumberFormatPrefs {
  decimals?: number;
  scientific?: boolean;
  groupThousands?: boolean;
}

const AUTO_LOW_THRESHOLD = 1e-3;
const AUTO_HIGH_THRESHOLD = 1e6;
/** Hard clamp — protects `Number.prototype.toFixed` from RangeError. */
const MAX_DECIMALS = 6;

export function clampDecimals(d: number | undefined): number | undefined {
  if (d === undefined) return undefined;
  if (!Number.isFinite(d)) return undefined;
  return Math.max(0, Math.min(MAX_DECIMALS, Math.round(d)));
}

/**
 * Format `value` according to `prefs` and `locale`.
 *
 * Returns "—" for non-finite inputs (`NaN`, `±Infinity`) so consumers
 * don't need to defensive-check before calling.
 */
export function formatNumber(
  value: number,
  prefs: NumberFormatPrefs = {},
  locale: 'fr' | 'en' = 'fr',
): string {
  if (!Number.isFinite(value)) return '—';

  const decimals = clampDecimals(prefs.decimals);
  const scientific = prefs.scientific === true;
  const group = prefs.groupThousands !== false; // default true

  const abs = Math.abs(value);

  // Scientific path — keep `decimals` (or 2 by default) as the
  // mantissa precision. Sign and zero pass through unchanged.
  if (scientific && value !== 0 && (abs < AUTO_LOW_THRESHOLD || abs >= AUTO_HIGH_THRESHOLD)) {
    return value.toExponential(decimals ?? 2);
  }

  // Non-scientific path — use Intl for locale-aware grouping.
  const effectiveDecimals =
    decimals !== undefined ? decimals : abs >= 100 ? 0 : 2;

  return new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : 'en-US', {
    minimumFractionDigits: effectiveDecimals,
    maximumFractionDigits: effectiveDecimals,
    useGrouping: group,
  }).format(value);
}
