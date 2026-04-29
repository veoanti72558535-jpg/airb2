import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Performance monitor — measures rolling FPS and per-route transition timings.
 *
 * - FPS sampler: requestAnimationFrame loop, updates `fps` ~4× per second.
 * - Route transition timing: between a `pathname` change and the first 2 RAFs
 *   that follow once layout has settled (post-Suspense fallback resolved).
 * - Long task observer: counts >50ms long tasks (Chromium only).
 *
 * Zero impact when disabled. Enable via `usePerfMonitor().setEnabled(true)`,
 * the floating panel (Ctrl/Cmd+Shift+P), or `/debug/perf` page.
 */

export type RouteTransition = {
  from: string;
  to: string;
  /** Time between pathname change and first paint after layout settled (ms). */
  durationMs: number;
  /** Avg FPS during the transition window. */
  avgFps: number;
  /** Min FPS observed during the transition window. */
  minFps: number;
  /** Long tasks (>50ms) counted during the transition. */
  longTasks: number;
  at: number;
};

type PerfState = {
  enabled: boolean;
  fps: number;
  avgFps: number;
  minFps: number;
  jankRatio: number;
  longTasks: number;
  memoryMb: number | null;
  transitions: RouteTransition[];
  setEnabled: (v: boolean | ((p: boolean) => boolean)) => void;
  clear: () => void;
};

const PerfCtx = createContext<PerfState | null>(null);

const STORAGE_KEY = 'airballistik:perf-monitor:enabled';
const MAX_TRANSITIONS = 50;

export function PerfMonitorProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabledState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });

  const [fps, setFps] = useState(0);
  const [avgFps, setAvgFps] = useState(0);
  const [minFps, setMinFps] = useState(0);
  const [jankRatio, setJankRatio] = useState(0);
  const [longTasks, setLongTasks] = useState(0);
  const [memoryMb, setMemoryMb] = useState<number | null>(null);
  const [transitions, setTransitions] = useState<RouteTransition[]>([]);

  const lastTimeRef = useRef<number>(0);
  const frameCountRef = useRef(0);
  const frameTimesRef = useRef<number[]>([]);
  const lastSampleRef = useRef<number>(performance.now());
  const longTasksRef = useRef(0);
  const transitionRef = useRef<{
    from: string;
    to: string;
    start: number;
    framesFps: number[];
    longTasksStart: number;
  } | null>(null);

  const setEnabled = useCallback((v: boolean | ((p: boolean) => boolean)) => {
    setEnabledState((prev) => {
      const next = typeof v === 'function' ? v(prev) : v;
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => setTransitions([]), []);

  // ── FPS loop ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) {
      setFps(0);
      setAvgFps(0);
      setMinFps(0);
      setJankRatio(0);
      return;
    }

    let rafId = 0;
    lastTimeRef.current = performance.now();
    lastSampleRef.current = performance.now();
    frameCountRef.current = 0;
    frameTimesRef.current = [];

    const tick = (t: number) => {
      const dt = t - lastTimeRef.current;
      lastTimeRef.current = t;
      frameCountRef.current += 1;
      frameTimesRef.current.push(dt);
      if (frameTimesRef.current.length > 240) frameTimesRef.current.shift();

      if (t - lastSampleRef.current >= 250) {
        const elapsed = (t - lastSampleRef.current) / 1000;
        const currentFps = elapsed > 0 ? frameCountRef.current / elapsed : 0;
        const frames = frameTimesRef.current;
        const sum = frames.reduce((a, b) => a + b, 0);
        const avg = frames.length ? frames.length / (sum / 1000) : 0;
        const worstFrame = frames.length ? Math.max(...frames) : 0;
        const minF = worstFrame > 0 ? 1000 / worstFrame : 0;
        const janky = frames.filter((f) => f > 50).length;
        const jank = frames.length ? janky / frames.length : 0;

        setFps(Math.round(currentFps));
        setAvgFps(Math.round(avg));
        setMinFps(Math.round(minF));
        setJankRatio(jank);

        const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
        if (mem) setMemoryMb(Math.round(mem.usedJSHeapSize / (1024 * 1024)));

        frameCountRef.current = 0;
        lastSampleRef.current = t;

        if (transitionRef.current) {
          transitionRef.current.framesFps.push(currentFps);
        }
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [enabled]);

  // ── Long task observer ────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    if (typeof PerformanceObserver === 'undefined') return;
    let observer: PerformanceObserver | null = null;
    try {
      observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        longTasksRef.current += entries.length;
        setLongTasks((n) => n + entries.length);
      });
      observer.observe({ entryTypes: ['longtask'] });
    } catch {
      /* longtask not supported */
    }
    return () => observer?.disconnect();
  }, [enabled]);

  const value = useMemo<PerfState>(
    () => ({
      enabled,
      fps,
      avgFps,
      minFps,
      jankRatio,
      longTasks,
      memoryMb,
      transitions,
      setEnabled,
      clear,
    }),
    [enabled, fps, avgFps, minFps, jankRatio, longTasks, memoryMb, transitions, setEnabled, clear],
  );

  return (
    <PerfCtx.Provider value={value}>
      <PerfRouteTracker
        enabled={enabled}
        transitionRef={transitionRef}
        longTasksRef={longTasksRef}
        onTransition={(t) =>
          setTransitions((prev) => {
            const next = [t, ...prev];
            if (next.length > MAX_TRANSITIONS) next.length = MAX_TRANSITIONS;
            return next;
          })
        }
      />
      {children}
    </PerfCtx.Provider>
  );
}

