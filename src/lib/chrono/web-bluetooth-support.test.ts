import { describe, it, expect } from 'vitest';
import { detectBrowser, detectWebBluetoothSupport } from './web-bluetooth-support';

describe('detectBrowser', () => {
  it('detects iPhone Safari', () => {
    const b = detectBrowser(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    );
    expect(b.os).toBe('ios');
    expect(b.family).toBe('safari');
    expect(b.fundamentallyIncompatible).toBe(true);
  });

  it('detects Chrome on iOS (still WebKit)', () => {
    const b = detectBrowser(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/120.0.0.0 Mobile/15E148 Safari/604.1',
    );
    expect(b.os).toBe('ios');
    expect(b.fundamentallyIncompatible).toBe(true); // iOS
  });

  it('detects Firefox desktop', () => {
    const b = detectBrowser(
      'Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0',
    );
    expect(b.family).toBe('firefox');
    expect(b.os).toBe('linux');
    expect(b.fundamentallyIncompatible).toBe(true);
  });

  it('detects Chrome on Android', () => {
    const b = detectBrowser(
      'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    );
    expect(b.family).toBe('chrome');
    expect(b.os).toBe('android');
    expect(b.fundamentallyIncompatible).toBe(false);
  });

  it('detects Edge on Windows', () => {
    const b = detectBrowser(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    );
    expect(b.family).toBe('edge');
    expect(b.os).toBe('windows');
    expect(b.fundamentallyIncompatible).toBe(false);
  });

  it('detects Safari on macOS', () => {
    const b = detectBrowser(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    );
    expect(b.family).toBe('safari');
    expect(b.os).toBe('macos');
    expect(b.fundamentallyIncompatible).toBe(true);
  });
});

describe('detectWebBluetoothSupport', () => {
  it('returns a structured result with the four diagnostic flags', () => {
    const r = detectWebBluetoothSupport();
    expect(r).toHaveProperty('level');
    expect(r).toHaveProperty('reason');
    expect(r).toHaveProperty('browser');
    expect(typeof r.secureContext).toBe('boolean');
    expect(typeof r.hasBluetoothApi).toBe('boolean');
    expect(typeof r.hasRequestDevice).toBe('boolean');
  });

  it('reports unsupported when navigator.bluetooth is missing (jsdom default)', () => {
    // jsdom does not expose navigator.bluetooth — confirm the helper detects it.
    const r = detectWebBluetoothSupport();
    // Either the browser is fundamentally incompatible OR the API is missing
    // — both are acceptable "unsupported" outcomes in a test env.
    expect(['unsupported', 'partial']).toContain(r.level);
  });
});
