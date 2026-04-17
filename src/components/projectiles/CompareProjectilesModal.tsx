import { useEffect, useMemo, useRef, useState } from 'react';
import { X, GitCompare, Gauge, RotateCcw, Target, Download, Maximize2, Minimize2, Copy, Check, FileText, ChevronDown, ChevronRight, EyeOff, GripVertical, ListOrdered, ArrowLeftRight } from 'lucide-react';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
  useSortable,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { Projectile, WeatherSnapshot } from '@/lib/types';
import { getSettings } from '@/lib/storage';
import { calculateTrajectory } from '@/lib/ballistics';
import { useI18n } from '@/lib/i18n';
import { useUnits } from '@/hooks/use-units';
import { cn } from '@/lib/utils';
import { HoverHint } from '@/components/ui/hover-hint';
import { toast } from 'sonner';

const MIN_V = 200;
const MAX_V = 380;
const DEFAULT_V = 280;
const MIN_Z = 10;
const MAX_Z = 50;
const DEFAULT_Z = 30;

interface Props {
  projectiles: Projectile[];
  open: boolean;
  onClose: () => void;
  onRemove: (id: string) => void;
  /** Muzzle velocity used for the simulation (m/s). */
  muzzleVelocity?: number;
}

const COMPARE_RANGES = [25, 50, 75, 100] as const;
const CHART_STEP = 5; // m — fine sampling for the SVG drop chart
const CHART_MAX = 100; // m
/** Default fallback when no setting is stored — UK FAC threshold (12 ft·lb ≈ 16.27 J). */
const DEFAULT_FAC_J = 16.27;

/** Distinct hues for up to 4 projectiles. Tuned for dark + light themes. */
const SERIES_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--tactical))',
  'hsl(199 89% 60%)', // sky
  'hsl(280 70% 65%)', // violet
] as const;

