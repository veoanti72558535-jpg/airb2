/**
 * Unit-debug mode — UI-only flag that paints little badges next to every
 * value rendered in the app:
 *
 *  - "SI"  (green)  → reference unit straight from the ballistic engine.
 *                     This is the SOURCE OF TRUTH and can be re-injected
 *                     into another deterministic call without conversion.
 *  - "DSP" (amber)  → display conversion produced by `useUnits().display()`.
 *                     This value is for humans only; feeding it back into
 *                     the engine would silently double-convert and corrupt
 *                     the calculation.
 *
 * Off by default. Lives in a dedicated localStorage key so it never
 * pollutes the synced AppSettings — debug state is per-device and
 * intentionally ephemeral.
 *
 * Toggle:
 *  - Ctrl/⌘+Shift+U   (keyboard)
 *  - Bottom-left chip "Units debug" (mouse / touch)
 */
import { useEffect, useSyncExternalStore } from 'react';

const KEY = 'airballistik-debug-units';

const listeners = new Set<() => void>();

function read(): boolean {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
}

function emit() { listeners.forEach((l) => l()); }

export function setUnitDebug(next: boolean): void {
  try {
    if (next) localStorage.setItem(KEY, '1');
    else localStorage.removeItem(KEY);
  } catch { /* ignore quota/private-mode errors */ }
  emit();
}

export function toggleUnitDebug(): void { setUnitDebug(!read()); }

export function useUnitDebug(): boolean {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    read,
    () => false,
  );
}

/** Wire a global keyboard shortcut once at app boot. */
export function useUnitDebugShortcut(): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'U' || e.key === 'u')) {
        e.preventDefault();
        toggleUnitDebug();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
