import { useState } from 'react';
import { Crosshair, HelpCircle, ChevronRight, Layers, Database } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Section } from './Section';
import { Field } from './Field';
import { UnitField } from './UnitField';
import { ProjectilePicker, pickerHasBcZones, pickerIsImported } from './ProjectilePicker';
import { Projectile, DragModel, ProjectileType } from '@/lib/types';
import { cn } from '@/lib/utils';

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
  const [pickerOpen, setPickerOpen] = useState(false);

  const selected = projectiles.find(p => p.id === selectedId);
  const isEmpty = projectiles.length === 0;

  return (
    <Section icon={Crosshair} title={t('calc.sectionProjectile')}>
      {/* Tranche L — picker trigger replacing the basic combobox. */}
      <div className="space-y-1">
        <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          {t('calc.selectProjectile')}
        </label>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          disabled={isEmpty}
          aria-label={t('projectilePicker.open')}
          aria-haspopup="dialog"
          data-testid="projectile-picker-trigger"
          className={cn(
            'w-full flex items-center justify-between gap-2 bg-muted/40 border border-border rounded-md px-3 py-2 text-sm text-left focus:outline-none focus:ring-1 focus:ring-primary hover:bg-muted/60 transition-colors',
            isEmpty && 'opacity-60 cursor-not-allowed',
          )}
        >
          <span className="min-w-0 flex-1 truncate">
            {selected ? (
              <span className="flex items-baseline gap-1.5 flex-wrap">
                <span className="font-medium">{selected.brand} {selected.model}</span>
                <span className="text-[11px] text-muted-foreground font-mono truncate">
                  {selected.caliberLabel || selected.caliber} · {selected.weight}gr · BC {selected.bc?.toFixed(3) ?? '—'}
                </span>
                {pickerHasBcZones(selected) && (
                  <span
                    className="inline-flex items-center gap-0.5 px-1 rounded text-[9px] bg-primary/10 text-primary border border-primary/20"
                    title={t('projectiles.list.bcZonesBadgeTitle')}
                  >
                    <Layers className="h-2 w-2" aria-hidden />
                    {t('projectilePicker.bcZones')}
                  </span>
                )}
                {pickerIsImported(selected) && (
                  <span
                    className="inline-flex items-center gap-0.5 px-1 rounded text-[9px] bg-muted/60 text-muted-foreground border border-border"
                    title={t('projectiles.list.importedBadgeTitle', { source: selected.importedFrom ?? '' })}
                  >
                    <Database className="h-2 w-2" aria-hidden />
                  </span>
                )}
              </span>
            ) : isEmpty ? (
              <span className="text-muted-foreground italic">{t('calc.noProjectiles')}</span>
            ) : (
              <span className="text-muted-foreground">— {t('calc.manualEntry')} —</span>
            )}
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
        </button>
      </div>

      <ProjectilePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        projectiles={projectiles}
        selectedId={selectedId}
        onSelect={onSelect}
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
                <option value="GA">GA — {t('calc.dragGAHint')}</option>
                <option value="GS">GS — {t('calc.dragGSHint')}</option>
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