function neutralWeather(): WeatherSnapshot {
  return {
    temperature: 15,
    humidity: 50,
    pressure: 1013.25,
    altitude: 0,
    windSpeed: 0,
    windAngle: 90,
    source: 'manual',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Side-by-side projectile comparison: weight, BC, drag model, and a quick
 * trajectory preview at 25/50/75/100 m using a neutral atmosphere.
 *
 * Velocity is identical for all projectiles (default 280 m/s) so the drop
 * differences truly reflect ballistic behaviour, not muzzle energy.
 */
export function CompareProjectilesModal({
  projectiles,
  open,
  onClose,
  onRemove,
  muzzleVelocity: initialVelocity = DEFAULT_V,
}: Props) {
  const { t } = useI18n();
  const { symbol } = useUnits();
  /**
   * Energy threshold (J) read from settings — `null`/`undefined` means the user
   * disabled the highlight in Settings. Falls back to UK FAC if missing.
   */
  const energyThresholdJ = useMemo(() => {
    const s = getSettings();
    // Distinguish explicit `null` (= disabled) from missing (= legacy/default).
    return s.energyThresholdJ === undefined ? DEFAULT_FAC_J : s.energyThresholdJ;
  }, [open]);
  const [velocity, setVelocity] = useState<number>(initialVelocity);
  const [zeroRange, setZeroRange] = useState<number>(DEFAULT_Z);
  const [exporting, setExporting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [copying, setCopying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  /** Distance currently hovered in the DropChart (in meters) — synchronises sparklines. */
  const [hoverRange, setHoverRange] = useState<number | null>(null);
  /** Sort mode override — `null` = auto (useful range when threshold set, BC otherwise). */
  const [sortMode, setSortMode] = useState<'usefulRange' | 'bc' | 'weight' | null>(null);
  /** When true, columns are reorderable via drag-and-drop and `manualOrder` overrides auto-sort. */
  const [manualMode, setManualMode] = useState(false);
  /**
   * User-defined column order, as an array of projectile ids. Persisted in localStorage
   * keyed by the sorted set of currently-selected projectile ids — so the order only
   * applies when comparing the exact same set of projectiles again.
   */
  const [manualOrder, setManualOrder] = useState<string[] | null>(null);
  /** Stable storage key for the current selection (sorted ids). */
  const selectionKey = useMemo(
    () => projectiles.map(p => p.id).sort().join('|'),
    [projectiles]
  );
  // Load persisted manual order whenever the selection set changes (or modal reopens).
  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem(`compare-manual-order:${selectionKey}`);
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        // Validate: must contain exactly the same ids as the current selection.
        const currentIds = new Set(projectiles.map(p => p.id));
        if (
          Array.isArray(parsed) &&
          parsed.length === currentIds.size &&
          parsed.every(id => currentIds.has(id))
        ) {
          setManualOrder(parsed);
          setManualMode(true);
          return;
        }
      }
    } catch { /* ignore */ }
    setManualOrder(null);
    setManualMode(false);
  }, [open, selectionKey, projectiles]);
  // Persist manual order whenever it changes.
  useEffect(() => {
    if (!open) return;
    try {
      const key = `compare-manual-order:${selectionKey}`;
      if (manualOrder && manualMode) {
        localStorage.setItem(key, JSON.stringify(manualOrder));
      } else {
        localStorage.removeItem(key);
      }
    } catch { /* ignore */ }
  }, [open, selectionKey, manualOrder, manualMode]);
  /** Per-section collapsed state — persisted in localStorage so it survives modal re-opens. */
  const [collapsed, setCollapsed] = useState<{ drop: boolean; vel: boolean; energy: boolean; overThreshold: boolean }>(() => {
    try {
      const raw = localStorage.getItem('compare-sections-collapsed');
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<{ drop: boolean; vel: boolean; energy: boolean; overThreshold: boolean }>;
        return {
          drop: !!parsed.drop,
          vel: !!parsed.vel,
          energy: !!parsed.energy,
          // Default-collapsed: this section is dense and only useful when the user actively wants it.
          overThreshold: parsed.overThreshold ?? true,
        };
      }
    } catch { /* ignore */ }
    return { drop: false, vel: false, energy: false, overThreshold: true };
  });

  // Persist whenever collapsed state changes.
  useEffect(() => {
    try { localStorage.setItem('compare-sections-collapsed', JSON.stringify(collapsed)); } catch { /* ignore */ }
  }, [collapsed]);
  /** Wraps the chart + table — that's what gets snapshotted to PNG. */
  const exportRef = useRef<HTMLDivElement | null>(null);

  /** Render the chart+table as a PNG and trigger a download. */
  const handleExport = async () => {
    if (!exportRef.current || rows.length === 0) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(exportRef.current, {
        // Use the actual rendered card background so the snapshot matches the theme.
        backgroundColor: getComputedStyle(document.body).getPropertyValue('background-color') || '#111827',
        pixelRatio: 2,
        cacheBust: true,
        // Inline current font-family so JetBrains Mono / Inter survive the snapshot.
        style: { fontFamily: getComputedStyle(document.body).fontFamily },
      });
      const a = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 10);
      a.download = `airballistik-compare-${stamp}.png`;
      a.href = dataUrl;
      a.click();
      toast.success(t('projectiles.compareExportSuccess'));
    } catch (err) {
      console.error('Export PNG failed', err);
      toast.error(t('projectiles.compareExportError'));
    } finally {
      setExporting(false);
    }
  };

  /**
   * Render the chart+table as a PNG and write it to the system clipboard so
   * the user can paste it directly into Discord, a forum, etc. Falls back to
   * the download flow when the browser/OS lacks Clipboard image support
   * (Safari < 16, Firefox without `dom.events.asyncClipboard.clipboardItem`).
   */
  const handleCopy = async () => {
    if (!exportRef.current || rows.length === 0) return;

    // Feature-detect ClipboardItem + async clipboard.write.
    const ClipboardItemCtor = (window as unknown as { ClipboardItem?: typeof ClipboardItem }).ClipboardItem;
    if (!ClipboardItemCtor || !navigator.clipboard?.write) {
      toast.error(t('projectiles.compareCopyUnsupported'));
      return;
    }

    setCopying(true);
    try {
      const dataUrl = await toPng(exportRef.current, {
        backgroundColor: getComputedStyle(document.body).getPropertyValue('background-color') || '#111827',
        pixelRatio: 2,
        cacheBust: true,
        style: { fontFamily: getComputedStyle(document.body).fontFamily },
      });
      // Convert data URL → Blob → ClipboardItem.
      const blob = await (await fetch(dataUrl)).blob();
      await navigator.clipboard.write([new ClipboardItemCtor({ 'image/png': blob })]);
      setCopied(true);
      toast.success(t('projectiles.compareCopySuccess'));
      // Revert the icon after a moment so repeated copies still feel responsive.
      window.setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy PNG failed', err);
      toast.error(t('projectiles.compareCopyError'));
    } finally {
      setCopying(false);
    }
  };

  /**
   * Render the chart+table area to PNG, then embed it into a single-page PDF
   * sized to the captured aspect ratio. We choose orientation (portrait vs
   * landscape) from the snapshot's aspect so the image fills the page without
   * letterboxing. A4 dimensions are used in millimetres (jsPDF default unit).
   */
  const handleExportPdf = async () => {
    if (!exportRef.current || rows.length === 0) return;
    setExportingPdf(true);
    try {
      const dataUrl = await toPng(exportRef.current, {
        backgroundColor:
          getComputedStyle(document.body).getPropertyValue('background-color') || '#111827',
        pixelRatio: 2,
        cacheBust: true,
        style: { fontFamily: getComputedStyle(document.body).fontFamily },
      });

      // Probe natural pixel dimensions of the rendered snapshot to compute the
      // aspect ratio — we can't trust the wrapper's bounding box (CSS scaling).
      const img = new Image();
      img.src = dataUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('image load failed'));
      });
      const ratio = img.naturalWidth / img.naturalHeight;
      const orientation: 'p' | 'l' = ratio >= 1 ? 'l' : 'p';

      // A4: 210 × 297 mm. Reserve 10 mm margins on each side.
      const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const maxW = pageW - margin * 2;
      const maxH = pageH - margin * 2 - 14; // leave room for the title strip

      // Fit-to-page while preserving aspect ratio.
      let imgW = maxW;
      let imgH = imgW / ratio;
      if (imgH > maxH) {
        imgH = maxH;
        imgW = imgH * ratio;
      }
      const x = (pageW - imgW) / 2;
      const y = margin + 14;

      // Title strip at the top of the page so the export carries provenance.
      const stamp = new Date().toISOString().slice(0, 10);
      pdf.setFontSize(12);
      pdf.text('AirBallistik — Projectile comparison', margin, margin + 4);
      pdf.setFontSize(9);
      pdf.setTextColor(120);
      pdf.text(
        `${stamp} · MV ${velocity} m/s · zero ${zeroRange} m`,
        margin,
        margin + 9,
      );
      pdf.setTextColor(0);

      pdf.addImage(dataUrl, 'PNG', x, y, imgW, imgH, undefined, 'FAST');
      pdf.save(`airballistik-compare-${stamp}.pdf`);
      toast.success(t('projectiles.compareExportPdfSuccess'));
    } catch (err) {
      console.error('Export PDF failed', err);
      toast.error(t('projectiles.compareExportPdfError'));
    } finally {
      setExportingPdf(false);
    }
  };

  useEffect(() => {
    if (open) {
      setVelocity(initialVelocity);
      setZeroRange(DEFAULT_Z);
    } else {
      setFullscreen(false);
    }
  }, [open, initialVelocity]);

  // Esc exits fullscreen first, then closes (handled by browser default for second press via onClose elsewhere).
  useEffect(() => {
    if (!open || !fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setFullscreen(false);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, fullscreen]);

  const rows = useMemo(() => {
    if (!open || projectiles.length === 0) return [];
    const weather = neutralWeather();
    const computed = projectiles.map(p => {
      const traj = calculateTrajectory({
        muzzleVelocity: velocity,
        bc: p.bc,
        projectileWeight: p.weight,
        sightHeight: 50,
        zeroRange,
        maxRange: CHART_MAX,
        rangeStep: CHART_STEP,
        weather,
        dragModel: p.bcModel ?? 'G1',
        customDragTable: p.customDragTable,
      });
      const drops: Record<number, number> = {};
      const vels: Record<number, number> = {};
      const energies: Record<number, number> = {};
      const curve: { range: number; drop: number }[] = [];
      const energyCurve: { range: number; energy: number }[] = [];
      for (const r of traj) {
        curve.push({ range: r.range, drop: r.drop });
        energyCurve.push({ range: r.range, energy: r.energy });
        if ((COMPARE_RANGES as readonly number[]).includes(r.range)) {
          drops[r.range] = r.drop;
          vels[r.range] = r.velocity;
          energies[r.range] = r.energy;
        }
      }
      return { p, drops, vels, energies, curve, energyCurve };
    });
    // Manual mode short-circuits auto-sort: reorder strictly per `manualOrder`.
    // Any projectile not present in the saved order falls back to its original index.
    if (manualMode && manualOrder) {
      const byId = new Map(computed.map(r => [r.p.id, r]));
      const ordered: typeof computed = [];
      for (const id of manualOrder) {
        const r = byId.get(id);
        if (r) {
          ordered.push(r);
          byId.delete(id);
        }
      }
      // Append any remaining (newly-added) rows at the end in original order.
      for (const r of computed) if (byId.has(r.p.id)) ordered.push(r);
      return ordered;
    }
    // Auto-sort columns: by max useful range (desc) when an energy threshold is set,
    // otherwise by ballistic coefficient (desc). Stable fallback on brand+model so the
    // order is deterministic when projectiles tie (e.g. two BCs equal).
    const tieBreak = (a: typeof computed[number], b: typeof computed[number]) =>
      `${a.p.brand} ${a.p.model}`.localeCompare(`${b.p.brand} ${b.p.model}`);
    const effectiveSort: 'usefulRange' | 'bc' | 'weight' =
      sortMode ?? (energyThresholdJ !== null ? 'usefulRange' : 'bc');
    if (effectiveSort === 'usefulRange' && energyThresholdJ !== null) {
      const maxUsefulRange = (row: typeof computed[number]) => {
        let max = -Infinity;
        for (const pt of row.energyCurve) {
          if (pt.energy > energyThresholdJ && pt.range > max) max = pt.range;
        }
        return max === -Infinity ? -1 : max;
      };
      return [...computed].sort((a, b) => {
        const diff = maxUsefulRange(b) - maxUsefulRange(a);
        return diff !== 0 ? diff : tieBreak(a, b);
      });
    }
    if (effectiveSort === 'weight') {
      // Heaviest first — useful for spotting heavy slugs/pellets at a glance.
      return [...computed].sort((a, b) => {
        const diff = b.p.weight - a.p.weight;
        return diff !== 0 ? diff : tieBreak(a, b);
      });
    }
    return [...computed].sort((a, b) => {
      const diff = b.p.bc - a.p.bc;
      return diff !== 0 ? diff : tieBreak(a, b);
    });
  }, [projectiles, open, velocity, zeroRange, energyThresholdJ, sortMode, manualMode, manualOrder]);

  /** Stable color per projectile id — based on the original (props) order so colors
   * don't shuffle when columns are reordered. */
  const colorById = useMemo(() => {
    const m = new Map<string, string>();
    projectiles.forEach((p, i) => m.set(p.id, SERIES_COLORS[i % SERIES_COLORS.length]));
    return m;
  }, [projectiles]);

  /** dnd-kit sensors — pointer (with small distance threshold to avoid stealing clicks
   * from the X / drag handle buttons) + keyboard for accessibility. */
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const currentIds = rows.map(r => r.p.id);
    const oldIdx = currentIds.indexOf(String(active.id));
    const newIdx = currentIds.indexOf(String(over.id));
    if (oldIdx < 0 || newIdx < 0) return;
    setManualOrder(arrayMove(currentIds, oldIdx, newIdx));
    setManualMode(true);
    // Short confirmation that the manual order has been persisted to localStorage.
    toast.success(t('projectiles.compareManualOrderSaved'), { duration: 1500 });
  };

  if (!open) return null;

  const weightSym = symbol('weight');

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex justify-center bg-black/60 backdrop-blur-sm',
        fullscreen
          ? 'items-stretch p-0'
          : 'items-end sm:items-center p-2 sm:p-4'
      )}
    >
      <div
        className={cn(
          'surface-elevated w-full overflow-hidden flex flex-col',
          fullscreen ? 'max-w-none h-full max-h-none rounded-none border-0' : 'max-w-4xl max-h-[90vh]'
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-4 border-b border-border">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-md bg-primary/10 text-primary shrink-0">
              <GitCompare className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-sm font-heading font-semibold">{t('projectiles.compareTitle')}</h2>
                {rows.length >= 2 && (() => {
                  // Reverse current row order — works in both auto and manual mode.
                  // Snapshots the visible order, flips it, and switches to manual mode
                  // so the user can keep editing from there.
                  const reverseOrder = () => {
                    const reversed = [...rows.map(r => r.p.id)].reverse();
                    setManualOrder(reversed);
                    setManualMode(true);
                    toast.success(t('projectiles.compareSortReversed'), { duration: 1500 });
                  };
                  // When manual mode is active, the badge shows "manuel" with a reset button.
                  if (manualMode) {
                    return (
                      <span className="inline-flex items-center gap-1">
                        <HoverHint label={t('projectiles.compareSortManualHint')}>
                          <span
                            className="inline-flex items-center gap-0.5 rounded bg-primary/15 text-primary px-1.5 py-0.5 text-[10px] font-mono font-medium"
                          >
                            <ListOrdered className="h-2.5 w-2.5" aria-hidden />
                            {t('projectiles.compareSortManual')}
                          </span>
                        </HoverHint>
                        <HoverHint label={t('projectiles.compareSortReverseHint')}>
                          <button
                            type="button"
                            onClick={reverseOrder}
                            className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                            aria-label={t('projectiles.compareSortReverse')}
                          >
                            <ArrowLeftRight className="h-2.5 w-2.5" aria-hidden />
                            {t('projectiles.compareSortReverse')}
                          </button>
                        </HoverHint>
                        <HoverHint label={t('projectiles.compareSortResetHint')}>
                          <button
                            type="button"
                            onClick={() => { setManualMode(false); setManualOrder(null); }}
                            className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                            aria-label={t('projectiles.compareSortResetHint')}
                          >
                            <RotateCcw className="h-2.5 w-2.5" aria-hidden />
                            {t('projectiles.compareSortReset')}
                          </button>
                        </HoverHint>
                      </span>
                    );
                  }
                  const effectiveSort: 'usefulRange' | 'bc' | 'weight' =
                    sortMode ?? (energyThresholdJ !== null ? 'usefulRange' : 'bc');
                  const usefulRangeAvailable = energyThresholdJ !== null;
                  // Cycle: usefulRange → bc → weight → usefulRange (skip usefulRange when no threshold).
                  const cycle: ('usefulRange' | 'bc' | 'weight')[] = usefulRangeAvailable
                    ? ['usefulRange', 'bc', 'weight']
                    : ['bc', 'weight'];
                  const idx = cycle.indexOf(effectiveSort);
                  const nextMode = cycle[(idx + 1) % cycle.length];
                  const canToggle = cycle.length > 1;
                  const labelFor = (m: 'usefulRange' | 'bc' | 'weight') =>
                    m === 'usefulRange'
                      ? t('projectiles.compareSortByUsefulRange')
                      : m === 'bc'
                        ? t('projectiles.compareSortByBc')
                        : t('projectiles.compareSortByWeight');
                  const label = labelFor(effectiveSort);
                  const hint = canToggle
                    ? t('projectiles.compareSortToggleHint', { next: labelFor(nextMode) })
                    : effectiveSort === 'usefulRange'
                      ? t('projectiles.compareSortByUsefulRangeHint', { j: (energyThresholdJ ?? 0).toFixed(2) })
                      : effectiveSort === 'bc'
                        ? t('projectiles.compareSortByBcHint')
                        : t('projectiles.compareSortByWeightHint');
                  return (
                    <span className="inline-flex items-center gap-1">
                      <HoverHint label={hint}>
                        <button
                          type="button"
                          onClick={canToggle ? () => setSortMode(nextMode) : undefined}
                          disabled={!canToggle}
                          className={cn(
                            'inline-flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono font-medium text-muted-foreground',
                            canToggle && 'hover:bg-muted/70 hover:text-foreground cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-primary',
                            !canToggle && 'cursor-default'
                          )}
                          aria-label={hint}
                        >
                          <span aria-hidden>↓</span>
                          {label}
                        </button>
                      </HoverHint>
                      <HoverHint label={t('projectiles.compareSortManualEnableHint')}>
                        <button
                          type="button"
                          onClick={() => {
                            // Initialise manualOrder from the current row order so dragging starts from "what you see now".
                            setManualOrder(rows.map(r => r.p.id));
                            setManualMode(true);
                          }}
                          className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                          aria-label={t('projectiles.compareSortManualEnable')}
                        >
                          <GripVertical className="h-2.5 w-2.5" aria-hidden />
                          {t('projectiles.compareSortManualEnable')}
                        </button>
                      </HoverHint>
                      <HoverHint label={t('projectiles.compareSortReverseHint')}>
                        <button
                          type="button"
                          onClick={reverseOrder}
                          className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                          aria-label={t('projectiles.compareSortReverse')}
                        >
                          <ArrowLeftRight className="h-2.5 w-2.5" aria-hidden />
                          {t('projectiles.compareSortReverse')}
                        </button>
                      </HoverHint>
                    </span>
                  );
                })()}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {t('projectiles.compareHint', { v: velocity, z: zeroRange })}
              </p>
              {(() => {
                // Count visible sections (overThreshold only counted when the threshold is active).
                const total = energyThresholdJ !== null ? 4 : 3;
                const hidden =
                  (collapsed.drop ? 1 : 0) +
                  (collapsed.vel ? 1 : 0) +
                  (collapsed.energy ? 1 : 0) +
                  (energyThresholdJ !== null && collapsed.overThreshold ? 1 : 0);
                if (hidden === 0) return null;
                return (
                  <HoverHint label={t('projectiles.compareExpandAll')}>
                    <button
                      type="button"
                      onClick={() =>
                        setCollapsed({ drop: false, vel: false, energy: false, overThreshold: false })
                      }
                      className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-tactical font-medium hover:underline focus:outline-none focus-visible:ring-1 focus-visible:ring-tactical rounded"
                      aria-label={t('projectiles.compareExpandAll')}
                    >
                      <EyeOff className="h-2.5 w-2.5" aria-hidden />
                      {t('projectiles.compareHiddenCount', { hidden, total })}
                    </button>
                  </HoverHint>
                );
              })()}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <HoverHint label={t('projectiles.compareCopy')}>
              <button
                type="button"
                onClick={handleCopy}
                disabled={copying || rows.length === 0}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label={t('projectiles.compareCopy')}
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-tactical" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">
                  {copying ? t('projectiles.compareCopying') : t('projectiles.compareCopy')}
                </span>
              </button>
            </HoverHint>
            <HoverHint label={t('projectiles.compareExport')}>
              <button
                type="button"
                onClick={handleExport}
                disabled={exporting || rows.length === 0}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label={t('projectiles.compareExport')}
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  {exporting ? t('projectiles.compareExporting') : t('projectiles.compareExport')}
                </span>
              </button>
            </HoverHint>
            <HoverHint label={t('projectiles.compareExportPdf')}>
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={exportingPdf || rows.length === 0}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label={t('projectiles.compareExportPdf')}
              >
                <FileText className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  {exportingPdf ? t('projectiles.compareExportingPdf') : t('projectiles.compareExportPdf')}
                </span>
              </button>
            </HoverHint>
            <HoverHint label={fullscreen ? t('projectiles.compareExitFullscreen') : t('projectiles.compareFullscreen')}>
              <button
                type="button"
                onClick={() => setFullscreen(f => !f)}
                className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                aria-label={fullscreen ? t('projectiles.compareExitFullscreen') : t('projectiles.compareFullscreen')}
                aria-pressed={fullscreen}
              >
                {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
            </HoverHint>
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-muted text-muted-foreground"
              aria-label={t('common.close')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Sliders: velocity + zero range */}
        <div className="px-4 py-3 border-b border-border bg-muted/20 grid gap-4 sm:grid-cols-2">
          {/* Velocity */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="compare-velocity"
                className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
              >
                <Gauge className="h-3.5 w-3.5" />
                {t('projectiles.compareVelocity')}
              </label>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-foreground tabular-nums">
                  {velocity} m/s
                </span>
                {velocity !== DEFAULT_V && (
                  <button
                    type="button"
                    onClick={() => setVelocity(DEFAULT_V)}
                    className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
                    aria-label={t('common.reset')}
                  >
                    <RotateCcw className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
            <input
              id="compare-velocity"
              type="range"
              min={MIN_V}
              max={MAX_V}
              step={5}
              value={velocity}
              onChange={e => setVelocity(Number(e.target.value))}
              className="w-full accent-primary cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>{MIN_V}</span>
              <span>{MAX_V}</span>
            </div>
          </div>

          {/* Zero range */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="compare-zero"
                className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
              >
                <Target className="h-3.5 w-3.5" />
                {t('projectiles.compareZero')}
              </label>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-foreground tabular-nums">
                  {zeroRange} m
                </span>
                {zeroRange !== DEFAULT_Z && (
                  <button
                    type="button"
                    onClick={() => setZeroRange(DEFAULT_Z)}
                    className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
                    aria-label={t('common.reset')}
                  >
                    <RotateCcw className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
            <input
              id="compare-zero"
              type="range"
              min={MIN_Z}
              max={MAX_Z}
              step={1}
              value={zeroRange}
              onChange={e => setZeroRange(Number(e.target.value))}
              className="w-full accent-primary cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>{MIN_Z}</span>
              <span>{MAX_Z}</span>
            </div>
          </div>
        </div>

        {/* Scrollable region containing the snapshotted chart + table */}
        <div className={cn('overflow-auto', fullscreen ? 'flex-1' : '')}>
          <div ref={exportRef} className="bg-card">
            {/* Drop chart */}
            <DropChart rows={rows} t={t} tall={fullscreen} hoverRange={hoverRange} onHoverRange={setHoverRange} colorById={colorById} />

        {/* Table toolbar with expand/collapse all */}
        <div className="px-4 py-2 border-b border-border bg-muted/20 flex items-center justify-end gap-2">
          <HoverHint label={(!collapsed.drop && !collapsed.vel && !collapsed.energy && !collapsed.overThreshold) ? t('projectiles.compareCollapseAll') : t('projectiles.compareExpandAll')}>
            <button
              type="button"
              onClick={() => {
                const allExpanded = !collapsed.drop && !collapsed.vel && !collapsed.energy && !collapsed.overThreshold;
                setCollapsed({
                  drop: allExpanded,
                  vel: allExpanded,
                  energy: allExpanded,
                  overThreshold: allExpanded,
                });
              }}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              {(!collapsed.drop && !collapsed.vel && !collapsed.energy && !collapsed.overThreshold) ? (
                <>
                  <Minimize2 className="h-3 w-3" />
                  <span>{t('projectiles.compareCollapseAll')}</span>
                </>
              ) : (
                <>
                  <Maximize2 className="h-3 w-3" />
                  <span>{t('projectiles.compareExpandAll')}</span>
                </>
              )}
            </button>
          </HoverHint>
        </div>

        {/* Table */}
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
              <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={rows.map(r => r.p.id)} strategy={horizontalListSortingStrategy}>
                  <tr>
                    <th className="text-left font-medium px-3 py-2 sticky left-0 bg-muted/40 z-10">
                      {t('projectiles.compareMetric')}
                    </th>
                    {(() => {
                      // Pre-compute FPE for all rows so we can highlight the maximum.
                      const velocityFps = velocity * 3.28084;
                      const energies = rows.map(({ p }) => {
                        const fpe = (p.weight * velocityFps * velocityFps) / 450240;
                        const joules = 0.5 * (p.weight * 0.0000647989) * velocity * velocity;
                        return { id: p.id, fpe, joules };
                      });
                      const maxFpe = energies.reduce((m, e) => (e.fpe > m ? e.fpe : m), 0);
                      const maxJoules = energies.reduce((m, e) => (e.joules > m ? e.joules : m), 0);
                      // Second-best joules — used to show the gap to the runner-up in the tooltip.
                      const secondJoules = energies
                        .filter(e => e.joules < maxJoules)
                        .reduce((m, e) => (e.joules > m ? e.joules : m), 0);
                      const energyGapJ = secondJoules > 0 ? maxJoules - secondJoules : null;
                      // Shared Y scale across all sparklines so curves are visually comparable.
                      const globalMaxJ = rows.reduce((m, r) => {
                        const local = r.energyCurve.reduce((mm, pt) => (pt.energy > mm ? pt.energy : mm), 0);
                        return local > m ? local : m;
                      }, 0);
                      return rows.map(({ p, energyCurve }) => {
                        const e = energies.find(x => x.id === p.id)!;
                        const isMax =
                          rows.length > 1 && Math.abs(e.fpe - maxFpe) < 0.05;
                        const seriesColor = colorById.get(p.id) ?? SERIES_COLORS[0];
                        return (
                          <SortableProjectileHeader
                            key={p.id}
                            id={p.id}
                            draggable={manualMode}
                            dragLabel={t('projectiles.compareDragHandle')}
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-foreground normal-case truncate">
                                {p.brand} {p.model}
                              </div>
                              <div className="text-[10px] text-muted-foreground font-mono">
                                {p.caliber} · {p.bcModel ?? 'G1'}
                              </div>
                              <div
                                className={cn(
                                  'mt-1 text-[10px] font-mono normal-case inline-flex items-center gap-1 rounded px-1 -mx-1',
                                  energyThresholdJ !== null && e.joules > energyThresholdJ
                                    ? 'text-destructive font-semibold bg-destructive/10'
                                    : isMax
                                      ? 'text-tactical font-semibold bg-tactical/10'
                                      : 'text-muted-foreground'
                                )}
                                title={
                                  energyThresholdJ !== null && e.joules > energyThresholdJ
                                    ? t('projectiles.compareFacOver')
                                    : isMax
                                      ? (energyGapJ !== null
                                          ? t('projectiles.compareBestEnergyDiff', { gap: energyGapJ.toFixed(1) })
                                          : t('projectiles.compareBestEnergy'))
                                      : t('projectiles.compareMuzzleEnergy')
                                }
                              >
                                {energyThresholdJ !== null && e.joules > energyThresholdJ ? (
                                  <span aria-hidden>⚠</span>
                                ) : isMax ? (
                                  <span aria-hidden>★</span>
                                ) : null}
                                {e.fpe.toFixed(1)} fpe · {e.joules.toFixed(1)} J
                              </div>
                              <EnergySparkline
                                curve={energyCurve}
                                color={seriesColor}
                                globalMaxJ={globalMaxJ}
                                thresholdJ={energyThresholdJ}
                                hoverRange={hoverRange}
                                label={t('projectiles.compareEnergySparklineTitle', {
                                  start: energyCurve[0]?.energy.toFixed(1) ?? '—',
                                  end: energyCurve[energyCurve.length - 1]?.energy.toFixed(1) ?? '—',
                                })}
                              />
                            </div>
                            <button
                              onClick={() => onRemove(p.id)}
                              className="p-0.5 rounded hover:bg-muted text-muted-foreground shrink-0"
                              aria-label={t('common.delete')}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </SortableProjectileHeader>
                        );
                      });
                    })()}
                  </tr>
                </SortableContext>
              </DndContext>
            </thead>
            <tbody className="divide-y divide-border">
              {/* Static specs */}
              <tr>
                <td className="px-3 py-2 text-xs text-muted-foreground sticky left-0 bg-card z-10">
                  {t('projectiles.weight')}
                </td>
                {rows.map(({ p }) => (
                  <td key={p.id} className="px-3 py-2 font-mono text-xs">
                    {p.weight} {weightSym}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-3 py-2 text-xs text-muted-foreground sticky left-0 bg-card z-10">
                  BC
                </td>
                {rows.map(({ p }) => (
                  <td key={p.id} className="px-3 py-2 font-mono text-xs">
                    {p.bc}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-3 py-2 text-xs text-muted-foreground sticky left-0 bg-card z-10">
                  {t('projectiles.type')}
                </td>
                {rows.map(({ p }) => (
                  <td key={p.id} className="px-3 py-2 font-mono text-xs">
                    {p.projectileType ?? 'pellet'}
                  </td>
                ))}
              </tr>

              {/* Drop section — collapsible header for consistency with Velocity / Energy. */}
              <tr className="bg-muted/20">
                <td colSpan={rows.length + 1} className="p-0">
                  <button
                    type="button"
                    onClick={() => setCollapsed(c => ({ ...c, drop: !c.drop }))}
                    aria-expanded={!collapsed.drop}
                    aria-controls="cmp-drop-rows"
                    title={collapsed.drop ? t('projectiles.compareExpandSection') : t('projectiles.compareCollapseSection')}
                    className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-wide text-muted-foreground font-semibold hover:text-foreground hover:bg-muted/30 transition-colors text-left"
                  >
                    {collapsed.drop ? (
                      <ChevronRight className="h-3 w-3 shrink-0" aria-hidden />
                    ) : (
                      <ChevronDown className="h-3 w-3 shrink-0" aria-hidden />
                    )}
                    {t('projectiles.compareDropSection')}
                  </button>
                </td>
              </tr>
              {!collapsed.drop && COMPARE_RANGES.map(r => {
                const absDrops = rows
                  .map(x => (x.drops[r] !== undefined ? Math.abs(x.drops[r]!) : null))
                  .filter((v): v is number => v !== null);
                const best = absDrops.length ? Math.min(...absDrops) : Infinity;
                // Second-smallest absolute drop — used to compute the gap to the runner-up.
                const secondBest = absDrops.filter(v => v > best).reduce((m, v) => (m === null || v < m ? v : m), null as number | null);
                const dropGap = secondBest !== null ? secondBest - best : null;
                return (
                  <tr key={`drop-${r}`} id="cmp-drop-rows">
                    <td className="px-3 py-2 text-xs text-muted-foreground sticky left-0 bg-card z-10">
                      {t('projectiles.compareDropAt', { r })}
                    </td>
                    {rows.map(({ p, drops }) => {
                      const d = drops[r];
                      const isBest = d !== undefined && Math.abs(d) === best && rows.length > 1;
                      // Symmetric tooltip on non-best cells: how much more drop vs the winner.
                      const vsBestGap = d !== undefined && !isBest && best !== Infinity && rows.length > 1
                        ? Math.abs(d) - best
                        : null;
                      return (
                        <td
                          key={p.id}
                          className={cn(
                            'px-3 py-2 font-mono text-xs',
                            isBest && 'text-tactical font-semibold bg-tactical/10'
                          )}
                          title={isBest
                            ? (dropGap !== null
                                ? t('projectiles.compareFlattestDiff', { gap: dropGap.toFixed(1) })
                                : t('projectiles.compareFlattestOnly'))
                            : vsBestGap !== null
                              ? t('projectiles.compareDropVsBest', { gap: vsBestGap.toFixed(1) })
                              : undefined}
                        >
                          {isBest && <span aria-hidden className="mr-1">★</span>}
                          {d !== undefined ? `${d.toFixed(1)} mm` : '—'}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {/* Velocity section — residual speed at each distance.
                  Header is a button so users can collapse the whole group
                  when they want to focus on energy (or vice-versa). */}
              <tr className="bg-muted/20">
                <td colSpan={rows.length + 1} className="p-0">
                  <button
                    type="button"
                    onClick={() => setCollapsed(c => ({ ...c, vel: !c.vel }))}
                    aria-expanded={!collapsed.vel}
                    aria-controls="cmp-vel-rows"
                    title={collapsed.vel ? t('projectiles.compareExpandSection') : t('projectiles.compareCollapseSection')}
                    className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-wide text-muted-foreground font-semibold hover:text-foreground hover:bg-muted/30 transition-colors text-left"
                  >
                    {collapsed.vel ? (
                      <ChevronRight className="h-3 w-3 shrink-0" aria-hidden />
                    ) : (
                      <ChevronDown className="h-3 w-3 shrink-0" aria-hidden />
                    )}
                    {t('projectiles.compareVelocitySection')}
                  </button>
                </td>
              </tr>
              {!collapsed.vel && COMPARE_RANGES.map(r => {
                // Highest residual velocity at this distance — projectile that retains speed best.
                const velsAt = rows.map(x => x.vels[r] ?? -Infinity).filter(v => v !== -Infinity);
                const bestVel = velsAt.length ? Math.max(...velsAt) : -Infinity;
                const secondVel = velsAt.filter(v => v < bestVel).reduce((m, v) => (m === null || v > m ? v : m), null as number | null);
                const velGap = secondVel !== null ? bestVel - secondVel : null;
                return (
                  <tr key={`v-${r}`} id="cmp-vel-rows">
                    <td className="px-3 py-2 text-xs text-muted-foreground sticky left-0 bg-card z-10">
                      {t('projectiles.compareVelocityAt', { r })}
                    </td>
                    {rows.map(({ p, vels }) => {
                      const v = vels[r];
                      const isFastest = v !== undefined && v === bestVel && rows.length > 1;
                      // Symmetric tooltip: m/s less than the fastest.
                      const vsBestGap = v !== undefined && !isFastest && bestVel !== -Infinity && rows.length > 1
                        ? bestVel - v
                        : null;
                      return (
                        <td
                          key={p.id}
                          className={cn(
                            'px-3 py-2 font-mono text-xs',
                            isFastest && 'text-tactical font-semibold bg-tactical/10'
                          )}
                          title={isFastest
                            ? (velGap !== null
                                ? t('projectiles.compareFastestDiff', { gap: velGap.toFixed(0) })
                                : t('projectiles.compareFastestOnly'))
                            : vsBestGap !== null
                              ? t('projectiles.compareVelocityVsBest', { gap: vsBestGap.toFixed(0) })
                              : undefined}
                        >
                          {isFastest && <span aria-hidden className="mr-1">★</span>}
                          {v !== undefined ? `${v.toFixed(0)} m/s` : '—'}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {/* Energy section — residual energy at each distance, highlights over-threshold rows */}
              <tr className="bg-muted/20">
                <td colSpan={rows.length + 1} className="p-0">
                  <button
                    type="button"
                    onClick={() => setCollapsed(c => ({ ...c, energy: !c.energy }))}
                    aria-expanded={!collapsed.energy}
                    aria-controls="cmp-energy-rows"
                    title={collapsed.energy ? t('projectiles.compareExpandSection') : t('projectiles.compareCollapseSection')}
                    className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-wide text-muted-foreground font-semibold hover:text-foreground hover:bg-muted/30 transition-colors text-left"
                  >
                    {collapsed.energy ? (
                      <ChevronRight className="h-3 w-3 shrink-0" aria-hidden />
                    ) : (
                      <ChevronDown className="h-3 w-3 shrink-0" aria-hidden />
                    )}
                    {t('projectiles.compareEnergyOnlySection')}
                  </button>
                </td>
              </tr>
              {!collapsed.energy && COMPARE_RANGES.map(r => {
                // Highest energy at this distance — used to compute symmetric "vs best" tooltips.
                const energiesAt = rows.map(x => x.energies[r]).filter((e): e is number => e !== undefined);
                const bestEnergy = energiesAt.length ? Math.max(...energiesAt) : null;
                return (
                  <tr key={`e-${r}`} id="cmp-energy-rows">
                    <td className="px-3 py-2 text-xs text-muted-foreground sticky left-0 bg-card z-10">
                      {t('projectiles.compareEnergyOnlyAt', { r })}
                    </td>
                    {rows.map(({ p, energies }) => {
                      const j = energies[r];
                      const overFac = energyThresholdJ !== null && j !== undefined && j > energyThresholdJ;
                      // Symmetric tooltip: gap to the highest energy at this distance.
                      const vsBestGap = j !== undefined && bestEnergy !== null && j < bestEnergy && rows.length > 1
                        ? bestEnergy - j
                        : null;
                      const title = overFac
                        ? t('projectiles.compareFacOver')
                        : vsBestGap !== null
                          ? t('projectiles.compareEnergyVsBest', { gap: vsBestGap.toFixed(1) })
                          : undefined;
                      return (
                        <td
                          key={p.id}
                          className={cn(
                            'px-3 py-2 font-mono text-xs',
                            overFac && 'text-destructive font-semibold bg-destructive/10'
                          )}
                          title={title}
                        >
                          {overFac && <span aria-hidden className="mr-1">⚠</span>}
                          {j !== undefined ? `${j.toFixed(1)} J` : '—'}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {/* Over-threshold section — only renders when a threshold is configured.
                  Lists the explicit ranges where each projectile is still above the threshold.
                  Default-collapsed because it's a focused/dense view. */}
              {energyThresholdJ !== null && (
                <>
                  <tr className="bg-muted/20">
                    <td colSpan={rows.length + 1} className="p-0">
                      <button
                        type="button"
                        onClick={() => setCollapsed(c => ({ ...c, overThreshold: !c.overThreshold }))}
                        aria-expanded={!collapsed.overThreshold}
                        aria-controls="cmp-over-rows"
                        title={collapsed.overThreshold ? t('projectiles.compareExpandSection') : t('projectiles.compareCollapseSection')}
                        className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-wide text-muted-foreground font-semibold hover:text-foreground hover:bg-muted/30 transition-colors text-left"
                      >
                        {collapsed.overThreshold ? (
                          <ChevronRight className="h-3 w-3 shrink-0" aria-hidden />
                        ) : (
                          <ChevronDown className="h-3 w-3 shrink-0" aria-hidden />
                        )}
                        {t('projectiles.compareOverThresholdSection', { j: energyThresholdJ.toFixed(2) })}
                      </button>
                    </td>
                  </tr>
                  {!collapsed.overThreshold && (() => {
                    // Per-projectile: collect all sampled ranges where energy > threshold,
                    // then derive the maximum useful range (last sample still above).
                    const overByProjectile = rows.map(({ p, energyCurve }) => {
                      const overRanges = energyCurve
                        .filter(pt => pt.energy > energyThresholdJ)
                        .map(pt => pt.range);
                      const maxRange = overRanges.length ? Math.max(...overRanges) : null;
                      return { id: p.id, overRanges, maxRange };
                    });
                    // Highest "max useful range" across rows — used to highlight the winner
                    // (only meaningful when comparing >1 projectile and at least one is above the threshold).
                    const bestMaxRange = overByProjectile.reduce<number | null>(
                      (m, x) => (x.maxRange !== null && (m === null || x.maxRange > m) ? x.maxRange : m),
                      null,
                    );
                    // Second-best useful range (strictly less than the winner) — to show the gap in the tooltip.
                    const secondMaxRange = overByProjectile.reduce<number | null>(
                      (m, x) =>
                        x.maxRange !== null && bestMaxRange !== null && x.maxRange < bestMaxRange &&
                        (m === null || x.maxRange > m)
                          ? x.maxRange
                          : m,
                      null,
                    );
                    const rangeGap =
                      bestMaxRange !== null && secondMaxRange !== null ? bestMaxRange - secondMaxRange : null;
                    return (
                      <>
                        {/* Max useful range row */}
                        <tr id="cmp-over-rows">
                          <td className="px-3 py-2 text-xs text-muted-foreground sticky left-0 bg-card z-10">
                            {t('projectiles.compareOverThresholdMax')}
                          </td>
                          {overByProjectile.map(({ id, maxRange }) => {
                            const isWinner =
                              rows.length > 1 &&
                              maxRange !== null &&
                              bestMaxRange !== null &&
                              maxRange === bestMaxRange;
                            // Symmetric tooltip on non-winning (but still > threshold) cells.
                            const vsBestGap =
                              !isWinner && maxRange !== null && bestMaxRange !== null && maxRange < bestMaxRange
                                ? bestMaxRange - maxRange
                                : null;
                            return (
                              <td
                                key={id}
                                className={cn(
                                  'px-3 py-2 font-mono text-xs',
                                  maxRange === null
                                    ? 'text-muted-foreground italic'
                                    : isWinner
                                      ? 'text-tactical font-semibold bg-tactical/10'
                                      : 'text-destructive font-semibold',
                                )}
                                title={isWinner
                                  ? (rangeGap !== null
                                      ? t('projectiles.compareBestRangeDiff', { gap: rangeGap.toString() })
                                      : t('projectiles.compareBestRangeOnly'))
                                  : vsBestGap !== null
                                    ? t('projectiles.compareRangeVsBest', { gap: vsBestGap.toString() })
                                    : undefined}
                              >
                                {isWinner && <span aria-hidden className="mr-1">★</span>}
                                {maxRange === null
                                  ? t('projectiles.compareOverThresholdNone')
                                  : `${maxRange} m`}
                              </td>
                            );
                          })}
                        </tr>
                        {/* Range list row — concise comma-separated list, capped for legibility */}
                        <tr>
                          <td className="px-3 py-2 text-xs text-muted-foreground sticky left-0 bg-card z-10 align-top">
                            {t('projectiles.compareOverThresholdRanges')}
                          </td>
                          {overByProjectile.map(({ id, overRanges }) => {
                            if (overRanges.length === 0) {
                              return (
                                <td key={id} className="px-3 py-2 font-mono text-xs text-muted-foreground italic">
                                  —
                                </td>
                              );
                            }
                            // Cap to ~12 entries to avoid wall-of-text; show count if truncated.
                            const MAX_SHOWN = 12;
                            const shown = overRanges.slice(0, MAX_SHOWN);
                            const truncated = overRanges.length > MAX_SHOWN;
                            return (
                              <td key={id} className="px-3 py-2 font-mono text-[11px] text-destructive leading-relaxed">
                                {shown.map(r => `${r}m`).join(', ')}
                                {truncated && (
                                  <span className="text-muted-foreground"> +{overRanges.length - MAX_SHOWN}</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      </>
                    );
                  })()}
                </>
              )}
            </tbody>
          </table>
        </div>

          {/* FAC threshold legend — hidden when the user disabled the highlight */}
          {energyThresholdJ !== null && (
            <div className="px-4 py-2 border-t border-border bg-card/40 flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="inline-block h-2 w-2 rounded-full bg-destructive shrink-0" aria-hidden />
              <span>{t('projectiles.compareFacLegend', { j: energyThresholdJ.toFixed(2) })}</span>
            </div>
          )}
          </div>{/* /exportRef */}
        </div>{/* /scroll wrapper */}

        {/* Footer */}
        <div className="p-3 border-t border-border text-[10px] text-muted-foreground">
          {t('projectiles.compareDisclaimer')}
        </div>
      </div>
    </div>
  );
}

/**
 * Tiny inline SVG showing the energy decay (J) over the simulated range.
 * - Shared globalMaxJ across all projectiles → curves are visually comparable.
 * - Optional dashed line for the configured energy threshold.
 * Designed to sit just below the muzzle-energy badge in the table header.
 */
function EnergySparkline({
  curve,
  color,
  globalMaxJ,
  thresholdJ,
  label,
  hoverRange,
}: {
  curve: { range: number; energy: number }[];
  color: string;
  globalMaxJ: number;
  thresholdJ: number | null;
  label: string;
  hoverRange?: number | null;
}) {
  if (curve.length < 2 || globalMaxJ <= 0) return null;
  const W = 120;
  const H = 22;
  const PAD_X = 1;
  const PAD_Y = 2;
  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_Y * 2;
  const xMax = curve[curve.length - 1].range || 1;
  const xToPx = (x: number) => PAD_X + (x / xMax) * innerW;
  const yToPx = (y: number) => PAD_Y + (1 - y / globalMaxJ) * innerH;
  const path = curve
    .map((pt, i) => `${i === 0 ? 'M' : 'L'}${xToPx(pt.range).toFixed(1)},${yToPx(pt.energy).toFixed(1)}`)
    .join(' ');
  // Filled area below the curve for visual weight.
  const area = `${path} L${xToPx(curve[curve.length - 1].range).toFixed(1)},${(H - PAD_Y).toFixed(1)} L${xToPx(curve[0].range).toFixed(1)},${(H - PAD_Y).toFixed(1)} Z`;
  const showThreshold = thresholdJ !== null && thresholdJ > 0 && thresholdJ <= globalMaxJ;

  // Find the sample matching the hovered range (DropChart snaps to CHART_STEP, so an exact match is expected).
  const hoverPoint =
    hoverRange != null && hoverRange >= 0 && hoverRange <= xMax
      ? curve.find(pt => pt.range === hoverRange) ?? null
      : null;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="mt-1 block w-full max-w-[140px] h-[22px] overflow-visible"
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
    >
      <title>{label}</title>
      {showThreshold && (
        <line
          x1={PAD_X}
          x2={W - PAD_X}
          y1={yToPx(thresholdJ!)}
          y2={yToPx(thresholdJ!)}
          stroke="hsl(var(--destructive))"
          strokeWidth={0.6}
          strokeDasharray="2 2"
          opacity={0.7}
        />
      )}
      <path d={area} fill={color} opacity={0.18} />
      <path d={path} fill="none" stroke={color} strokeWidth={1.25} strokeLinejoin="round" strokeLinecap="round" />
      {hoverPoint && (
        <g pointerEvents="none">
          {/* Vertical guide line synced with the DropChart hover. */}
          <line
            x1={xToPx(hoverPoint.range)}
            x2={xToPx(hoverPoint.range)}
            y1={PAD_Y}
            y2={H - PAD_Y}
            stroke={color}
            strokeWidth={0.5}
            opacity={0.4}
          />
          {/* Halo + dot at the hovered (range, energy) sample. */}
          <circle cx={xToPx(hoverPoint.range)} cy={yToPx(hoverPoint.energy)} r={2.6} fill={color} opacity={0.25} />
          <circle cx={xToPx(hoverPoint.range)} cy={yToPx(hoverPoint.energy)} r={1.4} fill={color} />
        </g>
      )}
    </svg>
  );
}

interface DropChartProps {
  rows: {
    p: Projectile;
    curve: { range: number; drop: number }[];
  }[];
  t: (key: string, vars?: Record<string, string | number>) => string;
  /** Render a taller chart for fullscreen mode. */
  tall?: boolean;
  /** Controlled hover distance (m) — kept in the parent so sparklines can sync. */
  hoverRange: number | null;
  onHoverRange: (r: number | null) => void;
  /** Stable color per projectile id — colors stay attached to the projectile when columns reorder. */
  colorById: Map<string, string>;
}

/**
 * Compact SVG chart of drop (mm, Y) vs distance (m, X) for each projectile.
 * Uses a shared Y scale so curves are directly comparable. Drop is plotted
 * with negative values (below sight line) downward, matching shooter intuition.
 */
function DropChart({ rows, t, tall = false, hoverRange, onHoverRange, colorById }: DropChartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const hoverX = hoverRange;
  const setHoverX = onHoverRange;

  if (rows.length === 0 || rows.every(r => r.curve.length === 0)) return null;

  const W = 600;
  const H = tall ? 360 : 180;
  const PAD_L = 36;
  const PAD_R = 12;
  const PAD_T = 12;
  const PAD_B = 24;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  let minDrop = 0;
  let maxDrop = 0;
  for (const { curve } of rows) {
    for (const pt of curve) {
      if (pt.drop < minDrop) minDrop = pt.drop;
      if (pt.drop > maxDrop) maxDrop = pt.drop;
    }
  }
  if (maxDrop < 0) maxDrop = 0;
  if (minDrop > 0) minDrop = 0;
  const span = Math.max(1, maxDrop - minDrop);
  const yMin = minDrop - span * 0.08;
  const yMax = maxDrop + span * 0.04;

  const xMax = CHART_MAX;
  const xToPx = (x: number) => PAD_L + (x / xMax) * innerW;
  const yToPx = (y: number) => PAD_T + ((yMax - y) / (yMax - yMin)) * innerH;
  const pxToX = (px: number) => ((px - PAD_L) / innerW) * xMax;

  const xTicks = [0, 25, 50, 75, 100];
  const yTickCount = 4;
  const yTicks: number[] = [];
  for (let i = 0; i <= yTickCount; i++) {
    yTicks.push(yMin + ((yMax - yMin) * i) / yTickCount);
  }

  const buildPath = (curve: { range: number; drop: number }[]) =>
    curve
      .map((pt, i) => `${i === 0 ? 'M' : 'L'}${xToPx(pt.range).toFixed(1)},${yToPx(pt.drop).toFixed(1)}`)
      .join(' ');

  /** Snap an SVG-local px coordinate to the nearest sample in the chart range. */
  const handlePointer = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const localX = ((e.clientX - rect.left) / rect.width) * W;
    if (localX < PAD_L || localX > W - PAD_R) {
      setHoverX(null);
      return;
    }
    const rawX = pxToX(localX);
    // snap to chart sampling step
    const snapped = Math.max(0, Math.min(xMax, Math.round(rawX / CHART_STEP) * CHART_STEP));
    setHoverX(snapped);
  };

  // Build tooltip rows for the hovered distance (interpolation not needed: chart uses CHART_STEP samples).
  const tooltipPoints =
    hoverX !== null
      ? rows
          .map(({ p, curve }) => {
            const pt = curve.find(c => c.range === hoverX);
            if (!pt) return null;
            return {
              id: p.id,
              label: `${p.brand} ${p.model}`,
              drop: pt.drop,
              color: colorById.get(p.id) ?? SERIES_COLORS[0],
            };
          })
          .filter((x): x is NonNullable<typeof x> => x !== null)
      : [];

  // Position tooltip — flip to the left of the cursor when near the right edge
  const tooltipPxX = hoverX !== null ? xToPx(hoverX) : 0;
  const tooltipFlip = tooltipPxX > W * 0.6;

  return (
    <div className="px-4 py-3 border-b border-border bg-card/40">
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {t('projectiles.compareChartTitle')}
        </h3>
        <div className="flex flex-wrap gap-x-3 gap-y-1 justify-end">
          {rows.map(({ p }) => (
            <div key={p.id} className="flex items-center gap-1.5 text-[10px]">
              <span
                className="inline-block h-0.5 w-3 rounded"
                style={{ backgroundColor: colorById.get(p.id) ?? SERIES_COLORS[0] }}
              />
              <span className="text-foreground truncate max-w-[140px]">
                {p.brand} {p.model}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className={cn('w-full h-auto touch-none', tall && 'max-h-[60vh]')}
          role="img"
          aria-label={t('projectiles.compareChartTitle')}
          onPointerMove={handlePointer}
          onPointerDown={handlePointer}
          onPointerLeave={() => setHoverX(null)}
        >
          {yTicks.map((y, i) => (
            <g key={`y-${i}`}>
              <line
                x1={PAD_L}
                x2={W - PAD_R}
                y1={yToPx(y)}
                y2={yToPx(y)}
                stroke="hsl(var(--border))"
                strokeWidth={0.5}
                strokeDasharray={Math.abs(y) < 0.01 ? undefined : '2 3'}
              />
              <text
                x={PAD_L - 4}
                y={yToPx(y)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-muted-foreground"
                fontSize={9}
                fontFamily="ui-monospace, monospace"
              >
                {y.toFixed(0)}
              </text>
            </g>
          ))}

          {xTicks.map(x => (
            <g key={`x-${x}`}>
              <line
                x1={xToPx(x)}
                x2={xToPx(x)}
                y1={PAD_T}
                y2={H - PAD_B}
                stroke="hsl(var(--border))"
                strokeWidth={0.5}
                strokeDasharray="2 3"
              />
              <text
                x={xToPx(x)}
                y={H - PAD_B + 12}
                textAnchor="middle"
                className="fill-muted-foreground"
                fontSize={9}
                fontFamily="ui-monospace, monospace"
              >
                {x}
              </text>
            </g>
          ))}

          <text
            x={W - PAD_R}
            y={H - 4}
            textAnchor="end"
            className="fill-muted-foreground"
            fontSize={9}
          >
            {t('projectiles.compareChartX')}
          </text>
          <text
            x={4}
            y={PAD_T + 4}
            textAnchor="start"
            className="fill-muted-foreground"
            fontSize={9}
          >
            {t('projectiles.compareChartY')}
          </text>

          {rows.map(({ p, curve }, i) => {
            const color = colorById.get(p.id) ?? SERIES_COLORS[0];
            // Stagger draw-in slightly per series so they read as distinct strokes.
            const delay = i * 0.08;
            return (
              <g key={p.id}>
                <path
                  d={buildPath(curve)}
                  fill="none"
                  stroke={color}
                  strokeWidth={1.75}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  className="compare-path compare-path-draw"
                  pathLength={1}
                  style={{ animationDelay: `${delay}s` }}
                />
                {/* Markers at comparison distances — fade in once stroke has reached them */}
                {COMPARE_RANGES.map(r => {
                  const pt = curve.find(c => c.range === r);
                  if (!pt) return null;
                  // Marker appears proportional to its x-position along the stroke.
                  const markerDelay = delay + 0.9 * (pt.range / xMax);
                  return (
                    <circle
                      key={`${p.id}-${r}`}
                      cx={xToPx(pt.range)}
                      cy={yToPx(pt.drop)}
                      r={3}
                      fill={color}
                      stroke="hsl(var(--card))"
                      strokeWidth={1}
                      className="compare-marker compare-marker-draw"
                      style={{ cursor: 'help', animationDelay: `${markerDelay}s` }}
                    >
                      <title>{`${p.brand} ${p.model} — ${pt.range} m · ${pt.drop.toFixed(1)} mm`}</title>
                    </circle>
                  );
                })}
              </g>
            );
          })}

          {/* Hover crosshair + emphasized markers */}
          {hoverX !== null && tooltipPoints.length > 0 && (
            <g pointerEvents="none">
              <line
                x1={tooltipPxX}
                x2={tooltipPxX}
                y1={PAD_T}
                y2={H - PAD_B}
                stroke="hsl(var(--primary))"
                strokeWidth={0.75}
                strokeDasharray="3 2"
                opacity={0.7}
              />
              {tooltipPoints.map(pt => (
                <circle
                  key={`hover-${pt.id}`}
                  cx={tooltipPxX}
                  cy={yToPx(pt.drop)}
                  r={4}
                  fill={pt.color}
                  stroke="hsl(var(--background))"
                  strokeWidth={1.5}
                />
              ))}
            </g>
          )}
        </svg>

        {/* HTML tooltip overlaid on the SVG — positioned in % so it scales with the responsive svg */}
        {hoverX !== null && tooltipPoints.length > 0 && (
          <div
            className={cn(
              'pointer-events-none absolute top-1 z-10 surface-elevated shadow-lg border border-border rounded-md px-2 py-1.5 min-w-[140px]',
              tooltipFlip ? '-translate-x-full' : ''
            )}
            style={{
              left: `calc(${(tooltipPxX / W) * 100}% ${tooltipFlip ? '- 8px' : '+ 8px'})`,
            }}
          >
            <div className="text-[10px] font-mono text-muted-foreground mb-1 uppercase tracking-wide">
              {t('projectiles.compareDropAt', { r: hoverX })}
            </div>
            <div className="space-y-0.5">
              {tooltipPoints.map(pt => (
                <div key={`tip-${pt.id}`} className="flex items-center gap-1.5 text-[11px]">
                  <span
                    className="inline-block h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: pt.color }}
                  />
                  <span className="text-foreground truncate flex-1 min-w-0">{pt.label}</span>
                  <span className="font-mono tabular-nums text-foreground shrink-0">
                    {pt.drop.toFixed(1)} mm
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface SortableProjectileHeaderProps {
  id: string;
  draggable: boolean;
  dragLabel: string;
  children: React.ReactNode;
}

/**
 * Sortable `<th>` wrapper for projectile columns. When `draggable` is false the
 * header renders identically to a static `<th>`; when true, a small drag handle
 * appears and pointer/keyboard interactions on the whole header reorder the column.
 *
 * The drag handle is a separate element with its own listeners so users can still
 * click the close (X) button without triggering a drag.
 */
function SortableProjectileHeader({ id, draggable, dragLabel, children }: SortableProjectileHeaderProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver, active } =
    useSortable({ id, disabled: !draggable });
  // Highlight the drop target (the column being hovered by another dragged column)
  // — but never the dragged column itself, which already has its own grabbing style.
  const isDropTarget = isOver && active?.id !== id;
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    cursor: isDragging ? 'grabbing' : undefined,
  };
  return (
    <th
      ref={setNodeRef}
      style={style}
      className={cn(
        'text-left font-medium px-3 py-2 min-w-[160px] align-top transition-[background-color,box-shadow] duration-150',
        isDragging && 'z-20 relative',
        isDropTarget && 'bg-primary/10 ring-2 ring-inset ring-primary/60 rounded-sm animate-pulse'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        {draggable && (
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="p-0.5 rounded hover:bg-muted text-muted-foreground shrink-0 cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-1 focus-visible:ring-primary touch-none"
            title={dragLabel}
            aria-label={dragLabel}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        )}
        {children}
      </div>
    </th>
  );
}
