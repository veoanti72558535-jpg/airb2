import { Gauge } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Section } from './Section';
import { Field } from './Field';
import { useUnits } from '@/hooks/use-units';
import { UnitTagSurface } from '@/components/devtools/UnitTagSurface';

interface Props {
  velocity: number;
  onChange: (v: number) => void;
}

export function VelocitySection({ velocity, onChange }: Props) {
  const { t } = useI18n();
  const { symbol } = useUnits();
  return (
    <Section icon={Gauge} title={t('calc.sectionVelocity')}>
      <UnitTagSurface categories={['velocity']} label="Velocity" />
      <Field
        label={t('calc.muzzleVelocity')}
        unit={symbol('velocity')}
        value={velocity}
        step={1}
        onChange={onChange}
      />
    </Section>
  );
}
