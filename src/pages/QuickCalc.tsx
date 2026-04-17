import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Crosshair, RotateCcw, Save, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';
import { calculateTrajectory } from '@/lib/ballistics';
import {
  Airgun,
  BallisticInput,
  BallisticResult,
  Optic,
  Projectile,
  WeatherSnapshot,
} from '@/lib/types';
import {
  airgunStore,
  opticStore,
  projectileStore,
  sessionStore,
  getSettings,
  saveSettings,
} from '@/lib/storage';
import { Switch } from '@/components/ui/switch';
import { ProjectileSection } from '@/components/calc/ProjectileSection';
import { VelocitySection } from '@/components/calc/VelocitySection';
import { WeaponSection } from '@/components/calc/WeaponSection';
import { EnvironmentSection } from '@/components/calc/EnvironmentSection';
import { DistanceSection } from '@/components/calc/DistanceSection';
import { ResultsCard } from '@/components/calc/ResultsCard';

interface FormState {
  // Projectile
  projectileId: string;
  bc: number;
  projectileWeight: number;
  // Velocity
  muzzleVelocity: number;
  // Weapon / Optic
  airgunId: string;
  opticId: string;
  sightHeight: number;
  zeroRange: number;
  clickValue: number;
  clickUnit: 'MOA' | 'MRAD';
  currentMag?: number;
  // Distance
  targetDistance: number;
  useRange: boolean;
  minRange: number;
  maxRange: number;
  rangeStep: number;
  // Weather
  weather: WeatherSnapshot;
}

function defaultWeather(): WeatherSnapshot {
  return {
    temperature: 15,
    humidity: 50,
    pressure: 1013.25,
    altitude: 0,
    windSpeed: 0,
    windAngle: 90,
    source: 'manual',
    timestamp: new Date().toISOString(),
  };
}

function defaultForm(): FormState {
  return {
    projectileId: '',
    bc: 0.025,
    projectileWeight: 18,
    muzzleVelocity: 280,
    airgunId: '',
    opticId: '',
    sightHeight: 40,
    zeroRange: 30,
    clickValue: 0.25,
    clickUnit: 'MOA',
    targetDistance: 50,
    useRange: false,
    minRange: 10,
    maxRange: 100,
    rangeStep: 10,
    weather: defaultWeather(),
  };
}

