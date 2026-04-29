import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, X, Eraser, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { durationTone, fpsTone, usePerfMonitor } from '@/lib/perf-monitor';

/**
 * Floating performance overlay.
 *
 * - Toggle with Ctrl/Cmd+Shift+P (also persists via localStorage).
 * - Shows live FPS, jank ratio, long tasks, memory, and recent route transitions.
 * - Pointer-events disabled on the FPS chip so it never blocks UI clicks.
 */
export function PerfOverlay() {
  const perf = usePerfMonitor();
  const [expanded, setExpanded] = useState(false);

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
        e.preventDefault();
        perf.setEnabled((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [perf]);

  if (!perf.enabled) return null;

  const last = perf.transitions[0];

  return (
    <div className="fixed bottom-3 right-3 z-[9999] font-mono text-[11px] select-none">
      {!expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className={cn(
            'flex items-center gap-2 rounded-md border border-border/60 bg-background/85 px-2.5 py-1.5 shadow-lg backdrop-blur',
            'hover:bg-background/95 transition-colors',
          )}
          aria-label="Open performance panel"
        >
          <Activity className="h-3 w-3 text-primary" />
          <span className={cn('font-semibold tabular-nums', fpsTone(perf.fps))}>{perf.fps} fps</span>
          {last && (
            <span className={cn('tabular-nums opacity-80', durationTone(last.durationMs))}>
              · {last.durationMs.toFixed(0)}ms
            </span>
          )}
        </button>
      ) : (
        <div className="w-[320px] rounded-lg border border-border/60 bg-background/95 p-3 shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-foreground">
              <Activity className="h-3.5 w-3.5 text-primary" />
              <span className="font-semibold">Perf monitor</span>
            </div>
            <div className="flex items-center gap-1">
              <Link
                to="/debug/perf"
                className="rounded p-1 hover:bg-muted/60"
                title="Open full panel"
              >
                <ExternalLink className="h-3 w-3" />
              </Link>
              <button
                type="button"
                onClick={perf.clear}
                className="rounded p-1 hover:bg-muted/60"
                title="Clear transitions"
              >
                <Eraser className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="rounded p-1 hover:bg-muted/60"
                title="Collapse"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <Stat label="FPS" value={`${perf.fps}`} tone={fpsTone(perf.fps)} />
            <Stat label="Avg FPS" value={`${perf.avgFps}`} tone={fpsTone(perf.avgFps)} />
            <Stat label="Min FPS" value={`${perf.minFps}`} tone={fpsTone(perf.minFps)} />
            <Stat
              label="Jank"
              value={`${(perf.jankRatio * 100).toFixed(1)}%`}
              tone={perf.jankRatio < 0.05 ? 'text-emerald-400' : perf.jankRatio < 0.15 ? 'text-amber-400' : 'text-destructive'}
            />
            <Stat label="Long tasks" value={`${perf.longTasks}`} />
            <Stat label="Heap" value={perf.memoryMb != null ? `${perf.memoryMb} MB` : '—'} />
          </div>

          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Recent transitions
          </div>
          <div className="max-h-44 overflow-auto rounded border border-border/40 bg-muted/20 divide-y divide-border/30">
            {perf.transitions.length === 0 ? (
              <div className="px-2 py-2 text-muted-foreground">Navigate to record…</div>
            ) : (
              perf.transitions.slice(0, 10).map((t, i) => (
                <div key={i} className="px-2 py-1.5 flex items-center justify-between gap-2">
                  <span className="truncate text-foreground/90">
                    {t.from} → <span className="text-primary">{t.to}</span>
                  </span>
                  <span className={cn('tabular-nums font-semibold shrink-0', durationTone(t.durationMs))}>
                    {t.durationMs.toFixed(0)}ms
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="mt-2 text-[10px] text-muted-foreground">
            Ctrl/⌘+Shift+P to toggle · /debug/perf for history
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded border border-border/40 bg-muted/20 px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn('text-sm font-semibold tabular-nums', tone ?? 'text-foreground')}>{value}</div>
    </div>
  );
}
