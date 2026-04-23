/**
 * R1 — Projectile web search agent.
 * Returns a structured pellet/slug datasheet (manufacturer, BC, weight, ...).
 * Provides "Import to library" → projectileStore.create().
 */
import { useCallback } from 'react';
import { Download } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { projectileStore } from '@/lib/storage';
import { WebSearchAgentBase, SourcesList, ConfidenceBadge } from './WebSearchAgentBase';

export interface ProjectileSearchResult {
  name?: string;
  manufacturer?: string;
  caliber?: string;
  weightGrains?: number;
  weightGrams?: number;
  diameterMm?: number;
  lengthMm?: number;
  bcG1?: number | null;
  bcG7?: number | null;
  sectionDensity?: number;
  recommendedVelocityMs?: { min?: number; max?: number };
  type?: 'pellet' | 'slug' | 'slug-diabolo' | string;
  material?: string;
  sources?: string[];
  notes?: string;
  confidence?: number;
}

interface Props {
  initialQuery?: string;
  onResult?: (data: ProjectileSearchResult) => void;
}

export function ProjectileSearchAgent({ initialQuery, onResult }: Props) {
  const { t } = useI18n();

  const handleImport = useCallback((d: ProjectileSearchResult) => {
    const brand = d.manufacturer ?? '';
    const model = d.name ?? '';
    if (!model) {
      toast({ title: t('agentSearch.noResult' as any), variant: 'destructive' });
      return;
    }
    projectileStore.create({
      brand,
      model,
      weight: d.weightGrains ?? 0,
      weightUnit: 'gr',
      bc: d.bcG1 ?? d.bcG7 ?? 0,
      bcModel: d.bcG1 ? 'G1' : d.bcG7 ? 'G7' : 'G1',
      caliber: d.caliber ?? '',
      projectileType: (d.type === 'slug' || d.type === 'slug-diabolo') ? 'slug' : 'pellet',
      shape: 'domed',
      length: d.lengthMm ?? 0,
      diameter: d.diameterMm ?? 0,
      material: d.material ?? '',
      notes: [d.notes ?? '', d.sources?.length ? `Sources: ${d.sources.join(', ')}` : '']
        .filter(Boolean).join('\n'),
      dataSource: 'ai-web-search',
    } as any);
    toast({ title: t('agentSearch.importToLibrary' as any) + ' ✓' });
  }, [t]);

  return (
    <WebSearchAgentBase<ProjectileSearchResult>
      agentSlug="projectile-search-web"
      testIdPrefix="projectile-search"
      inputPlaceholder={t('agentSearch.queryLabel' as any)}
      searchLabel={t('agentSearch.searchProjectile' as any)}
      initialQuery={initialQuery}
      onResult={onResult}
      renderResult={(d) => (
        <div className="space-y-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold">{d.name ?? '—'}</h4>
            {d.manufacturer && (
              <span className="text-muted-foreground">— {d.manufacturer}</span>
            )}
            <ConfidenceBadge value={d.confidence} />
          </div>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-3">
            {d.caliber && <Pair label={t('calc.caliber' as any) || 'Caliber'} v={d.caliber} />}
            {d.weightGrains != null && <Pair label="Weight" v={`${d.weightGrains} gr`} />}
            {d.diameterMm != null && <Pair label="Ø" v={`${d.diameterMm} mm`} />}
            {d.lengthMm != null && <Pair label="L" v={`${d.lengthMm} mm`} />}
            {d.bcG1 != null && <Pair label="BC G1" v={String(d.bcG1)} />}
            {d.bcG7 != null && <Pair label="BC G7" v={String(d.bcG7)} />}
            {d.sectionDensity != null && <Pair label="SD" v={String(d.sectionDensity)} />}
            {d.recommendedVelocityMs?.min != null && (
              <Pair label="V min" v={`${d.recommendedVelocityMs.min} m/s`} />
            )}
            {d.recommendedVelocityMs?.max != null && (
              <Pair label="V max" v={`${d.recommendedVelocityMs.max} m/s`} />
            )}
          </dl>
          {d.notes && <p className="text-[11px] italic text-muted-foreground">{d.notes}</p>}
          <SourcesList sources={d.sources} />
          <div className="pt-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => handleImport(d)}
              className="gap-1"
              data-testid="projectile-search-import"
            >
              <Download className="h-3.5 w-3.5" />
              {t('agentSearch.importToLibrary' as any)}
            </Button>
          </div>
        </div>
      )}
    />
  );
}

function Pair({ label, v }: { label: string; v: string }) {
  return (
    <div className="flex justify-between gap-2 border-b border-border/40 py-0.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono">{v}</dd>
    </div>
  );
}