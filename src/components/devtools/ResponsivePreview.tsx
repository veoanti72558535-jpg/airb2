import { useEffect, useRef, useState, useCallback } from 'react';
import { Smartphone, Tablet, Monitor, AlertTriangle, CheckCircle2, RefreshCw, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Internal dev tool — embeds a route in a resizable iframe and watches for
 * horizontal overflow at common breakpoints. Used by /design-system to QA
 * Scope View (and any other dense layout) between 320px → 1440px without
 * leaving the app.
 *
 * Detection strategy: an internal interval polls
 * `iframe.contentDocument.documentElement.scrollWidth` against the iframe's
 * `clientWidth`. A delta > 1px counts as horizontal overflow and triggers a
 * destructive badge for the active preset.
 */

interface Preset {
  id: string;
  label: string;
  icon: React.ElementType;
  width: number;
  /** When true, this preset is part of the "scan all" sweep. */
  scan: boolean;
}

const PRESETS: Preset[] = [
  { id: 'mobile-sm', label: '320', icon: Smartphone, width: 320, scan: true },
  { id: 'mobile', label: '375', icon: Smartphone, width: 375, scan: true },
  { id: 'mobile-lg', label: '414', icon: Smartphone, width: 414, scan: true },
  { id: 'tablet-sm', label: '640', icon: Tablet, width: 640, scan: true },
  { id: 'tablet', label: '768', icon: Tablet, width: 768, scan: true },
  { id: 'tablet-lg', label: '834', icon: Tablet, width: 834, scan: true },
  { id: 'laptop', label: '1024', icon: Monitor, width: 1024, scan: true },
  { id: 'desktop', label: '1280', icon: Monitor, width: 1280, scan: true },
  { id: 'desktop-lg', label: '1440', icon: Monitor, width: 1440, scan: true },
];

interface ScanResult {
  width: number;
  overflow: boolean;
  scrollWidth: number;
  clientWidth: number;
  delta: number;
}

interface Props {
  /** Same-origin path to embed. e.g. "/scope-view". */
  path: string;
  /** Default preset width selected on mount. */
  defaultWidth?: number;
  /** iframe height. */
  height?: number;
}

export function ResponsivePreview({ path, defaultWidth = 768, height = 600 }: Props) {
  const [width, setWidth] = useState(defaultWidth);
  const [liveOverflow, setLiveOverflow] = useState<ScanResult | null>(null);
  const [scanResults, setScanResults] = useState<Record<number, ScanResult>>({});
  const [scanning, setScanning] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Live overflow probe for the current width — runs every 500ms.
  useEffect(() => {
    const probe = () => {
      const iframe = iframeRef.current;
      if (!iframe) return;
      try {
        const doc = iframe.contentDocument;
        if (!doc?.documentElement) return;
        const scrollWidth = doc.documentElement.scrollWidth;
        const clientWidth = iframe.clientWidth;
        const delta = scrollWidth - clientWidth;
        setLiveOverflow({
          width,
          overflow: delta > 1,
          scrollWidth,
          clientWidth,
          delta: Math.max(0, delta),
        });
      } catch {
        // cross-origin — should not happen for same-origin routes
      }
    };
    probe();
    const id = window.setInterval(probe, 500);
    return () => window.clearInterval(id);
  }, [width, reloadKey]);

  // Sweep all preset widths sequentially and collect overflow per breakpoint.
  const runScan = useCallback(async () => {
    setScanning(true);
    const results: Record<number, ScanResult> = {};
    const targets = PRESETS.filter(p => p.scan);
    for (const p of targets) {
      setWidth(p.width);
      // Wait for layout: 1 frame for resize + 250ms for any reflow/transitions.
      await new Promise(r => requestAnimationFrame(() => setTimeout(r, 250)));
      const iframe = iframeRef.current;
      if (iframe?.contentDocument?.documentElement) {
        const scrollWidth = iframe.contentDocument.documentElement.scrollWidth;
        const clientWidth = iframe.clientWidth;
        const delta = scrollWidth - clientWidth;
        results[p.width] = {
          width: p.width,
          overflow: delta > 1,
          scrollWidth,
          clientWidth,
          delta: Math.max(0, delta),
        };
      }
    }
    setScanResults(results);
    setScanning(false);
  }, []);

  const overflowCount = Object.values(scanResults).filter(r => r.overflow).length;
  const isOverflow = liveOverflow?.overflow ?? false;

  return (
    <div className="space-y-3">
      {/* ── Toolbar ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card/50 p-2">
        <div className="flex flex-wrap gap-1">
          {PRESETS.map(p => {
            const Icon = p.icon;
            const result = scanResults[p.width];
            const isActive = width === p.width;
            const hasOverflow = result?.overflow;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setWidth(p.width)}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded text-[11px] font-mono border transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted',
                  hasOverflow && !isActive && 'border-destructive/60 text-destructive',
                )}
                title={
                  result
                    ? `scrollWidth ${result.scrollWidth}px / clientWidth ${result.clientWidth}px${
                        result.overflow ? ` → +${result.delta}px overflow` : ''
                      }`
                    : `${p.width}px`
                }
              >
                <Icon className="h-3 w-3" />
                {p.label}
                {hasOverflow && <AlertTriangle className="h-2.5 w-2.5" />}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <input
            type="range"
            min={280}
            max={1600}
            step={1}
            value={width}
            onChange={e => setWidth(Number(e.target.value))}
            className="w-32 accent-primary"
            aria-label="Custom width"
          />
          <span className="font-mono text-[11px] tabular-nums w-14 text-right">
            {width}px
          </span>
          <button
            type="button"
            onClick={() => setReloadKey(k => k + 1)}
            className="p-1 rounded hover:bg-muted text-muted-foreground"
            title="Reload iframe"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <a
            href={path}
            target="_blank"
            rel="noreferrer"
            className="p-1 rounded hover:bg-muted text-muted-foreground"
            title="Open in new tab"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <button
            type="button"
            onClick={runScan}
            disabled={scanning}
            className="px-2.5 py-1 rounded text-[11px] font-mono bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-wait"
          >
            {scanning ? 'Scanning…' : 'Scan all'}
          </button>
        </div>
      </div>

      {/* ── Live status banner ───────────────────────────────────── */}
      <div
        role="status"
        className={cn(
          'flex items-center gap-2 rounded-lg border p-2.5 text-xs',
          isOverflow
            ? 'border-destructive/40 bg-destructive/10 text-destructive'
            : 'border-emerald-500/30 bg-emerald-500/5 text-emerald-500 dark:text-emerald-400',
        )}
      >
        {isOverflow ? (
          <AlertTriangle className="h-4 w-4 shrink-0" />
        ) : (
          <CheckCircle2 className="h-4 w-4 shrink-0" />
        )}
        <div className="flex-1 min-w-0 font-mono">
          {isOverflow ? (
            <>
              <strong>Horizontal overflow at {width}px</strong> — content scrolls{' '}
              {liveOverflow?.delta}px past viewport (scrollWidth{' '}
              {liveOverflow?.scrollWidth} &gt; {liveOverflow?.clientWidth})
            </>
          ) : (
            <>
              <strong>No overflow at {width}px</strong>
              {liveOverflow && (
                <span className="text-muted-foreground ml-2">
                  scrollWidth {liveOverflow.scrollWidth} ≤ {liveOverflow.clientWidth}
                </span>
              )}
            </>
          )}
        </div>
        {Object.keys(scanResults).length > 0 && (
          <span
            className={cn(
              'shrink-0 px-2 py-0.5 rounded text-[10px] font-semibold border',
              overflowCount > 0
                ? 'border-destructive/40 bg-destructive/10 text-destructive'
                : 'border-emerald-500/30 text-emerald-500 dark:text-emerald-400',
            )}
          >
            scan: {overflowCount} / {Object.keys(scanResults).length} fail
          </span>
        )}
      </div>

      {/* ── Scan summary table (only after running scan) ─────────── */}
      {Object.keys(scanResults).length > 0 && (
        <div className="rounded-lg border border-border bg-card/40 overflow-hidden">
          <table className="w-full text-[11px] font-mono">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left py-1.5 px-2 text-muted-foreground uppercase tracking-wide text-[10px]">
                  Width
                </th>
                <th className="text-right py-1.5 px-2 text-muted-foreground uppercase tracking-wide text-[10px]">
                  Scroll
                </th>
                <th className="text-right py-1.5 px-2 text-muted-foreground uppercase tracking-wide text-[10px]">
                  Client
                </th>
                <th className="text-right py-1.5 px-2 text-muted-foreground uppercase tracking-wide text-[10px]">
                  Delta
                </th>
                <th className="text-right py-1.5 px-2 text-muted-foreground uppercase tracking-wide text-[10px]">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {PRESETS.filter(p => scanResults[p.width]).map(p => {
                const r = scanResults[p.width];
                return (
                  <tr key={p.id} className="border-b border-border/40 last:border-0">
                    <td className="py-1 px-2">{p.width}</td>
                    <td className="text-right py-1 px-2 tabular-nums">{r.scrollWidth}</td>
                    <td className="text-right py-1 px-2 tabular-nums">{r.clientWidth}</td>
                    <td
                      className={cn(
                        'text-right py-1 px-2 tabular-nums',
                        r.overflow ? 'text-destructive font-semibold' : 'text-muted-foreground',
                      )}
                    >
                      {r.overflow ? `+${r.delta}` : '0'}
                    </td>
                    <td className="text-right py-1 px-2">
                      {r.overflow ? (
                        <span className="text-destructive">FAIL</span>
                      ) : (
                        <span className="text-emerald-500 dark:text-emerald-400">PASS</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── iframe stage ─────────────────────────────────────────── */}
      <div className="rounded-lg border border-border bg-[#080a0e] p-3 overflow-auto">
        <div className="mx-auto transition-[width] duration-200" style={{ width }}>
          <iframe
            key={reloadKey}
            ref={iframeRef}
            src={path}
            title={`Responsive preview of ${path}`}
            style={{
              width: '100%',
              height,
              border: `1px solid hsl(var(--border))`,
              borderRadius: 8,
              background: '#0a0a0a',
              display: 'block',
            }}
          />
        </div>
      </div>
    </div>
  );
}