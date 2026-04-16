import { Crosshair } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Section } from './Section';
import { Field } from './Field';
import { EntitySelect } from './EntitySelect';
import { Projectile } from '@/lib/types';
import { useUnits } from '@/hooks/use-units';

interface Props {
  projectiles: Projectile[];
  selectedId: string;
  onSelect: (id: string) => void;
  bc: number;
  weight: number;
  caliber: string;
  onChange: (patch: { bc?: number; projectileWeight?: number; caliber?: string }) => void;
}

export function ProjectileSection({
  projectiles,
  selectedId,
  onSelect,
  bc,
  weight,
  caliber,
  onChange,
}: Props) {
  const { t } = useI18n();
  const { symbol } = useUnits();

  return (
    <Section
      icon={Crosshair}
      title={t('calc.sectionProjectile')}
      description={t('calc.bc')}
    >
      <EntitySelect
        label={t('calc.selectProjectile')}
        value={selectedId}
        onChange={onSelect}
        options={projectiles.map(p => ({
          id: p.id,
          label: `${p.brand} ${p.model}`,
          sub: `${p.weight}gr · BC ${p.bc} · ${p.caliber}`,
        }))}
        placeholder={t('calc.manualEntry')}
        emptyText={t('calc.noProjectiles')}
        addHref="/library"
      />
      <div className="grid grid-cols-2 gap-2.5">
        <Field
          label={t('calc.projectileWeight')}
          unit={symbol('weight')}
          value={weight}
          step={0.5}
          onChange={v => onChange({ projectileWeight: v })}
        />
        <Field
          label="BC"
          value={bc}
          step={0.001}
          onChange={v => onChange({ bc: v })}
        />
      </div>
      <Field
        label={t('airguns.caliber')}
        value={caliber}
        onChange={v => onChange({ caliber: v.toString() })}
        type="text"
      />
    </Section>
  );
}