function PerfRouteTracker({
  enabled,
  transitionRef,
  longTasksRef,
  onTransition,
}: {
  enabled: boolean;
  transitionRef: React.MutableRefObject<{
    from: string;
    to: string;
    start: number;
    framesFps: number[];
    longTasksStart: number;
  } | null>;
  longTasksRef: React.MutableRefObject<number>;
  onTransition: (t: RouteTransition) => void;
}) {
  const location = useLocation();
  const prevPathRef = useRef<string>(location.pathname);

  useEffect(() => {
    if (!enabled) {
      prevPathRef.current = location.pathname;
      return;
    }
    const from = prevPathRef.current;
    const to = location.pathname;
    if (from === to) return;

    const start = performance.now();
    transitionRef.current = {
      from,
      to,
      start,
      framesFps: [],
      longTasksStart: longTasksRef.current,
    };

    let raf1 = 0;
    let raf2 = 0;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const end = performance.now();
        const cur = transitionRef.current;
        if (!cur) return;
        const fpsSamples = cur.framesFps;
        const avg = fpsSamples.length
          ? fpsSamples.reduce((a, b) => a + b, 0) / fpsSamples.length
          : 0;
        const min = fpsSamples.length ? Math.min(...fpsSamples) : 0;
        const lt = longTasksRef.current - cur.longTasksStart;
        onTransition({
          from: cur.from,
          to: cur.to,
          durationMs: Math.round((end - cur.start) * 100) / 100,
          avgFps: Math.round(avg),
          minFps: Math.round(min),
          longTasks: lt,
          at: Date.now(),
        });
        transitionRef.current = null;
      });
    });

    prevPathRef.current = to;
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, enabled]);

  return null;
}

export function usePerfMonitor(): PerfState {
  const ctx = useContext(PerfCtx);
  if (!ctx) {
    throw new Error('usePerfMonitor must be used within PerfMonitorProvider');
  }
  return ctx;
}

export function fpsTone(fps: number): string {
  if (fps >= 55) return 'text-emerald-400';
  if (fps >= 40) return 'text-amber-400';
  return 'text-destructive';
}

export function durationTone(ms: number): string {
  if (ms <= 120) return 'text-emerald-400';
  if (ms <= 300) return 'text-amber-400';
  return 'text-destructive';
}
