import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Crosshair, RotateCcw, Save, Sparkles, Settings2, Zap, ArrowLeftRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SessionPickerDialog } from '@/components/compare/SessionPickerDialog';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';
import { calculateTrajectory } from '@/lib/ballistics';
import {
  Airgun,
  BallisticInput,
  BallisticResult,
  DragModel,
  DragTablePoint,
  Optic,
  OpticFocalPlane,
  Projectile,
  ProjectileType,
  Tune,
  WeatherSnapshot,
} from '@/lib/types';
import {
  airgunStore,
  opticStore,
  projectileStore,
  sessionStore,
  tuneStore,
  getSettings,
  saveSettings,
} from '@/lib/storage';
import { Switch } from '@/components/ui/switch';
import { ProjectileSection } from '@/components/calc/ProjectileSection';
import { VelocitySection } from '@/components/calc/VelocitySection';
import { WeaponSection } from '@/components/calc/WeaponSection';
import { OpticSection } from '@/components/calc/OpticSection';
import { EnvironmentSection } from '@/components/calc/EnvironmentSection';
import { DistanceSection } from '@/components/calc/DistanceSection';
import { ZeroingSection } from '@/components/calc/ZeroingSection';
import { ResultsCard } from '@/components/calc/ResultsCard';

interface FormState {
  // Projectile
  projectileId: string;
  bc: number;
  projectileWeight: number;
  dragModel: DragModel;
  projectileType: ProjectileType;
  projectileLength?: number;
  projectileDiameter?: number;
  customDragTable?: DragTablePoint[];
  // Velocity
  muzzleVelocity: number;
  // Weapon
  airgunId: string;
  tuneId: string;
  barrelLength?: number;
  twistRate?: number;
  // Optic
  opticId: string;
  focalPlane: OpticFocalPlane;
  sightHeight: number;
  zeroRange: number;
  clickValue: number;
  clickUnit: 'MOA' | 'MRAD';
  currentMag?: number;
  magCalibration?: number;
  // Distance
  targetDistance: number;
  useRange: boolean;
  minRange: number;
  maxRange: number;
  rangeStep: number;
  // Weather
  weather: WeatherSnapshot;
  // Zeroing weather
  useZeroWeather: boolean;
  zeroWeather: WeatherSnapshot;
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
    dragModel: 'G1',
    projectileType: 'pellet',
    projectileLength: 7.5,
    projectileDiameter: 5.5,
    muzzleVelocity: 280,
    airgunId: '',
    tuneId: '',
    barrelLength: 600,
    twistRate: 16,
    opticId: '',
    focalPlane: 'FFP',
    sightHeight: 40,
    zeroRange: 30,
    clickValue: 0.1,
    clickUnit: 'MRAD',
    currentMag: undefined,
    magCalibration: undefined,
    targetDistance: 50,
    useRange: false,
    minRange: 10,
    maxRange: 100,
    rangeStep: 10,
    weather: defaultWeather(),
    useZeroWeather: false,
    zeroWeather: defaultWeather(),
  };
}

