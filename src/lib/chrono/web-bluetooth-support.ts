/**
 * Web Bluetooth compatibility detection.
 *
 * Web Bluetooth is only available in Chromium-based browsers (Chrome, Edge,
 * Opera, Brave, Samsung Internet) on most desktop OS and on Android. It is
 * NOT supported in Firefox, Safari, or iOS (any browser, since all iOS
 * browsers use WebKit).
 *
 * Even when the API exists, `navigator.bluetooth.requestDevice` will fail
 * if the page is not served over a secure context (HTTPS or localhost) or
 * if the OS-level Bluetooth is disabled.
 *
 * This module provides a single `detectWebBluetoothSupport()` helper that
 * returns a structured diagnosis usable by the UI to render a contextual
 * guide.
 */

export type SupportLevel = 'supported' | 'partial' | 'unsupported';

export type SupportReason =
  | 'ok'
  | 'no-navigator'
  | 'insecure-context'
  | 'no-bluetooth-api'
  | 'no-request-device'
  | 'ios-webkit'
  | 'firefox'
  | 'safari';

export interface BrowserInfo {
  /** Coarse browser family. */
  family: 'chrome' | 'edge' | 'firefox' | 'safari' | 'opera' | 'samsung' | 'brave' | 'other';
  /** Coarse OS family. */
  os: 'android' | 'ios' | 'macos' | 'windows' | 'linux' | 'chromeos' | 'other';
  /** Whether this OS+browser combo is fundamentally incompatible (iOS / Firefox). */
  fundamentallyIncompatible: boolean;
}

export interface WebBluetoothSupport {
  level: SupportLevel;
  reason: SupportReason;
  /** Browser/OS guess used to render targeted guidance. */
  browser: BrowserInfo;
  /** True when window.isSecureContext is true. */
  secureContext: boolean;
  /** True when navigator.bluetooth is present. */
  hasBluetoothApi: boolean;
  /** True when navigator.bluetooth.requestDevice is callable. */
  hasRequestDevice: boolean;
}

/** Parse navigator.userAgent into a coarse browser+OS guess. SSR-safe. */
export function detectBrowser(ua?: string): BrowserInfo {
  const userAgent = ua ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '');
  const u = userAgent.toLowerCase();

  // OS detection
  let os: BrowserInfo['os'] = 'other';
  if (/android/.test(u)) os = 'android';
  else if (/iphone|ipad|ipod/.test(u)) os = 'ios';
  else if (/cros/.test(u)) os = 'chromeos';
  else if (/mac os x|macintosh/.test(u)) os = 'macos';
  else if (/windows/.test(u)) os = 'windows';
  else if (/linux/.test(u)) os = 'linux';

  // Browser detection — order matters (Edge/Opera/Brave include "chrome" in UA)
  let family: BrowserInfo['family'] = 'other';
  if (/edg\//.test(u)) family = 'edge';
  else if (/opr\/|opera/.test(u)) family = 'opera';
  else if (/samsungbrowser/.test(u)) family = 'samsung';
  // Brave doesn't expose itself in UA — best-effort flag detection happens at runtime
  else if (/firefox|fxios/.test(u)) family = 'firefox';
  else if (/chrome\//.test(u) && !/edg\//.test(u)) family = 'chrome';
  else if (/safari/.test(u) && !/chrome|crios|fxios/.test(u)) family = 'safari';
  else if (/crios/.test(u)) family = 'chrome'; // Chrome on iOS — still WebKit underneath

  // iOS forces all browsers onto WebKit → no Web Bluetooth, period.
  // Firefox has explicitly refused to ship Web Bluetooth.
  // Safari (any platform) doesn't ship it either.
  const fundamentallyIncompatible =
    os === 'ios' || family === 'firefox' || family === 'safari';

  return { family, os, fundamentallyIncompatible };
}

/**
 * Diagnose Web Bluetooth availability and return a structured result the UI
 * can branch on to show the appropriate guide.
 */
export function detectWebBluetoothSupport(): WebBluetoothSupport {
  const browser = detectBrowser();

  if (typeof navigator === 'undefined' || typeof window === 'undefined') {
    return {
      level: 'unsupported',
      reason: 'no-navigator',
      browser,
      secureContext: false,
      hasBluetoothApi: false,
      hasRequestDevice: false,
    };
  }

  const secureContext = window.isSecureContext === true;
  const hasBluetoothApi = 'bluetooth' in navigator && !!(navigator as Navigator).bluetooth;
  const hasRequestDevice =
    hasBluetoothApi &&
    typeof (navigator as Navigator).bluetooth?.requestDevice === 'function';

  // Order of precedence for the reason — the UI uses it to pick the guide.
  let reason: SupportReason = 'ok';
  let level: SupportLevel = 'supported';

  if (browser.os === 'ios') {
    reason = 'ios-webkit';
    level = 'unsupported';
  } else if (browser.family === 'firefox') {
    reason = 'firefox';
    level = 'unsupported';
  } else if (browser.family === 'safari') {
    reason = 'safari';
    level = 'unsupported';
  } else if (!secureContext) {
    reason = 'insecure-context';
    level = 'unsupported';
  } else if (!hasBluetoothApi) {
    reason = 'no-bluetooth-api';
    level = 'unsupported';
  } else if (!hasRequestDevice) {
    reason = 'no-request-device';
    level = 'partial';
  }

  return {
    level,
    reason,
    browser,
    secureContext,
    hasBluetoothApi,
    hasRequestDevice,
  };
}