export default function QuickCalc() {
  const { t } = useI18n();
  const settings = getSettings();
  const [advanced, setAdvanced] = useState(settings.advancedMode);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [results, setResults] = useState<BallisticResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionName, setSessionName] = useState('');

  const projectiles = useMemo<Projectile[]>(() => projectileStore.getAll(), []);
  const airguns = useMemo<Airgun[]>(() => airgunStore.getAll(), []);
  const optics = useMemo<Optic[]>(() => opticStore.getAll(), []);

  // Persist mode preference
  useEffect(() => {
    saveSettings({ ...getSettings(), advancedMode: advanced });
  }, [advanced]);

  const update = (patch: Partial<FormState>) => {
    setForm(prev => ({ ...prev, ...patch }));
  };

  const updateWeather = (patch: Partial<WeatherSnapshot>) => {
    setForm(prev => ({ ...prev, weather: { ...prev.weather, ...patch } }));
  };

  const handleSelectProjectile = (id: string) => {
    const p = projectiles.find(x => x.id === id);
    if (!p) {
      update({ projectileId: '' });
      return;
    }
    update({ projectileId: id, bc: p.bc, projectileWeight: p.weight });
  };

  const handleSelectAirgun = (id: string) => {
    const a = airguns.find(x => x.id === id);
    if (!a) {
      update({ airgunId: '' });
      return;
    }
    update({
      airgunId: id,
      sightHeight: a.defaultSightHeight ?? form.sightHeight,
      zeroRange: a.defaultZeroRange ?? form.zeroRange,
    });
  };

  const handleSelectOptic = (id: string) => {
    const o = optics.find(x => x.id === id);
    if (!o) {
      update({ opticId: '' });
      return;
    }
    update({
      opticId: id,
      sightHeight: o.mountHeight ?? form.sightHeight,
      clickValue: o.clickValue,
      clickUnit: o.clickUnit === 'mil' ? 'MRAD' : o.clickUnit,
    });
  };

  const validate = (): string | null => {
    if (form.muzzleVelocity <= 0) return t('calc.muzzleVelocity') + ' — ' + t('calc.invalidValue');
    if (form.bc <= 0) return 'BC — ' + t('calc.invalidValue');
    if (form.projectileWeight <= 0) return t('calc.projectileWeight') + ' — ' + t('calc.invalidValue');
    if (form.zeroRange <= 0) return t('calc.zeroRange') + ' — ' + t('calc.invalidValue');
    if (form.targetDistance <= 0) return t('calc.targetDistance') + ' — ' + t('calc.invalidValue');
    return null;
  };

  const handleCalculate = () => {
    const err = validate();
    if (err) {
      setError(err);
      toast.error(t('calc.errorTitle'), { description: err });
      return;
    }
    setError(null);

    const maxRange = form.useRange
      ? Math.max(form.maxRange, form.targetDistance)
      : form.targetDistance;
    const rangeStep = form.useRange ? form.rangeStep : Math.max(5, form.targetDistance);

    const input: BallisticInput = {
      muzzleVelocity: form.muzzleVelocity,
      bc: form.bc,
      projectileWeight: form.projectileWeight,
      sightHeight: form.sightHeight,
      zeroRange: form.zeroRange,
      maxRange,
      rangeStep,
      weather: form.weather,
      clickValue: form.clickValue,
      clickUnit: form.clickUnit,
    };

    const r = calculateTrajectory(input);
    setResults(r);
  };

  const handleReset = () => {
    setForm(defaultForm());
    setResults(null);
    setError(null);
    setSessionName('');
  };

  const handleSave = () => {
    if (!results) return;
    const name = sessionName.trim() || `Session ${new Date().toLocaleString()}`;
    const input: BallisticInput = {
      muzzleVelocity: form.muzzleVelocity,
      bc: form.bc,
      projectileWeight: form.projectileWeight,
      sightHeight: form.sightHeight,
      zeroRange: form.zeroRange,
      maxRange: form.useRange ? form.maxRange : form.targetDistance,
      rangeStep: form.useRange ? form.rangeStep : form.targetDistance,
      weather: form.weather,
      clickValue: form.clickValue,
      clickUnit: form.clickUnit,
    };
    sessionStore.create({
      name,
      airgunId: form.airgunId || undefined,
      projectileId: form.projectileId || undefined,
      opticId: form.opticId || undefined,
      input,
      results,
      tags: [],
      favorite: false,
    });
    toast.success(t('calc.sessionSaved'), { description: name });
    setSessionName('');
  };

  // Find row at target distance for hero card
  const heroResult = useMemo(() => {
    if (!results) return null;
    return (
      results.find(r => r.range === form.targetDistance) ??
      results.reduce<BallisticResult | null>(
        (best, r) =>
          best == null || Math.abs(r.range - form.targetDistance) < Math.abs(best.range - form.targetDistance)
            ? r
            : best,
        null,
      )
    );
  }, [results, form.targetDistance]);

  const tableRows = useMemo(() => {
    if (!results || !form.useRange) return undefined;
    return results.filter(r => r.range >= (advanced ? form.minRange : 0) && r.range > 0);
  }, [results, form.useRange, form.minRange, advanced]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 pb-8">
      {/* Header */}
      <header className="space-y-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Crosshair className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-heading font-bold">{t('calc.title')}</h1>
          </div>
          <p className="text-xs text-muted-foreground font-mono">{t('calc.subtitle')}</p>
        </div>

        {/* Mode toggle */}
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card/40 px-3 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-semibold">
                {advanced ? t('calc.advancedMode') : t('calc.simpleMode')}
              </div>
              <div className="text-[10px] text-muted-foreground truncate">{t('calc.modeHint')}</div>
            </div>
          </div>
          <Switch checked={advanced} onCheckedChange={setAdvanced} />
        </div>
      </header>

      {/* Form sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ProjectileSection
          projectiles={projectiles}
          selectedId={form.projectileId}
          onSelect={handleSelectProjectile}
          bc={form.bc}
          weight={form.projectileWeight}
          onChange={update}
        />
        <VelocitySection
          velocity={form.muzzleVelocity}
          onChange={v => update({ muzzleVelocity: v })}
        />
        <WeaponSection
          airguns={airguns}
          optics={optics}
          selectedAirgun={form.airgunId}
          selectedOptic={form.opticId}
          onSelectAirgun={handleSelectAirgun}
          onSelectOptic={handleSelectOptic}
          sightHeight={form.sightHeight}
          zeroRange={form.zeroRange}
          clickValue={form.clickValue}
          clickUnit={form.clickUnit}
          onChange={update}
          advanced={advanced}
        />
        <DistanceSection
          targetDistance={form.targetDistance}
          useRange={form.useRange}
          minRange={form.minRange}
          maxRange={form.maxRange}
          rangeStep={form.rangeStep}
          onChange={update}
          advanced={advanced}
        />
        <div className="md:col-span-2">
          <EnvironmentSection
            weather={form.weather}
            onChange={updateWeather}
            advanced={advanced}
          />
        </div>
      </div>

      {/* Action bar */}
      <div className="sticky bottom-0 z-10 -mx-4 px-4 py-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70 border-t border-border md:static md:mx-0 md:px-0 md:py-0 md:bg-transparent md:border-0">
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={handleCalculate}
            className="flex-1 px-5 py-3 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-md"
          >
            <Crosshair className="h-4 w-4" />
            {t('calc.calculate')}
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-3 bg-muted text-foreground rounded-lg font-medium text-sm hover:bg-muted/70 transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            {t('calc.reset')}
          </button>
        </div>
        {error && (
          <p className="mt-2 text-xs text-destructive font-mono">{error}</p>
        )}
      </div>

      {/* Results */}
      {results && heroResult ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <ResultsCard result={heroResult} rows={tableRows} clickUnit={form.clickUnit} />

          {/* Save session */}
          <div className="rounded-xl border border-border bg-card/60 p-3 space-y-2">
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
              {t('calc.saveSession')}
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder={t('common.name')}
                value={sessionName}
                onChange={e => setSessionName(e.target.value)}
                className="flex-1 bg-muted/40 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-tactical text-tactical-foreground rounded-md text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                <Save className="h-4 w-4" />
                {t('calc.saveSession')}
              </button>
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
          {t('calc.empty')}
        </div>
      )}
    </motion.div>
  );
}
