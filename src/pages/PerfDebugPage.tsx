import { useMemo } from 'react';
import { Activity, Power, Eraser, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { durationTone, fpsTone, usePerfMonitor } from '@/lib/perf-monitor';

/**
 * /debug/perf — internal performance debug page.
 *
 * Live FPS + a complete log of route transitions with avg/min FPS, long tasks,
 * and a small bar visualization of transition durations.
 */
export default function PerfDebugPage() {
  const perf = usePerfMonitor();

  const stats = useMemo(() => {
    if (perf.transitions.length === 0) return null;
    const durs = perf.transitions.map((t) => t.durationMs);
    const avg = durs.reduce((a, b) => a + b, 0) / durs.length;
    const max = Math.max(...durs);
    const min = Math.min(...durs);
    const slow = durs.filter((d) => d > 300).length;
    return { avg, max, min, slow, count: durs.length };
  }, [perf.transitions]);

  const maxDurForBars = useMemo(
    () => Math.max(300, ...perf.transitions.map((t) => t.durationMs)),
    [perf.transitions],
  );

  return (
    <div className="container max-w-5xl py-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Perf debug
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Mesure FPS et temps de rendu des transitions de navigation. Activez le monitor puis naviguez dans l'app — les transitions s'enregistrent ici.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Power className="h-4 w-4" />
            <span>Monitor</span>
            <Switch checked={perf.enabled} onCheckedChange={(v) => perf.setEnabled(v)} />
          </div>
          <Button variant="outline" size="sm" onClick={perf.clear} disabled={perf.transitions.length === 0}>
            <Eraser className="h-4 w-4 mr-1.5" />
            Clear
          </Button>
        </div>
      </div>

      {!perf.enabled && (
        <Card className="p-4 border-amber-500/30 bg-amber-500/5">
          <p className="text-sm">
            Le monitor est désactivé. Activez-le ci-dessus ou via le raccourci <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted text-xs">Ctrl/⌘ + Shift + P</kbd>.
          </p>
        </Card>
      )}

      {/* Live metrics */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <BigStat label="FPS" value={perf.fps} tone={fpsTone(perf.fps)} />
        <BigStat label="Avg FPS" value={perf.avgFps} tone={fpsTone(perf.avgFps)} />
        <BigStat label="Min FPS" value={perf.minFps} tone={fpsTone(perf.minFps)} />
        <BigStat
          label="Jank %"
          value={`${(perf.jankRatio * 100).toFixed(1)}`}
          tone={perf.jankRatio < 0.05 ? 'text-emerald-400' : perf.jankRatio < 0.15 ? 'text-amber-400' : 'text-destructive'}
        />
        <BigStat label="Long tasks" value={perf.longTasks} />
        <BigStat label="Heap MB" value={perf.memoryMb ?? '—'} />
      </div>

      {/* Transitions summary */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <BigStat label="Transitions" value={stats.count} />
          <BigStat label="Avg ms" value={stats.avg.toFixed(0)} tone={durationTone(stats.avg)} />
          <BigStat label="Min ms" value={stats.min.toFixed(0)} tone={durationTone(stats.min)} />
          <BigStat label="Max ms" value={stats.max.toFixed(0)} tone={durationTone(stats.max)} />
          <BigStat
            label="Slow (>300ms)"
            value={stats.slow}
            tone={stats.slow > 0 ? 'text-destructive' : 'text-emerald-400'}
          />
        </div>
      )}

      {/* Transitions table */}
      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
          <h2 className="font-semibold">Historique des transitions</h2>
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Keyboard className="h-3 w-3" />
            mesure: pathname change → 2× rAF (post-layout)
          </div>
        </div>
        {perf.transitions.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Aucune transition enregistrée. Naviguez dans l'app pour commencer la mesure.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground bg-muted/30">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">#</th>
                  <th className="text-left px-3 py-2 font-medium">From</th>
                  <th className="text-left px-3 py-2 font-medium">To</th>
                  <th className="text-right px-3 py-2 font-medium">Durée (ms)</th>
                  <th className="px-3 py-2 font-medium w-[24%]">Bar</th>
                  <th className="text-right px-3 py-2 font-medium">Avg FPS</th>
                  <th className="text-right px-3 py-2 font-medium">Min FPS</th>
                  <th className="text-right px-3 py-2 font-medium">Long tasks</th>
                </tr>
              </thead>
              <tbody>
                {perf.transitions.map((t, i) => {
                  const pct = Math.min(100, (t.durationMs / maxDurForBars) * 100);
                  return (
                    <tr key={i} className="border-t border-border/30 hover:bg-muted/20">
                      <td className="px-3 py-2 text-muted-foreground tabular-nums">{i + 1}</td>
                      <td className="px-3 py-2 font-mono text-xs">{t.from}</td>
                      <td className="px-3 py-2 font-mono text-xs text-primary">{t.to}</td>
                      <td className={cn('px-3 py-2 text-right font-semibold tabular-nums', durationTone(t.durationMs))}>
                        {t.durationMs.toFixed(1)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="h-2 rounded bg-muted/40 overflow-hidden">
                          <div
                            className={cn(
                              'h-full',
                              t.durationMs <= 120 ? 'bg-emerald-500/70' : t.durationMs <= 300 ? 'bg-amber-500/70' : 'bg-destructive/70',
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </td>
                      <td className={cn('px-3 py-2 text-right tabular-nums', fpsTone(t.avgFps))}>{t.avgFps || '—'}</td>
                      <td className={cn('px-3 py-2 text-right tabular-nums', fpsTone(t.minFps))}>{t.minFps || '—'}</td>
                      <td className={cn('px-3 py-2 text-right tabular-nums', t.longTasks > 0 ? 'text-destructive' : 'text-muted-foreground')}>
                        {t.longTasks}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="text-xs text-muted-foreground">
        <strong>Seuils:</strong> vert ≤120ms · ambre ≤300ms · rouge >300ms. FPS: vert ≥55, ambre ≥40, rouge sinon.
        Le monitor consomme un rAF continu — désactivez-le en production.
      </div>
    </div>
  );
}

function BigStat({ label, value, tone }: { label: string; value: number | string; tone?: string }) {
  return (
    <Card className="p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn('text-2xl font-bold tabular-nums', tone ?? 'text-foreground')}>{value}</div>
    </Card>
  );
}
