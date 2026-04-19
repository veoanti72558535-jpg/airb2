import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { Eye } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { opticStore } from '@/lib/storage';
import { useUnits } from '@/hooks/use-units';
import { DetailLayout, DetailRow, DetailSection } from '@/components/library/DetailLayout';
import { LinkedSessions } from '@/components/library/LinkedSessions';
import { NotFoundDetail } from '@/components/library/NotFoundDetail';
import { OpticReticleLink } from '@/components/optics/OpticReticleLink';
import type { Optic } from '@/lib/types';

export default function OpticDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { t, locale } = useI18n();
  const { symbol } = useUnits();
  const [o, setO] = useState<Optic | undefined>(() => opticStore.getById(id));

  if (!o) return <NotFoundDetail />;

  const lengthSym = symbol('length');
  const fp = o.focalPlane ?? (o.magCalibration ? 'SFP' : null);

  const handleReticleChange = (next: string | undefined) => {
    const updated = opticStore.update(o.id, { reticleId: next });
    if (updated) setO(updated);
  };

  const date = (iso: string) =>
    new Date(iso).toLocaleString(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

  return (
    <DetailLayout
      icon={Eye}
      title={o.name}
      subtitle={o.type}
      backHref="/library?tab=optics"
      useInCalcHref={`/calc?optic=${o.id}`}
      editHref={`/library?tab=optics&edit=${o.id}`}
      badges={
        <>
          {fp && <span className="tactical-badge">{fp}</span>}
          <span className="tactical-badge">{o.clickValue} {o.clickUnit}/click</span>
          {o.tubeDiameter && (
            <span className="tactical-badge">⌀ {o.tubeDiameter}mm</span>
          )}
          {fp === 'SFP' && o.magCalibration && (
            <span className="tactical-badge">cal {o.magCalibration}×</span>
          )}
        </>
      }
    >
      <DetailSection title={t('detail.essentials')}>
        <DetailRow label={t('optics.name')} value={o.name} />
        <DetailRow label={t('optics.type')} value={o.type} />
        <DetailRow label={t('calc.focalPlane')} value={fp} />
        <DetailRow
          label={t('optics.clickValue')}
          value={`${o.clickValue} ${o.clickUnit}`}
        />
      </DetailSection>

      <DetailSection title={t('detail.advanced')}>
        <DetailRow
          label={t('optics.mountHeight')}
          value={o.mountHeight ? `${o.mountHeight} ${lengthSym}` : undefined}
        />
        <DetailRow
          label={t('optics.tubeDiameter')}
          value={o.tubeDiameter ? `${o.tubeDiameter} mm` : undefined}
        />
        <DetailRow
          label={t('optics.magCalibration')}
          value={fp === 'SFP' && o.magCalibration ? `${o.magCalibration}×` : undefined}
        />
      </DetailSection>

      {o.notes && (
        <DetailSection title={t('airguns.notes')}>
          <p className="text-sm text-muted-foreground italic whitespace-pre-wrap">
            {o.notes}
          </p>
        </DetailSection>
      )}

      <DetailSection title={t('optics.reticle.label')}>
        <OpticReticleLink
          reticleId={o.reticleId}
          onChange={handleReticleChange}
        />
      </DetailSection>

      <LinkedSessions field="opticId" id={o.id} />

      <DetailSection title={t('detail.metadata')}>
        <DetailRow label={t('detail.createdAt')} value={date(o.createdAt)} />
        <DetailRow label={t('detail.updatedAt')} value={date(o.updatedAt)} />
      </DetailSection>
    </DetailLayout>
  );
}
