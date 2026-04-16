import { Ruler } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Section } from './Section';
import { Field } from './Field';
import { Switch } from '@/components/ui/switch';
import { useUnits } from '@/hooks/use-units';

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
  const { symbol } = useUnits();
  const dist = symbol('distance');

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
      <Field
        label={t('calc.targetDistance')}
        unit={dist}
        value={targetDistance}
        step={5}
        onChange={v => onChange({ targetDistance: v })}
      />
      {useRange && (
        <div className={advanced ? 'grid grid-cols-3 gap-2.5' : 'grid grid-cols-2 gap-2.5'}>
          {advanced && (
            <Field
              label={t('calc.minRange')}
              unit={dist}
              value={minRange}
              step={5}
              onChange={v => onChange({ minRange: v })}
            />
          )}
          <Field
            label={t('calc.maxRange')}
            unit={dist}
            value={maxRange}
            step={10}
            onChange={v => onChange({ maxRange: v })}
          />
          <Field
            label={t('calc.rangeStep')}
            unit={dist}
            value={rangeStep}
            step={5}
            onChange={v => onChange({ rangeStep: v })}
          />
        </div>
      )}
    </Section>
  );
}
