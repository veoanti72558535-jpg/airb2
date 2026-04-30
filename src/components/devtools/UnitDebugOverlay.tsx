import { useState } from 'react';
import { Ruler, X, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useUnitDebug,
  useUnitDebugShortcut,
  setUnitDebug,
} from '@/lib/unit-debug';

/**
 * Bottom-left floating chip that:
 *  1) Activates the unit-debug overlay (paints SI/DSP badges everywhere).
 *  2) Shows a small legend explaining the contract:
 *       - SI  = source of truth, safe to re-inject in the engine.
 *       - DSP = display conversion, never feed back.
 *
 * Mirrors the PerfOverlay pattern (bottom-right). Hidden until the user
 * uses Ctrl/⌘+Shift+U or activates it via the keyboard shortcut once.
 *
 * Stays mounted (vs. PerfOverlay's "if (!enabled) return null") so the
 * keyboard shortcut + collapsed pill remain reachable, which matters for
 * a toggle whose whole point is to be discoverable during a debugging
 * session.
 */
export function UnitDebugOverlay() {
  useUnitDebugShortcut();
  const enabled = useUnitDebug();
  const [showLegend, setShowLegend] = useState(false);

  if (!enabled && !showLegend) {
    // Tiny "off" affordance — purely opt-in. Hidden by default beyond a
    // small dot in the corner so we don't clutter every view.
    return (
      <button
        type="button"
        onClick={() => setUnitDebug(true)}
        title="Mode debug unités (Ctrl/⌘+Shift+U)"
        aria-label="Activer le mode debug unités"
        className={cn(
          'fixed bottom-3 left-3 z-[9999] flex items-center gap-1.5',
          'rounded-md border border-border/40 bg-background/70 px-2 py-1',
          'text-[10px] font-mono text-muted-foreground/80',
          'hover:bg-background/95 hover:text-foreground transition-colors backdrop-blur',
        )}
      >
        <Ruler className="h-3 w-3 opacity-70" />
        <span>units?</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-3 left-3 z-[9999] font-mono text-[11px] select-none">
      <div className="rounded-lg border border-border/60 bg-background/95 shadow-2xl backdrop-blur w-[260px]">
        <div className="flex items-center justify-between gap-2 px-2.5 py-2 border-b border-border/40">
          <div className="flex items-center gap-1.5 text-foreground">
            <Ruler className="h-3.5 w-3.5 text-primary" />
            <span className="font-semibold">Units debug</span>
            <span
              className={cn(
                'text-[9px] uppercase tracking-wider px-1.5 py-px rounded',
                enabled ? 'bg-emerald-500/15 text-emerald-400' : 'bg-muted text-muted-foreground',
              )}
            >
              {enabled ? 'ON' : 'off'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setUnitDebug(!enabled)}
              className="rounded px-1.5 py-0.5 text-[10px] hover:bg-muted/60"
              title="Basculer (Ctrl/⌘+Shift+U)"
            >
              {enabled ? 'Désactiver' : 'Activer'}
            </button>
            <button
              type="button"
              onClick={() => { setShowLegend(false); if (enabled) setUnitDebug(false); }}
              className="rounded p-1 hover:bg-muted/60"
              title="Fermer"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>

        <div className="p-2.5 space-y-2">
          <div className="flex items-start gap-2 text-[10px] text-muted-foreground">
            <Info className="h-3 w-3 mt-0.5 shrink-0" />
            <p className="leading-tight">
              Repère chaque valeur affichée comme <em>vérité physique</em> ou
              <em> conversion d'affichage</em>. Garde-fou contre la
              réinjection accidentelle dans le moteur déterministe.
            </p>
          </div>

          <div className="space-y-1.5">
            <LegendRow
              tone="emerald"
              tag="SI"
              text="Référence interne (m, m/s, J, mm, gr…). Sûr à réinjecter."
            />
            <LegendRow
              tone="amber"
              tag="DSP"
              text="Conversion d'affichage. NE PAS renvoyer au moteur."
            />
          </div>

          <div className="text-[9px] text-muted-foreground/80 pt-1 border-t border-border/30">
            Raccourci · Ctrl/⌘+Shift+U
          </div>
        </div>
      </div>
    </div>
  );
}

function LegendRow({
  tone,
  tag,
  text,
}: {
  tone: 'emerald' | 'amber';
  tag: string;
  text: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <span
        className={cn(
          'inline-flex items-center px-1 py-px rounded text-[8px] font-mono font-bold uppercase border shrink-0',
          tone === 'emerald'
            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
            : 'bg-amber-500/15 text-amber-400 border-amber-500/40',
        )}
      >
        {tag}
      </span>
      <span className="text-[10px] text-foreground/90 leading-tight">{text}</span>
    </div>
  );
}
