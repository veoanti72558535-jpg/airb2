/**
 * <UnitTagSurface> — sentinelle invisible permettant à une surface
 * (carte, tableau, page) d'attester qu'elle convertit des valeurs
 * d'affichage et que le mode debug DOIT marquer ses sorties.
 *
 * Utilité : certaines cartes/listes sont denses (tableaux, charts) et
 * y caser un `<UnitTag>` à chaque cellule alourdirait la mise en page.
 * Cette sentinelle rend, en mode debug uniquement, un petit groupe de
 * badges DSP listant les catégories d'unité utilisées par la surface.
 * Cela suffit au reviewer humain pour identifier "ici il y a des
 * conversions d'affichage", tout en étant rigoureusement invisible en
 * production.
 *
 * Usage typique :
 *   <Card>
 *     <UnitTagSurface categories={['velocity', 'distance', 'energy']} label="Résultats" />
 *     ...
 *   </Card>
 */
import { UnitTag } from './UnitTag';
import { useUnits } from '@/hooks/use-units';
import { cn } from '@/lib/utils';

interface Props {
  categories: string[];
  label?: string;
  className?: string;
}

const REF: Record<string, string> = {
  velocity: 'm/s',
  windSpeed: 'm/s',
  distance: 'm',
  length: 'm',
  drop: 'm',
  drift: 'm',
  energy: 'J',
  weight: 'g',
  mass: 'g',
  diameter: 'mm',
  caliber: 'mm',
  temperature: '°C',
  pressure: 'hPa',
};

export function UnitTagSurface({ categories, label, className }: Props) {
  const { symbol } = useUnits();
  return (
    <span
      className={cn('inline-flex flex-wrap items-center gap-0.5', className)}
      data-unit-debug-surface
      aria-hidden
    >
      {categories.map((c) => (
        <UnitTag
          key={c}
          kind="display"
          reference={REF[c] ?? c}
          display={symbol(c)}
          label={label ? `${label}·${c}` : c}
        />
      ))}
    </span>
  );
}
