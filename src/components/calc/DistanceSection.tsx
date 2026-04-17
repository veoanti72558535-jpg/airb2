import { Ruler } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Section } from './Section';
import { UnitField } from './UnitField';
import { Switch } from '@/components/ui/switch';

interface Props {
  targetDistance: number;
  useRange: boolean;
  minRange: number;
  maxRange: number;
  rangeStep: number;
  onChange: (patch: {
    targetDistance?: number;
    useRange?: boolean;
    minRange?: number;
    maxRange?: number;
    rangeStep?: number;
  }) => void;
  advanced?: boolean;
}

export function DistanceSection({
  targetDistance,
  useRange,
  minRange,
  maxRange,
  rangeStep,
  onChange,
  advanced,
}: Props) {
  const { t } = useI18n();

  return (
    <Section
      icon={Ruler}
      title={t('calc.sectionDistances')}
      action={
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
            {t('calc.useRange')}
          </span>
          <Switch checked={useRange} onCheckedChange={v => onChange({ useRange: v })} />
        </div>
      }
    >
      <UnitField
        label={t('calc.targetDistance')}
        category="distance"
        value={targetDistance}
        step={5}
        onChange={v => onChange({ targetDistance: v })}
      />
      {useRange && (
        <div className={advanced ? 'grid grid-cols-3 gap-2.5' : 'grid grid-cols-2 gap-2.5'}>
          {advanced && (
            <UnitField
              label={t('calc.minRange')}
              category="distance"
              value={minRange}
              step={5}
              onChange={v => onChange({ minRange: v })}
            />
          )}
          <UnitField
            label={t('calc.maxRange')}
            category="distance"
            value={maxRange}
            step={10}
            onChange={v => onChange({ maxRange: v })}
          />
          <UnitField
            label={t('calc.rangeStep')}
            category="distance"
            value={rangeStep}
            step={5}
            onChange={v => onChange({ rangeStep: v })}
          />
        </div>
      )}
    </Section>
  );
}
