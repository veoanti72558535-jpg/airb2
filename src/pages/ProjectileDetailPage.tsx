import { useParams } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { projectileStore } from '@/lib/storage';
import { useUnits } from '@/hooks/use-units';
import { DetailLayout, DetailRow, DetailSection } from '@/components/library/DetailLayout';
import { LinkedSessions } from '@/components/library/LinkedSessions';
import { NotFoundDetail } from '@/components/library/NotFoundDetail';
import { Bullets4ProjectileDetails } from '@/components/projectiles/Bullets4ProjectileDetails';

export default function ProjectileDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { t, locale } = useI18n();
  const { symbol } = useUnits();
  const p = projectileStore.getById(id);

  if (!p) return <NotFoundDetail />;

  const weightSym = symbol('weight');
  const lengthSym = symbol('length');

  const date = (iso: string) =>
    new Date(iso).toLocaleString(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

  return (
    <DetailLayout
      icon={Zap}
      title={`${p.brand} ${p.model}`}
      subtitle={`${p.caliber} · ${p.weight} ${weightSym}`}
      backHref="/library?tab=projectiles"
      useInCalcHref={`/calc?projectile=${p.id}`}
      editHref={`/library?tab=projectiles&edit=${p.id}`}
      badges={
        <>
          <span className="tactical-badge">{p.caliber}</span>
          <span className="tactical-badge">{p.weight} {weightSym}</span>
          <span className="tactical-badge">
            BC {p.bc}
            {p.bcModel ? ` ${p.bcModel}` : ''}
          </span>
          {p.projectileType && p.projectileType !== 'pellet' && (
            <span className="tactical-badge">{p.projectileType}</span>
          )}
          {p.customDragTable && p.customDragTable.length > 0 && (
            <span className="tactical-badge">
              {t('projectiles.dragTableBadge', { count: p.customDragTable.length })}
            </span>
          )}
        </>
      }
    >
      <DetailSection title={t('detail.essentials')}>
        <DetailRow label={t('projectiles.brand')} value={p.brand} />
        <DetailRow label={t('projectiles.model')} value={p.model} />
        <DetailRow label={t('projectiles.caliber')} value={p.caliber} />
        <DetailRow label={t('projectiles.weight')} value={`${p.weight} ${weightSym}`} />
        <DetailRow label={t('projectiles.bc')} value={p.bc} />
        <DetailRow label={t('projectiles.type')} value={p.projectileType} />
      </DetailSection>

      <DetailSection title={t('detail.advanced')}>
        <DetailRow label={t('projectiles.dragModel')} value={p.bcModel ?? 'G1'} />
        <DetailRow
          label={t('projectiles.length')}
          value={p.length ? `${p.length} ${lengthSym}` : undefined}
        />
        <DetailRow
          label={t('projectiles.diameter')}
          value={p.diameter ? `${p.diameter} ${lengthSym}` : undefined}
        />
        <DetailRow label={t('projectiles.shape')} value={p.shape} />
        <DetailRow label={t('projectiles.material')} value={p.material} />
      </DetailSection>

      {p.notes && (
        <DetailSection title={t('airguns.notes')}>
          <p className="text-sm text-muted-foreground italic whitespace-pre-wrap">
            {p.notes}
          </p>
        </DetailSection>
      )}

      <Bullets4ProjectileDetails projectile={p} />

      <LinkedSessions field="projectileId" id={p.id} />

      <DetailSection title={t('detail.metadata')}>
        <DetailRow label={t('detail.createdAt')} value={date(p.createdAt)} />
        <DetailRow label={t('detail.updatedAt')} value={date(p.updatedAt)} />
      </DetailSection>
    </DetailLayout>
  );
}