export default function QuickCalc() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const settings = getSettings();
  const [searchParams, setSearchParams] = useSearchParams();
  const [advanced, setAdvanced] = useState(settings.advancedMode);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [results, setResults] = useState<BallisticResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionName, setSessionName] = useState('');
  /** Id of the session currently mirrored in the form — set after a save or
   *  after rehydration from ?session=. Drives the "Compare with another" CTA. */
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [comparePickerOpen, setComparePickerOpen] = useState(false);
  // Live mirror of the configured energy threshold so the header chip refreshes
  // when the user changes it in Settings (cross-tab via 'storage' event, or
  // intra-tab via window focus / re-mount).
  const [energyThresholdJ, setEnergyThresholdJ] = useState<number | null>(() => {
    const s = getSettings();
    return s.energyThresholdJ === undefined ? 16.27 : s.energyThresholdJ;
  });
  useEffect(() => {
    const refresh = () => {
      const s = getSettings();
      setEnergyThresholdJ(s.energyThresholdJ === undefined ? 16.27 : s.energyThresholdJ);
    };
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  const projectiles = useMemo<Projectile[]>(() => projectileStore.getAll(), []);
  const airguns = useMemo<Airgun[]>(() => airgunStore.getAll(), []);
  const optics = useMemo<Optic[]>(() => opticStore.getAll(), []);
  const tunes = useMemo<Tune[]>(() => tuneStore.getAll(), []);

  useEffect(() => {
    saveSettings({ ...getSettings(), advancedMode: advanced });
  }, [advanced]);

  // Rehydrate from ?session=<id> with safe defaults for legacy sessions.
  useEffect(() => {
    const sid = searchParams.get('session');
    if (!sid) return;
    const session = sessionStore.getById(sid);
    if (!session) {
      toast.error(t('common.noData'));
      setSearchParams(prev => { const p = new URLSearchParams(prev); p.delete('session'); return p; });
      return;
    }
    const i = session.input;
    const baseWeather = i.weather ?? defaultWeather();
    const proj = session.projectileId ? projectiles.find(p => p.id === session.projectileId) : undefined;
    const hydrated: FormState = {
      ...defaultForm(),
      projectileId: session.projectileId ?? '',
      bc: i.bc,
      projectileWeight: i.projectileWeight,
      dragModel: i.dragModel ?? proj?.bcModel ?? 'G1',
      projectileType: proj?.projectileType ?? 'pellet',
      projectileLength: i.projectileLength ?? proj?.length,
      projectileDiameter: i.projectileDiameter ?? proj?.diameter,
      muzzleVelocity: i.muzzleVelocity,
      airgunId: session.airgunId ?? '',
      customDragTable: i.customDragTable ?? proj?.customDragTable,
      tuneId: session.tuneId ?? '',
      twistRate: i.twistRate,
      opticId: session.opticId ?? '',
      focalPlane: i.focalPlane ?? 'FFP',
      sightHeight: i.sightHeight,
      zeroRange: i.zeroRange,
      clickValue: i.clickValue ?? 0.1,
      clickUnit: i.clickUnit ?? 'MRAD',
      currentMag: i.currentMag,
      magCalibration: i.magCalibration,
      targetDistance: Math.min(i.maxRange, 50) || 50,
      useRange: i.maxRange > (i.rangeStep ?? 10),
      minRange: 10,
      maxRange: i.maxRange,
      rangeStep: i.rangeStep,
      weather: baseWeather,
      useZeroWeather: !!i.zeroWeather,
      zeroWeather: i.zeroWeather ?? defaultWeather(),
    };
    setForm(hydrated);
    setResults(session.results ?? null);
    setSessionName(session.name);
    setCurrentSessionId(session.id);
    if (i.dragModel === 'G7' || i.zeroWeather || i.focalPlane === 'SFP' || i.twistRate) setAdvanced(true);
    toast.success(t('sessions.loaded'), { description: session.name });
    setSearchParams(prev => { const p = new URLSearchParams(prev); p.delete('session'); return p; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prefill from ?airgun=&projectile=&optic= when navigating from a detail page.
  // Skipped if a session is being rehydrated (handled above).
  useEffect(() => {
    if (searchParams.get('session')) return;
    const airgunId = searchParams.get('airgun');
    const projectileId = searchParams.get('projectile');
    const opticId = searchParams.get('optic');
    if (!airgunId && !projectileId && !opticId) return;

    let advancedHint = false;
    setForm(prev => {
      let next = { ...prev };
      if (projectileId) {
        const p = projectiles.find(x => x.id === projectileId);
        if (p) {
          next = {
            ...next,
            projectileId,
            bc: p.bc,
            projectileWeight: p.weight,
            projectileLength: p.length ?? next.projectileLength,
            projectileDiameter: p.diameter ?? next.projectileDiameter,
            dragModel: p.bcModel ?? next.dragModel,
            projectileType: p.projectileType ?? next.projectileType,
            customDragTable: p.customDragTable,
          };
          if (p.bcModel === 'G7' || p.customDragTable) advancedHint = true;
        }
      }
      if (airgunId) {
        const a = airguns.find(x => x.id === airgunId);
        if (a) {
          next = {
            ...next,
            airgunId,
            barrelLength: a.barrelLength ?? next.barrelLength,
            twistRate: a.twistRate ?? next.twistRate,
            sightHeight: a.defaultSightHeight ?? next.sightHeight,
            zeroRange: a.defaultZeroRange ?? next.zeroRange,
          };
          if (a.twistRate) advancedHint = true;
        }
      }
      if (opticId) {
        const o = optics.find(x => x.id === opticId);
        if (o) {
          next = {
            ...next,
            opticId,
            sightHeight: o.mountHeight ?? next.sightHeight,
            clickValue: o.clickValue,
            clickUnit: o.clickUnit === 'mil' ? 'MRAD' : o.clickUnit,
            focalPlane: o.focalPlane ?? next.focalPlane,
            magCalibration: o.magCalibration ?? next.magCalibration,
            currentMag: o.magCalibration ?? next.currentMag,
          };
          if (o.focalPlane === 'SFP') advancedHint = true;
        }
      }
      return next;
    });
    if (advancedHint) setAdvanced(true);
    toast.success(t('detail.useInCalc'));
    setSearchParams(prev => {
      const p = new URLSearchParams(prev);
      p.delete('airgun');
      p.delete('projectile');
      p.delete('optic');
      return p;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (patch: Partial<FormState>) => {
    // Any manual edit makes the form diverge from the saved session — drop the
    // currentSessionId link so the "Compare with another" CTA doesn't compare
    // a stale snapshot.
    setCurrentSessionId(null);
    setForm(prev => ({ ...prev, ...patch }));
  };

  // Manual edits to weather track per-field overrides so the source can shift
  // from "auto" → "mixed" → "manual" without losing the auto base data.
  const FIELD_KEYS = ['temperature','humidity','pressure','altitude','windSpeed','windAngle'] as const;
  const updateWeather = (patch: Partial<WeatherSnapshot>) => {
    setCurrentSessionId(null);
    setForm(prev => {
      const overrides = new Set(prev.weather.manualOverrides ?? []);
      for (const k of FIELD_KEYS) {
        if (patch[k] !== undefined && patch[k] !== prev.weather[k]) overrides.add(k);
      }
      const next: WeatherSnapshot = {
        ...prev.weather,
        ...patch,
        manualOverrides: Array.from(overrides),
        timestamp: new Date().toISOString(),
      };
      const total = FIELD_KEYS.length;
      next.source = !prev.weather.provider
        ? 'manual'
        : overrides.size === 0
          ? 'auto'
          : overrides.size >= total
            ? 'manual'
            : 'mixed';
      return { ...prev, weather: next };
    });
  };

  const updateZeroWeather = (patch: Partial<WeatherSnapshot>) => {
    setCurrentSessionId(null);
    setForm(prev => ({ ...prev, zeroWeather: { ...prev.zeroWeather, ...patch } }));
  };

  const handleSelectProjectile = (id: string) => {
    const p = projectiles.find(x => x.id === id);
    if (!p) return update({ projectileId: '', customDragTable: undefined });
    update({
      projectileId: id,
      bc: p.bc,
      projectileWeight: p.weight,
      projectileLength: p.length ?? form.projectileLength,
      projectileDiameter: p.diameter ?? form.projectileDiameter,
      dragModel: p.bcModel ?? form.dragModel,
      projectileType: p.projectileType ?? form.projectileType,
      customDragTable: p.customDragTable,
    });
  };

  const handleSelectAirgun = (id: string) => {
    const a = airguns.find(x => x.id === id);
    // Clearing or switching airgun invalidates the linked tune.
    if (!a) return update({ airgunId: '', tuneId: '' });
    update({
      airgunId: id,
      tuneId: '',
      barrelLength: a.barrelLength ?? form.barrelLength,
      twistRate: a.twistRate ?? form.twistRate,
      sightHeight: a.defaultSightHeight ?? form.sightHeight,
      zeroRange: a.defaultZeroRange ?? form.zeroRange,
    });
  };

  const handleSelectTune = (id: string) => {
    const tn = tunes.find(x => x.id === id);
    if (!tn) return update({ tuneId: '' });
    // Auto-fill muzzle velocity from the tune's nominal value when present.
    update({
      tuneId: id,
      muzzleVelocity: tn.nominalVelocity ?? form.muzzleVelocity,
    });
  };

  const handleSelectOptic = (id: string) => {
    const o = optics.find(x => x.id === id);
    if (!o) return update({ opticId: '' });
    update({
      opticId: id,
      sightHeight: o.mountHeight ?? form.sightHeight,
      clickValue: o.clickValue,
      clickUnit: o.clickUnit === 'mil' ? 'MRAD' : o.clickUnit,
      focalPlane: o.focalPlane ?? form.focalPlane,
      magCalibration: o.magCalibration ?? form.magCalibration,
      currentMag: o.magCalibration ?? form.currentMag,
    });
  };

  const validate = (): string | null => {
    if (form.muzzleVelocity <= 0)
      return t('calc.muzzleVelocity') + ' — ' + t('calc.invalidValue');
    if (form.bc <= 0) return 'BC — ' + t('calc.invalidValue');
    if (form.projectileWeight <= 0)
      return t('calc.projectileWeight') + ' — ' + t('calc.invalidValue');
    if (form.zeroRange <= 0)
      return t('calc.zeroRange') + ' — ' + t('calc.invalidValue');
    if (form.targetDistance <= 0)
      return t('calc.targetDistance') + ' — ' + t('calc.invalidValue');
    return null;
  };

  const buildInput = (): BallisticInput => {
    const maxRange = form.useRange
      ? Math.max(form.maxRange, form.targetDistance)
      : form.targetDistance;
    const rangeStep = form.useRange
      ? form.rangeStep
      : Math.max(5, form.targetDistance);
    return {
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
      dragModel: form.dragModel,
      focalPlane: form.focalPlane,
      currentMag: form.currentMag,
      magCalibration: form.magCalibration,
      twistRate: form.twistRate,
      projectileLength: form.projectileLength,
      projectileDiameter: form.projectileDiameter,
      zeroWeather: form.useZeroWeather ? form.zeroWeather : undefined,
      customDragTable: form.customDragTable,
    };
  };

  const handleCalculate = () => {
    const err = validate();
    if (err) {
      setError(err);
      toast.error(t('calc.errorTitle'), { description: err });
      return;
    }
    setError(null);
    setResults(calculateTrajectory(buildInput()));
  };

  const handleReset = () => {
    setForm(defaultForm());
    setResults(null);
    setError(null);
    setSessionName('');
    setCurrentSessionId(null);
  };

  const handleSave = () => {
    if (!results) return;
    const name = sessionName.trim() || `Session ${new Date().toLocaleString()}`;
    const created = sessionStore.create({
      name,
      airgunId: form.airgunId || undefined,
      tuneId: form.tuneId || undefined,
      projectileId: form.projectileId || undefined,
      opticId: form.opticId || undefined,
      input: buildInput(),
      results,
      tags: [],
      favorite: false,
    });
    setCurrentSessionId(created.id);
    toast.success(t('calc.sessionSaved'), { description: name });
    setSessionName('');
  };

  const heroResult = useMemo(() => {
    if (!results) return null;
    return (
      results.find(r => r.range === form.targetDistance) ??
      results.reduce<BallisticResult | null>(
        (best, r) =>
          best == null ||
          Math.abs(r.range - form.targetDistance) <
            Math.abs(best.range - form.targetDistance)
            ? r
            : best,
        null,
      )
    );
  }, [results, form.targetDistance]);

  const tableRows = useMemo(() => {
    if (!results || !form.useRange) return undefined;
    return results.filter(
      r => r.range >= (advanced ? form.minRange : 0) && r.range > 0,
    );
  }, [results, form.useRange, form.minRange, advanced]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-5 pb-8"
    >
      <header className="space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Crosshair className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-heading font-bold">{t('calc.title')}</h1>
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              {t('calc.subtitle')}
            </p>
          </div>

          {/* Energy threshold reminder — links to Settings */}
          <Link
            to="/settings"
            title={t('calc.energyThresholdHint')}
            aria-label={t('calc.energyThresholdHint')}
            className={
              energyThresholdJ === null
                ? 'shrink-0 inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2 py-1 text-[11px] font-mono text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors'
                : 'shrink-0 inline-flex items-center gap-1.5 rounded-md border border-warning/30 bg-warning/10 px-2 py-1 text-[11px] font-mono text-warning hover:bg-warning/20 transition-colors'
            }
          >
            <Zap className="h-3.5 w-3.5 shrink-0" />
            <span>
              {energyThresholdJ === null
                ? t('calc.energyThresholdOff')
                : t('calc.energyThresholdBadge', { j: energyThresholdJ.toFixed(2) })}
            </span>
          </Link>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card/40 px-3 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-semibold">
                {advanced ? t('calc.advancedMode') : t('calc.simpleMode')}
              </div>
              <div className="text-[10px] text-muted-foreground truncate">
                {t('calc.modeHint')}
              </div>
            </div>
          </div>
          <Switch checked={advanced} onCheckedChange={setAdvanced} />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ProjectileSection
          projectiles={projectiles}
          selectedId={form.projectileId}
          onSelect={handleSelectProjectile}
          bc={form.bc}
          weight={form.projectileWeight}
          dragModel={form.dragModel}
          projectileType={form.projectileType}
          length={form.projectileLength}
          diameter={form.projectileDiameter}
          onChange={update}
          advanced={advanced}
        />
        <VelocitySection
          velocity={form.muzzleVelocity}
          onChange={v => update({ muzzleVelocity: v })}
        />
        <WeaponSection
          airguns={airguns}
          selectedAirgun={form.airgunId}
          onSelectAirgun={handleSelectAirgun}
          tunes={tunes}
          selectedTune={form.tuneId}
          onSelectTune={handleSelectTune}
          barrelLength={form.barrelLength}
          twistRate={form.twistRate}
          onChange={update}
          advanced={advanced}
        />
        <OpticSection
          optics={optics}
          selectedOptic={form.opticId}
          onSelectOptic={handleSelectOptic}
          focalPlane={form.focalPlane}
          clickValue={form.clickValue}
          clickUnit={form.clickUnit}
          currentMag={form.currentMag}
          magCalibration={form.magCalibration}
          onChange={update}
          advanced={advanced}
        />
        <ZeroingSection
          zeroRange={form.zeroRange}
          sightHeight={form.sightHeight}
          useZeroWeather={form.useZeroWeather}
          zeroWeather={form.zeroWeather}
          onChange={update}
          onZeroWeatherChange={updateZeroWeather}
          onZeroWeatherReplace={next => update({ zeroWeather: next })}
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
            onPatchManual={updateWeather}
            onReplace={next => update({ weather: next })}
            advanced={advanced}
          />
        </div>
      </div>

      {advanced && (
        <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 px-3 py-2 flex items-center gap-2 text-[11px] text-muted-foreground">
          <Settings2 className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>{t('calc.sectionAdvanced')} — {t('calc.modeHint')}</span>
        </div>
      )}

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

      {results && heroResult ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <ResultsCard
            result={heroResult}
            rows={tableRows}
            clickUnit={form.clickUnit}
            focalPlane={form.focalPlane}
            currentMag={form.currentMag}
            magCalibration={form.magCalibration}
            advanced={advanced}
            weather={form.weather}
            zeroWeather={form.useZeroWeather ? form.zeroWeather : undefined}
            energyThresholdJ={energyThresholdJ}
          />

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
