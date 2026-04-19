import { useI18n } from '@/lib/i18n';
import type { Projectile } from '@/lib/types';
import { DetailRow, DetailSection } from '@/components/library/DetailLayout';

interface Props {
  projectile: Projectile;
}

/**
 * Section "données catalogue avancées" pour un projectile.
 *
 * Affiche les champs enrichis issus de l'import bullets4 (diamètres précis,
 * poids dans les deux unités, BC G1/G7, zones BC, longueur, identifiants
 * source, provenance). Toutes les lignes sont conditionnelles : si un champ
 * est absent, la ligne n'est pas rendue. Si AUCUN champ enrichi n'est
 * présent, la section entière n'est pas rendue (retour `null`).
 *
 * Aucune valeur affichée ici n'est consommée par le moteur balistique —
 * c'est strictement une aide à la lecture catalogue.
 */
export function Bullets4ProjectileDetails({ projectile: p }: Props) {
  const { t } = useI18n();

  const hasCatalogData =
    p.caliberLabel !== undefined ||
    p.diameterMm !== undefined ||
    p.diameterIn !== undefined ||
    p.weightGrains !== undefined ||
    p.weightGrams !== undefined ||
    p.weightUnit !== undefined ||
    p.bcG1 !== undefined ||
    p.bcG7 !== undefined ||
    (p.bcZones !== undefined && p.bcZones !== null && p.bcZones.length > 0) ||
    (p.lengthMm !== undefined && p.lengthMm !== null) ||
    (p.lengthIn !== undefined && p.lengthIn !== null);

  const hasProvenanceData =
    p.sourceDbId !== undefined ||
    p.sourceTable !== undefined ||
    p.importedFrom !== undefined;

  if (!hasCatalogData && !hasProvenanceData) return null;

  // Format numérique court mais précis (3 décimales max, sans zéros traînants).
  const fmt = (n: number, decimals = 3): string => {
    const v = Number(n.toFixed(decimals));
    return Number.isFinite(v) ? String(v) : '';
  };

  return (
    <>
      {hasCatalogData && (
        <DetailSection title={t('projectiles.bullets4.title')}>
          <p className="text-[11px] text-muted-foreground italic mb-2">
            {t('projectiles.bullets4.hint')}
          </p>

          <DetailRow
            label={t('projectiles.bullets4.caliberLabel')}
            value={p.caliberLabel}
          />
          <DetailRow
            label={t('projectiles.bullets4.diameterMm')}
            value={p.diameterMm !== undefined ? `${fmt(p.diameterMm, 4)} mm` : undefined}
          />
          <DetailRow
            label={t('projectiles.bullets4.diameterIn')}
            value={p.diameterIn !== undefined ? `${fmt(p.diameterIn, 4)} in` : undefined}
          />
          <DetailRow
            label={t('projectiles.bullets4.weightGrains')}
            value={p.weightGrains !== undefined ? `${fmt(p.weightGrains, 3)} gr` : undefined}
          />
          <DetailRow
            label={t('projectiles.bullets4.weightGrams')}
            value={p.weightGrams !== undefined ? `${fmt(p.weightGrams, 3)} g` : undefined}
          />
          <DetailRow
            label={t('projectiles.bullets4.weightUnit')}
            value={p.weightUnit}
          />
          <DetailRow label={t('projectiles.bullets4.bcG1')} value={p.bcG1} />
          <DetailRow label={t('projectiles.bullets4.bcG7')} value={p.bcG7} />
          <DetailRow
            label={t('projectiles.bullets4.lengthMm')}
            value={
              p.lengthMm !== undefined && p.lengthMm !== null
                ? `${fmt(p.lengthMm, 3)} mm`
                : undefined
            }
          />
          <DetailRow
            label={t('projectiles.bullets4.lengthIn')}
            value={
              p.lengthIn !== undefined && p.lengthIn !== null
                ? `${fmt(p.lengthIn, 4)} in`
                : undefined
            }
          />

          {p.bcZones && p.bcZones.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <h3 className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
                {t('projectiles.bullets4.bcZonesTitle')}
              </h3>
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="text-muted-foreground">
                      <th className="text-left font-normal py-1 px-1">
                        {t('projectiles.bullets4.bcZonesHeaderBc')}
                      </th>
                      <th className="text-right font-normal py-1 px-1">
                        {t('projectiles.bullets4.bcZonesHeaderVmin')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.bcZones.map((z, i) => (
                      <tr
                        key={`${i}-${z.bc}-${z.minVelocity}`}
                        className="border-t border-border/30"
                      >
                        <td className="py-1 px-1">{fmt(z.bc, 4)}</td>
                        <td className="py-1 px-1 text-right">
                          {fmt(z.minVelocity, 1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DetailSection>
      )}

      {hasProvenanceData && (
        <DetailSection title={t('projectiles.bullets4.provenanceTitle')}>
          <DetailRow
            label={t('projectiles.bullets4.importedFrom')}
            value={p.importedFrom}
          />
          <DetailRow
            label={t('projectiles.bullets4.sourceTable')}
            value={p.sourceTable}
          />
          <DetailRow
            label={t('projectiles.bullets4.sourceDbId')}
            value={p.sourceDbId}
          />
        </DetailSection>
      )}
    </>
  );
}
