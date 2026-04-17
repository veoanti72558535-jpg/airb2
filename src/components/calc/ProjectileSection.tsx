import { Crosshair, HelpCircle } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Section } from './Section';
import { Field } from './Field';
import { UnitField } from './UnitField';
import { EntitySelect } from './EntitySelect';
import { Projectile, DragModel, ProjectileType } from '@/lib/types';

interface Props {
  projectiles: Projectile[];
  selectedId: string;
  onSelect: (id: string) => void;
  bc: number;
  weight: number;
  dragModel: DragModel;
  projectileType: ProjectileType;
  length?: number;
  diameter?: number;
  onChange: (patch: {
    bc?: number;
    projectileWeight?: number;
    dragModel?: DragModel;
    projectileType?: ProjectileType;
    projectileLength?: number;
    projectileDiameter?: number;
  }) => void;
  advanced?: boolean;
}

export function ProjectileSection({
  projectiles,
  selectedId,
  onSelect,
  bc,
  weight,
  dragModel,
  projectileType,
  length,
  diameter,
  onChange,
  advanced,
}: Props) {
  const { t } = useI18n();

  return (
    <Section icon={Crosshair} title={t('calc.sectionProjectile')}>
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
        <UnitField
          label={t('calc.projectileWeight')}
          category="weight"
          value={weight}
          step={0.5}
          onChange={v => onChange({ projectileWeight: v })}
        />
        <Field
          label={t('calc.bc')}
          value={bc}
          step={0.001}
          onChange={v => onChange({ bc: v })}
          hint={dragModel}
        />
      </div>

      {advanced && (
        <>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                {t('calc.dragModel')}
              </label>
              <select
                value={dragModel}
                onChange={e => onChange({ dragModel: e.target.value as DragModel })}
                className="w-full bg-muted/40 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="G1">G1 — {t('calc.dragG1Hint')}</option>
                <option value="G7">G7 — {t('calc.dragG7Hint')}</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                {t('calc.projectileType')}
              </label>
              <select
                value={projectileType}
                onChange={e => onChange({ projectileType: e.target.value as ProjectileType })}
                className="w-full bg-muted/40 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="pellet">{t('calc.typePellet')}</option>
                <option value="slug">{t('calc.typeSlug')}</option>
                <option value="other">{t('calc.typeOther')}</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <UnitField
              label={t('calc.projectileLength')}
              category="length"
              value={length ?? 0}
              step={0.1}
              onChange={v => onChange({ projectileLength: v })}
            />
            <UnitField
              label={t('calc.projectileDiameter')}
              category="length"
              value={diameter ?? 0}
              step={0.05}
              onChange={v => onChange({ projectileDiameter: v })}
            />
          </div>
          <p className="flex items-start gap-1.5 text-[10px] text-muted-foreground/80">
            <HelpCircle className="h-3 w-3 mt-px shrink-0" />
            {t('calc.projectileAdvancedHint')}
          </p>
        </>
      )}
    </Section>
  );
}
