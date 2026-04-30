/**
 * <UnitValue> — primitive d'affichage qui couple TROIS choses :
 *   1. la conversion SI → préférence (display)
 *   2. le symbole de l'unité d'affichage
 *   3. le badge DSP/SI (visible uniquement en mode debug)
 *
 * Utiliser ce composant garantit qu'aucune valeur convertie n'est rendue
 * sans son badge "DSP" en mode debug — c'est le contrat documenté dans
 * `docs/engine/deterministic-contract.md`.
 *
 * Convention :
 *   - <UnitValue category="velocity" value={si} />        → "920 m/s"  + badge DSP (si Imperial: "3018 fps" + DSP)
 *   - <UnitValue category="velocity" value={si} kind="si" /> → marque la valeur comme déjà SI (badge SI vert)
 *
 * Le composant ne rend jamais d'overlay en production : `UnitTag` est
 * un no-op quand le mode debug est éteint.
 */
import { useUnits } from '@/hooks/use-units';
import { UnitTag } from './UnitTag';
import { cn } from '@/lib/utils';

interface UnitValueProps {
  /** Clé de catégorie (velocity, distance, length, energy, weight, …) */
  category: string;
  /** Valeur SI (référence). Toujours en SI, jamais convertie en amont. */
  value: number;
  /** Nombre de décimales pour `toFixed`. Par défaut 1. */
  decimals?: number;
  /**
   * - "display" (défaut) : la valeur va être convertie pour affichage → badge DSP.
   * - "si"               : la valeur reste en SI (pas de conversion) → badge SI.
   */
  kind?: 'si' | 'display';
  /** Libellé court pour le tooltip du badge. */
  label?: string;
  /** Affiche le symbole d'unité. Défaut: true. */
  showSymbol?: boolean;
  /** Espace entre nombre et symbole. Défaut: " ". */
  separator?: string;
  className?: string;
}

export function UnitValue({
  category,
  value,
  decimals = 1,
  kind = 'display',
  label,
  showSymbol = true,
  separator = ' ',
  className,
}: UnitValueProps) {
  const u = useUnits();
  const shown = kind === 'si' ? value : u.display(category, value);
  const sym = u.symbol(category);

  return (
    <span className={cn('inline-flex items-baseline', className)}>
      <span>
        {Number.isFinite(shown) ? shown.toFixed(decimals) : '—'}
        {showSymbol && sym ? `${separator}${sym}` : ''}
      </span>
      <UnitTag
        kind={kind}
        reference={referenceSymbol(category)}
        display={sym}
        label={label ?? category}
      />
    </span>
  );
}

/**
 * Symbole SI canonique (utilisé pour le tooltip du badge DSP afin de
 * rappeler la vérité physique sous-jacente). Aligné sur le contrat
 * déterministe — voir docs/engine/deterministic-contract.md §2.
 */
function referenceSymbol(category: string): string {
  switch (category) {
    case 'velocity':
    case 'windSpeed':
      return 'm/s';
    case 'distance':
    case 'length':
    case 'drop':
    case 'drift':
      return 'm';
    case 'energy':
      return 'J';
    case 'weight':
    case 'mass':
      return 'g';
    case 'diameter':
    case 'caliber':
      return 'mm';
    case 'temperature':
      return '°C';
    case 'pressure':
      return 'hPa';
    default:
      return category;
  }
}
