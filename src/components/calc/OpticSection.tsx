import { Telescope } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Section } from './Section';
import { Field } from './Field';
import { UnitField } from './UnitField';
import { EntitySelect } from './EntitySelect';
import { Optic, OpticFocalPlane } from '@/lib/types';

interface Props {
  optics: Optic[];
  selectedOptic: string;
  onSelectOptic: (id: string) => void;
  focalPlane: OpticFocalPlane;
  clickValue: number;
  clickUnit: 'MOA' | 'MRAD';
  currentMag?: number;
  magCalibration?: number;
  onChange: (patch: {
    focalPlane?: OpticFocalPlane;
    clickValue?: number;
    clickUnit?: 'MOA' | 'MRAD';
    currentMag?: number;
    magCalibration?: number;
  }) => void;
  advanced?: boolean;
}

export function OpticSection({
  optics,
  selectedOptic,
  onSelectOptic,
  focalPlane,
  clickValue,
  clickUnit,
  currentMag,
  magCalibration,
  onChange,
  advanced,
}: Props) {
  const { t } = useI18n();
  const isSFP = focalPlane === 'SFP';
  const magMismatch =
    isSFP &&
    magCalibration != null &&
    currentMag != null &&
    currentMag > 0 &&
    Math.abs(currentMag - magCalibration) > 0.01;

  return (
    <Section icon={Telescope} title={t('calc.sectionOptic')}>
      <EntitySelect
        label={t('calc.selectOptic')}
        value={selectedOptic}
        onChange={onSelectOptic}
        options={optics.map(o => {
          const parts = [`${o.clickValue} ${o.clickUnit}`];
          if (o.focalPlane) parts.push(o.focalPlane);
          if (o.magCalibration) parts.push(`cal ${o.magCalibration}×`);
          return { id: o.id, label: o.name, sub: parts.join(' · ') };
        })}
        placeholder={t('calc.manualEntry')}
        emptyText={t('calc.noOptics')}
        addHref="/library"
      />

      <div className="grid grid-cols-2 gap-2.5">
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            {t('calc.focalPlane')}
          </label>
          <div className="grid grid-cols-2 rounded-md border border-border bg-muted/20 p-0.5">
            {(['FFP', 'SFP'] as OpticFocalPlane[]).map(fp => (
              <button
                key={fp}
                type="button"
                onClick={() => onChange({ focalPlane: fp })}
                className={`text-xs font-mono py-1.5 rounded transition-colors ${
                  focalPlane === fp
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {fp}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            {t('calc.clickUnit')}
          </label>
          <div className="grid grid-cols-2 rounded-md border border-border bg-muted/20 p-0.5">
            {(['MRAD', 'MOA'] as const).map(u => (
              <button
                key={u}
                type="button"
                onClick={() => onChange({ clickUnit: u })}
                className={`text-xs font-mono py-1.5 rounded transition-colors ${
                  clickUnit === u
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Field
        label={t('calc.clickValue')}
        value={clickValue}
        step={0.05}
        unit={`${clickUnit}/click`}
        onChange={v => onChange({ clickValue: v })}
      />

      {advanced && (
        <div className="grid grid-cols-2 gap-2.5">
          <Field
            label={t('calc.currentMag')}
            value={currentMag ?? 0}
            step={1}
            unit="×"
            onChange={v => onChange({ currentMag: v || undefined })}
            hint={isSFP ? t('calc.currentMagHint') : undefined}
          />
          <Field
            label={t('calc.magCalibration')}
            value={magCalibration ?? 0}
            step={1}
            unit="×"
            onChange={v => onChange({ magCalibration: v || undefined })}
            hint={isSFP ? t('calc.magCalHint') : t('calc.ffpAlwaysCalibrated')}
          />
        </div>
      )}

      {isSFP && magMismatch && (
        <div className="flex items-start gap-1.5 rounded-md border border-warning/30 bg-warning/5 px-2.5 py-1.5 text-[11px] text-warning">
          <span aria-hidden className="mt-px">⚠</span>
          <span>{t('calc.sfpReticleHint', { mag: magCalibration ?? 0 })}</span>
        </div>
      )}
      {!isSFP && (
        <p className="text-[10px] text-muted-foreground/80">{t('calc.ffpHint')}</p>
      )}
    </Section>
  );
}
