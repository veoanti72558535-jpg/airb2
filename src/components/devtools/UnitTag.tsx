import { useUnitDebug } from '@/lib/unit-debug';
import { cn } from '@/lib/utils';

interface UnitTagProps {
  /**
   * - "si"      → value is a reference SI unit straight from the engine
   *               (mm, m/s, J, m, grains, °C…). Safe to re-inject.
   * - "display" → value is a converted display, never feed back.
   */
  kind: 'si' | 'display';
  /** Reference unit symbol (always shown in tooltip + chip body). */
  reference: string;
  /** Display unit symbol — only meaningful when kind === "display". */
  display?: string;
  /** Optional label for the field (helps when many tags are visible). */
  label?: string;
  className?: string;
}

/**
 * Tiny inline badge surfacing the "physical truth vs display conversion"
 * status of a value. Renders nothing when the unit-debug overlay is off,
 * so production UI is untouched.
 *
 * Use everywhere a number is rendered to/from a user. The cost when
 * disabled is one boolean read (zero DOM).
 */
export function UnitTag({ kind, reference, display, label, className }: UnitTagProps) {
  const debug = useUnitDebug();
  if (!debug) return null;

  const isSi = kind === 'si';
  const title = isSi
    ? `SI · ${label ? label + ' · ' : ''}valeur de référence en ${reference} — sûre pour réinjection moteur`
    : `DSP · ${label ? label + ' · ' : ''}conversion d'affichage ${reference} → ${display ?? '?'} — NE PAS réinjecter dans le moteur`;

  return (
    <span
      data-unit-debug={kind}
      title={title}
      aria-label={title}
      className={cn(
        'inline-flex items-center px-1 py-px ml-1 rounded text-[8px] font-mono font-bold uppercase leading-none align-middle border',
        isSi
          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
          : 'bg-amber-500/15 text-amber-400 border-amber-500/40',
        className,
      )}
    >
      {isSi ? 'SI' : 'DSP'}
    </span>
  );
}
