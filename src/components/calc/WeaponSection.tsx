import { Target } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Section } from './Section';
import { UnitField } from './UnitField';
import { EntitySelect } from './EntitySelect';
import { Airgun, Tune } from '@/lib/types';

const TWIST_OPTIONS = [12, 14, 16, 18, 20, 22, 24, 28, 32];

interface Props {
  airguns: Airgun[];
  selectedAirgun: string;
  onSelectAirgun: (id: string) => void;
  /** All tunes — filtered to the selected airgun internally. */
  tunes: Tune[];
  selectedTune: string;
  onSelectTune: (id: string) => void;
  barrelLength?: number;
  twistRate?: number;
  onChange: (patch: { barrelLength?: number; twistRate?: number }) => void;
  advanced?: boolean;
}

export function WeaponSection({
  airguns,
  selectedAirgun,
  onSelectAirgun,
  tunes,
  selectedTune,
  onSelectTune,
  barrelLength,
  twistRate,
  onChange,
  advanced,
}: Props) {
  const { t } = useI18n();

  // Tunes are airgun-scoped: only offer tunes belonging to the picked airgun.
  const airgunTunes = selectedAirgun
    ? tunes.filter(tn => tn.airgunId === selectedAirgun)
    : [];

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

      {selectedAirgun && (
        <EntitySelect
          label={t('calc.selectTune')}
          value={selectedTune}
          onChange={onSelectTune}
          options={airgunTunes.map(tn => ({
            id: tn.id,
            label: tn.name,
            sub: tn.nominalVelocity ? `${tn.nominalVelocity} m/s` : tn.usage,
          }))}
          placeholder={t('calc.noTune')}
          emptyText={t('calc.noTunesForAirgun')}
          addHref="/tunes"
        />
      )}

      {advanced && (
        <div className="grid grid-cols-2 gap-2.5">
          <UnitField
            label={t('calc.barrelLength')}
            category="length"
            value={barrelLength ?? 0}
            step={5}
            onChange={v => onChange({ barrelLength: v })}
          />
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              {t('calc.twistRate')}
            </label>
            <select
              value={twistRate ?? ''}
              onChange={e =>
                onChange({ twistRate: e.target.value ? Number(e.target.value) : undefined })
              }
              className="w-full bg-muted/40 border border-border rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">— {t('calc.twistRateNone')} —</option>
              {TWIST_OPTIONS.map(n => (
                <option key={n} value={n}>1:{n}″</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </Section>
  );
}

