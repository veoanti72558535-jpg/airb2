import { Target } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Section } from './Section';
import { Field } from './Field';
import { EntitySelect } from './EntitySelect';
import { Airgun, Optic } from '@/lib/types';
import { useUnits } from '@/hooks/use-units';

interface Props {
  airguns: Airgun[];
  optics: Optic[];
  selectedAirgun: string;
  selectedOptic: string;
  onSelectAirgun: (id: string) => void;
  onSelectOptic: (id: string) => void;
  sightHeight: number;
  zeroRange: number;
  clickValue: number;
  clickUnit: 'MOA' | 'MRAD';
  onChange: (patch: {
    sightHeight?: number;
    zeroRange?: number;
    clickValue?: number;
    clickUnit?: 'MOA' | 'MRAD';
  }) => void;
  advanced?: boolean;
}

export function WeaponSection({
  airguns,
  optics,
  selectedAirgun,
  selectedOptic,
  onSelectAirgun,
  onSelectOptic,
  sightHeight,
  zeroRange,
  clickValue,
  clickUnit,
  onChange,
  advanced,
}: Props) {
  const { t } = useI18n();
  const { symbol } = useUnits();
  return (
    <Section icon={Target} title={t('calc.sectionWeapon')}>
      <EntitySelect
        label={t('calc.selectAirgun')}
        value={selectedAirgun}
        onChange={onSelectAirgun}
        options={airguns.map(a => ({
          id: a.id,
          label: `${a.brand} ${a.model}`,
          sub: a.caliber,
        }))}
        placeholder={t('calc.manualEntry')}
        emptyText={t('calc.noAirguns')}
        addHref="/library"
      />
      <EntitySelect
        label={t('calc.selectOptic')}
        value={selectedOptic}
        onChange={onSelectOptic}
        options={optics.map(o => {
          const parts = [`${o.clickValue} ${o.clickUnit}`];
          if (o.tubeDiameter) parts.push(`⌀${o.tubeDiameter}mm`);
          if (o.magCalibration) parts.push(`cal ${o.magCalibration}×`);
          return {
            id: o.id,
            label: o.name,
            sub: parts.join(' · '),
          };
        })}
        placeholder={t('calc.manualEntry')}
        emptyText={t('calc.noOptics')}
        addHref="/library"
      />
      <div className="grid grid-cols-2 gap-2.5">
        <Field
          label={t('calc.sightHeight')}
          unit={symbol('length')}
          value={sightHeight}
          step={1}
          onChange={v => onChange({ sightHeight: v })}
        />
        <Field
          label={t('calc.zeroRange')}
          unit={symbol('distance')}
          value={zeroRange}
          step={5}
          onChange={v => onChange({ zeroRange: v })}
        />
      </div>
      {advanced && (
        <div className="grid grid-cols-2 gap-2.5">
          <Field
            label={t('calc.clickValue')}
            value={clickValue}
            step={0.05}
            onChange={v => onChange({ clickValue: v })}
          />
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              {t('calc.clickUnit')}
            </label>
            <select
              value={clickUnit}
              onChange={e => onChange({ clickUnit: e.target.value as 'MOA' | 'MRAD' })}
              className="w-full bg-muted/40 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="MOA">MOA</option>
              <option value="MRAD">MRAD</option>
            </select>
          </div>
        </div>
      )}
    </Section>
  );
}
