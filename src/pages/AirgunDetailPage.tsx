import { useParams } from 'react-router-dom';
import { Target } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { airgunStore } from '@/lib/storage';
import { useUnits } from '@/hooks/use-units';
import { DetailLayout, DetailRow, DetailSection } from '@/components/library/DetailLayout';
import { LinkedSessions } from '@/components/library/LinkedSessions';
import { NotFoundDetail } from '@/components/library/NotFoundDetail';

export default function AirgunDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { t, locale } = useI18n();
  const { symbol } = useUnits();
  const airgun = airgunStore.getById(id);

  if (!airgun) return <NotFoundDetail />;

  const lengthSym = symbol('length');
  const distSym = symbol('distance');
  const pressSym = symbol('pressure');

  const date = (iso: string) =>
    new Date(iso).toLocaleString(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

  return (
    <DetailLayout
      icon={Target}
      title={`${airgun.brand} ${airgun.model}`}
      subtitle={airgun.caliber}
      backHref="/library?tab=airguns"
      useInCalcHref={`/calc?airgun=${airgun.id}`}
      editHref={`/library?tab=airguns&edit=${airgun.id}`}
      badges={
        <>
          <span className="tactical-badge">{airgun.caliber}</span>
          {airgun.barrelLength ? (
            <span className="tactical-badge">{airgun.barrelLength}{lengthSym}</span>
          ) : null}
          {airgun.twistRate ? (
            <span className="tactical-badge">1:{airgun.twistRate}″</span>
          ) : null}
        </>
      }
    >
      <DetailSection title={t('detail.essentials')}>
        <DetailRow label={t('airguns.brand')} value={airgun.brand} />
        <DetailRow label={t('airguns.model')} value={airgun.model} />
        <DetailRow label={t('airguns.caliber')} value={airgun.caliber} />
        <DetailRow
          label={t('airguns.barrelLength')}
          value={airgun.barrelLength ? `${airgun.barrelLength} ${lengthSym}` : undefined}
        />
      </DetailSection>

      <DetailSection title={t('detail.advanced')}>
        <DetailRow
          label={t('calc.twistRate')}
          value={airgun.twistRate ? `1:${airgun.twistRate}″` : undefined}
        />
        <DetailRow
          label={t('airguns.defaultSightHeight')}
          value={
            airgun.defaultSightHeight
              ? `${airgun.defaultSightHeight} ${lengthSym}`
              : undefined
          }
        />
        <DetailRow
          label={t('airguns.defaultZeroRange')}
          value={
            airgun.defaultZeroRange
              ? `${airgun.defaultZeroRange} ${distSym}`
              : undefined
          }
        />
        <DetailRow
          label={t('airguns.regPressure')}
          value={airgun.regPressure ? `${airgun.regPressure} ${pressSym}` : undefined}
        />
        <DetailRow
          label={t('airguns.fillPressure')}
          value={airgun.fillPressure ? `${airgun.fillPressure} ${pressSym}` : undefined}
        />
        <DetailRow label={t('airguns.powerSetting')} value={airgun.powerSetting} />
      </DetailSection>

      {airgun.notes && (
        <DetailSection title={t('airguns.notes')}>
          <p className="text-sm text-muted-foreground italic whitespace-pre-wrap">
            {airgun.notes}
          </p>
        </DetailSection>
      )}

      <LinkedSessions field="airgunId" id={airgun.id} />

      <DetailSection title={t('detail.metadata')}>
        <DetailRow label={t('detail.createdAt')} value={date(airgun.createdAt)} />
        <DetailRow label={t('detail.updatedAt')} value={date(airgun.updatedAt)} />
      </DetailSection>
    </DetailLayout>
  );
}
