import { useCallback } from 'react';

/**
 * Returns a keyboard handler that turns a vertical (or horizontal) list of
 * focusable children into a WAI-ARIA "roving focus" group:
 *
 *   - ArrowDown / ArrowRight → next focusable
 *   - ArrowUp / ArrowLeft   → previous focusable
 *   - Home                  → first focusable
 *   - End                   → last focusable
 *
 * The list of focusable items is recomputed on every keypress so it stays in
 * sync with conditional rendering (collapsed sidebar, locale switch, etc.).
 *
 * Native Tab / Shift+Tab order is preserved untouched — this only adds the
 * arrow-key affordance recommended by the APG sidebar pattern. Active route
 * styling and `aria-current="page"` continue to live on `RailItem`.
 */
export function useRovingFocus(orientation: 'vertical' | 'horizontal' = 'vertical') {
  return useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      const nextKey = orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight';
      const prevKey = orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft';
      if (
        e.key !== nextKey &&
        e.key !== prevKey &&
        e.key !== 'Home' &&
        e.key !== 'End'
      ) {
        return;
      }
      const root = e.currentTarget;
      const selector =
        'a[href]:not([aria-hidden="true"]), button:not([disabled]):not([aria-hidden="true"]), [tabindex]:not([tabindex="-1"]):not([aria-hidden="true"])';
      const items = Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(
        (el) => el.offsetParent !== null,
      );
      if (items.length === 0) return;
      const active = document.activeElement as HTMLElement | null;
      const idx = active ? items.indexOf(active) : -1;
      let target: HTMLElement | undefined;
      if (e.key === 'Home') target = items[0];
      else if (e.key === 'End') target = items[items.length - 1];
      else if (e.key === nextKey) target = items[(idx + 1 + items.length) % items.length];
      else if (e.key === prevKey) target = items[(idx - 1 + items.length) % items.length];
      if (target) {
        e.preventDefault();
        target.focus();
      }
    },
    [orientation],
  );
}
