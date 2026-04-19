import { useCallback, useEffect, useRef, useState } from 'react';

interface VirtualListOptions {
  /** Number of items to render. */
  itemCount: number;
  /** Fixed pixel height of every row (must be > 0). */
  itemHeight: number;
  /** Extra rows to render above & below the viewport — smooths fast scrolls. */
  overscan?: number;
}

interface VirtualListResult {
  /** Attach to the SCROLLABLE container. */
  containerRef: React.RefObject<HTMLDivElement>;
  /** Inclusive index of the first visible row. */
  startIndex: number;
  /** Exclusive index of the row just past the last visible row. */
  endIndex: number;
  /** Top spacer height (px). */
  paddingTop: number;
  /** Bottom spacer height (px). */
  paddingBottom: number;
  /** Total content height in px (= itemCount * itemHeight). */
  totalHeight: number;
  /** Imperative scroll-to-top helper (used when filters change). */
  scrollToTop: () => void;
}

/**
 * Tranche M — minimal fixed-height list virtualization.
 *
 * No external dependency. Renders only the rows visible in the scroll viewport
 * (plus a small overscan). Designed for the projectile picker where rows are
 * compact and roughly uniform in height.
 *
 * Caller is responsible for wrapping rows so the OUTER scroll container has
 * `paddingTop` / `paddingBottom` (or two spacer divs of those heights).
 */
export function useVirtualList({
  itemCount,
  itemHeight,
  overscan = 6,
}: VirtualListOptions): VirtualListResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  // Track viewport size & scroll position.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onScroll = () => setScrollTop(el.scrollTop);
    const measure = () => setViewportHeight(el.clientHeight);

    measure();
    el.addEventListener('scroll', onScroll, { passive: true });

    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(measure);
      ro.observe(el);
    } else {
      window.addEventListener('resize', measure);
    }

    return () => {
      el.removeEventListener('scroll', onScroll);
      ro?.disconnect();
      if (!ro) window.removeEventListener('resize', measure);
    };
  }, []);

  const safeHeight = itemHeight > 0 ? itemHeight : 1;
  // When viewport hasn't been measured yet (jsdom, hidden), still render a
  // sensible window so tests and the first paint don't show 0 rows.
  const effectiveViewport = viewportHeight > 0 ? viewportHeight : safeHeight * 12;

  const rawStart = Math.floor(scrollTop / safeHeight) - overscan;
  const startIndex = Math.max(0, rawStart);
  const visibleCount = Math.ceil(effectiveViewport / safeHeight) + overscan * 2;
  const endIndex = Math.min(itemCount, startIndex + visibleCount);

  const paddingTop = startIndex * safeHeight;
  const paddingBottom = Math.max(0, (itemCount - endIndex) * safeHeight);
  const totalHeight = itemCount * safeHeight;

  const scrollToTop = useCallback(() => {
    const el = containerRef.current;
    if (el) el.scrollTop = 0;
    setScrollTop(0);
  }, []);

  return {
    containerRef,
    startIndex,
    endIndex,
    paddingTop,
    paddingBottom,
    totalHeight,
    scrollToTop,
  };
}
