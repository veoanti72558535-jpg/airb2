import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { History, Star, Trash2, Search, Crosshair, Play, Filter, X, ArrowLeftRight, CheckSquare, RotateCcw, Target, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';
import { calculateTrajectory } from '@/lib/ballistics';
import { getSettings } from '@/lib/storage';
import {
  sessionStore,
  airgunStore,
  projectileStore,
  opticStore,
} from '@/lib/storage';
import { Session } from '@/lib/types';
import { motion } from 'framer-motion';
import { EntitySelect } from '@/components/calc/EntitySelect';
import { Checkbox } from '@/components/ui/checkbox';
import { SessionPickerDialog } from '@/components/compare/SessionPickerDialog';
import { EngineBadge } from '@/components/sessions/EngineBadge';
import { CalculationMetadataBlock } from '@/components/sessions/CalculationMetadataBlock';
import { RecalculateDialog } from '@/components/sessions/RecalculateDialog';
import { SessionLineage } from '@/components/sessions/SessionLineage';
import { SessionSummarizer } from '@/components/sessions/SessionSummarizer';
import { normalizeSession } from '@/lib/session-normalize';
import { BallisticTable } from '@/components/calc/BallisticTable';
import { ZeroIntersectionsCard } from '@/components/calc/ZeroIntersectionsCard';
import { TrajectoryMiniChart } from '@/components/calc/TrajectoryMiniChart';
import { PbrCard } from '@/components/calc/PbrCard';
import { AdvancedTrajectoryChart } from '@/components/calc/AdvancedTrajectoryChart';
import { computeZeroIntersections } from '@/lib/zero-intersections';
import { computePointBlankRange } from '@/lib/pbr';
import { usePbrPrefs } from '@/hooks/use-pbr-prefs';
import { ReticleAssistPanel } from '@/components/calc/ReticleAssistPanel';
import {
  buildDistanceList,
  defaultConfig,
  type BallisticTableConfig,
} from '@/lib/ballistic-table';
import { FieldValidation } from '@/components/sessions/FieldValidation';
import { TruingPanel } from '@/components/sessions/TruingPanel';
import { TargetPhotoAnalyzer } from '@/components/sessions/TargetPhotoAnalyzer';
import { CalibrationHistoryBlock } from '@/components/sessions/CalibrationHistoryBlock';
import { SessionReportButton } from '@/components/ai/agents/SessionReportButton';
import { TrainingLogSummarizerButton } from '@/components/ai/agents/TrainingLogSummarizerButton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function SessionsPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const settings = getSettings();
  const truingEnabled = settings.featureFlags.truing !== false;
  const isAdvanced = settings.advancedMode;
  const [sessions, setSessions] = useState<Session[]>(sessionStore.getAll());
  const [filter, setFilter] = useState<'all' | 'favorites'>('all');
  const [query, setQuery] = useState('');
  const [airgunId, setAirgunId] = useState('');
  const [projectileId, setProjectileId] = useState('');
  const [opticId, setOpticId] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // ── Compare flow state ────────────────────────────────────────────────
  // Selection mode: user toggles checkboxes on cards, then "Compare (2)".
  // Per-card picker: quick "Compare with…" CTA opens SessionPickerDialog.
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pickerSource, setPickerSource] = useState<Session | null>(null);
  // Tranche C — recalc target. Opening this dialog never recalculates; only
  // confirmation does, and it always creates a NEW linked session.
  const [recalcSource, setRecalcSource] = useState<Session | null>(null);
  const [truingSource, setTruingSource] = useState<Session | null>(null);
  const [targetSource, setTargetSource] = useState<Session | null>(null);

  const airguns = useMemo(() => airgunStore.getAll(), []);
  const projectiles = useMemo(() => projectileStore.getAll(), []);
  const optics = useMemo(() => opticStore.getAll(), []);

  const refresh = () => setSessions(sessionStore.getAll());

  const toggleFav = (id: string) => {
    const s = sessions.find(s => s.id === id);
    if (s) { sessionStore.update(id, { favorite: !s.favorite }); refresh(); }
  };

  const handleDelete = (id: string) => {
    sessionStore.delete(id);
    setSelectedIds(ids => ids.filter(x => x !== id));
    refresh();
  };

  const activeFilterCount =
    (airgunId ? 1 : 0) + (projectileId ? 1 : 0) + (opticId ? 1 : 0);

  const clearEntityFilters = () => {
    setAirgunId('');
    setProjectileId('');
    setOpticId('');
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 2) {
        toast.info(t('compare.selectExactlyTwo'));
        return prev;
      }
      return [...prev, id];
    });
  };

  const enterSelectionMode = () => {
    setSelectionMode(true);
    setSelectedIds([]);
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds([]);
  };

  const launchCompareFromSelection = () => {
    if (selectedIds.length !== 2) return;
    const [a, b] = selectedIds;
    navigate(`/compare?a=${a}&b=${b}`);
  };

  const launchCompareWithPicker = (other: Session) => {
    if (!pickerSource) return;
    navigate(`/compare?a=${pickerSource.id}&b=${other.id}`);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sessions
      .filter(s => filter === 'favorites' ? s.favorite : true)
      .filter(s => !airgunId || s.airgunId === airgunId)
      .filter(s => !projectileId || s.projectileId === projectileId)
      .filter(s => !opticId || s.opticId === opticId)
      .filter(s => !q || `${s.name} ${s.notes ?? ''} ${s.tags.join(' ')}`.toLowerCase().includes(q))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [sessions, filter, query, airgunId, projectileId, opticId]);

  const canCompareAtAll = sessions.length >= 2;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-heading font-bold">{t('sessions.title')}</h1>
        </div>
        <div className="flex gap-1 items-center">
          {!selectionMode ? (
            <button
              onClick={enterSelectionMode}
              disabled={!canCompareAtAll}
              title={!canCompareAtAll ? t('compare.selectExactlyTwo') : t('compare.selectionMode')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border border-border text-muted-foreground hover:bg-muted/40 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CheckSquare className="h-3.5 w-3.5" />
              {t('compare.selectionMode')}
            </button>
          ) : (
            <>
              <button
                onClick={launchCompareFromSelection}
                disabled={selectedIds.length !== 2}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
                {t('compare.compareSelection', { count: selectedIds.length })}
              </button>
              <button
                onClick={exitSelectionMode}
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/40"
              >
                <X className="h-3 w-3" />
                {t('compare.exitSelection')}
              </button>
            </>
          )}
          <button onClick={() => setFilter('all')} className={`px-3 py-1 rounded-md text-xs font-medium ${filter === 'all' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>{t('common.all')}</button>
          <button onClick={() => setFilter('favorites')} className={`px-3 py-1 rounded-md text-xs font-medium ${filter === 'favorites' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>★</button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t('sessions.searchPlaceholder')}
          className="w-full bg-muted border border-border rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Entity filter toggle */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setShowFilters(v => !v)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
            showFilters || activeFilterCount > 0
              ? 'border-primary/30 text-primary bg-primary/5'
              : 'border-border text-muted-foreground hover:bg-muted/40'
          }`}
        >
          <Filter className="h-3.5 w-3.5" />
          {t('sessions.filterByEntity')}
          {activeFilterCount > 0 && (
            <span className="ml-1 px-1.5 py-0 rounded bg-primary/15 text-primary text-[10px] font-semibold">
              {activeFilterCount}
            </span>
          )}
        </button>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={clearEntityFilters}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/40"
          >
            <X className="h-3 w-3" />
            {t('common.clear')}
          </button>
        )}
      </div>

      {showFilters && (
        <div className="surface-card p-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <EntitySelect
            label={t('sessions.filterAirgun')}
            value={airgunId}
            onChange={setAirgunId}
            options={airguns.map(a => ({
              id: a.id,
              label: `${a.brand} ${a.model}`,
              sub: a.caliber,
            }))}
            placeholder={t('common.all')}
            emptyText={t('calc.noAirguns')}
            addHref="/library"
          />
          <EntitySelect
            label={t('sessions.filterProjectile')}
            value={projectileId}
            onChange={setProjectileId}
            options={projectiles.map(p => ({
              id: p.id,
              label: `${p.brand} ${p.model}`,
              sub: `${p.weight}gr · BC ${p.bc}`,
            }))}
            placeholder={t('common.all')}
            emptyText={t('calc.noProjectiles')}
            addHref="/library/projectiles"
          />
          <EntitySelect
            label={t('sessions.filterOptic')}
            value={opticId}
            onChange={setOpticId}
            options={optics.map(o => ({
              id: o.id,
              label: o.name,
              sub: o.type,
            }))}
            placeholder={t('common.all')}
            emptyText={t('calc.noOptics')}
            addHref="/library/optics"
          />
        </div>
      )}

      {/* Selection-mode hint banner */}
      {selectionMode && (
        <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-[11px] text-primary font-mono">
          {t('compare.selectExactlyTwo')}
        </div>
      )}

      {/* CTA */}
      {filtered.length === 0 && sessions.length === 0 && (
        <Link to="/calc" className="surface-elevated p-4 flex items-center gap-3 hover:border-primary/30 transition-colors block text-center">
          <Crosshair className="h-5 w-5 text-primary mx-auto" />
          <span className="text-sm font-medium text-primary">{t('sessions.createFromCalc')}</span>
        </Link>
      )}

      {filtered.length === 0 ? (
        <div className="surface-card p-8 text-center text-muted-foreground text-sm">{t('sessions.noSessions')}</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(raw => {
            const s = normalizeSession(raw);
            const advBadges: string[] = [];
            if (s.input.dragModel && s.input.dragModel !== 'G1') advBadges.push(s.input.dragModel);
            if (s.input.focalPlane) advBadges.push(s.input.focalPlane);
            if (s.input.zeroWeather) advBadges.push(t('sessions.badgeZeroWeather'));
            if (s.input.twistRate) advBadges.push(`1:${s.input.twistRate}″`);
            if (s.tuneId) advBadges.push(t('calc.selectTune'));
            const wsrc = s.input.weather?.source;
            if (wsrc === 'auto') advBadges.push(t('sessions.badgeAuto'));
            else if (wsrc === 'mixed') advBadges.push(t('sessions.badgeMixed'));
            const isSelected = selectedIds.includes(s.id);
            return (
              <div
                key={s.id}
                className={`surface-elevated p-4 transition-colors ${
                  selectionMode && isSelected ? 'ring-1 ring-primary border-primary/50' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  {selectionMode && (
                    <div className="pt-1">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelection(s.id)}
                        aria-label={`Select ${s.name}`}
                      />
                    </div>
                  )}
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => selectionMode && toggleSelection(s.id)}
                  >
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-sm truncate">{s.name}</span>
                      <EngineBadge session={s} size="xs" />
                     {s.calibrationHistory && s.calibrationHistory.length > 0 && (
                       <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/15 text-primary">
                         <Target className="h-2.5 w-2.5" />
                         {t('truing.calibrated')} ({s.calibrationHistory.length})
                       </span>
                     )}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono mt-1">
                      {s.input.muzzleVelocity} m/s • BC {s.input.bc} • {s.input.projectileWeight} gr • Zero {s.input.zeroRange}m
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {new Date(s.createdAt).toLocaleString()}
                    </div>
                    <div className="mt-1">
                      <SessionSummarizer session={s} />
                    </div>
                    {(s.tags.length > 0 || advBadges.length > 0) && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {advBadges.map(b => <span key={b} className="tactical-badge">{b}</span>)}
                        {s.tags.map(tag => <span key={tag} className="tactical-badge">{tag}</span>)}
                      </div>
                    )}
                  </div>
                  {!selectionMode && (
                    <div className="flex gap-1 shrink-0">
                      <Link
                        to={`/calc?session=${s.id}`}
                        title={t('sessions.openInCalc')}
                        className="p-1.5 rounded hover:bg-primary/10 text-primary"
                      >
                        <Play className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => setPickerSource(s)}
                        disabled={sessions.length < 2}
                        title={t('compare.compareWith')}
                        className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      >
                        <ArrowLeftRight className="h-4 w-4" />
                      </button>
                      <button onClick={() => toggleFav(s.id)} className={`p-1.5 rounded ${s.favorite ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}>
                        <Star className="h-4 w-4" fill={s.favorite ? 'currentColor' : 'none'} />
                      </button>
                      <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                {/* Tranche C — Filiation badge (parent + linked copies count). */}
                {!selectionMode && <SessionLineage session={s} allSessions={sessions} />}
                {/* Quick summary */}
                {s.results.length > 0 && (
                  <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                    {s.results.filter(r => r.range > 0).slice(0, 4).map(r => (
                      <div key={r.range} className="bg-muted rounded p-2">
                        <div className="text-[10px] text-muted-foreground">{r.range}m</div>
                        <div className="text-xs font-mono font-semibold">{r.drop.toFixed(1)}<span className="text-muted-foreground">mm</span></div>
                      </div>
                    ))}
                  </div>
                )}
                {/* Calculation metadata — collapsed by default to keep mobile tidy.
                    Tranche C — explicit recalc action lives in the same advanced strip
                    so it stays secondary and never invites accidental clicks. */}
                {!selectionMode && (
                  <div className="mt-3 space-y-2">
                    <CalculationMetadataBlock session={s} />
                    {/* Field validation — terrain measurements vs predictions */}
                    <FieldValidation session={s} />
                    {/* Calibration history */}
                    <CalibrationHistoryBlock history={s.calibrationHistory ?? []} />
                    {/* Tranche H + J — Table balistique configurable +
                        assistant réticule synchronisé sur la même grille.
                        Lit les résultats figés, aucun recalcul moteur. */}
                    {s.results && s.results.length > 1 && (
                      <SessionAdvancedReadouts session={s} />
                    )}
                    <button
                      type="button"
                      onClick={() => setRecalcSource(s)}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md border border-dashed border-border text-[11px] text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-colors"
                    >
                      <RotateCcw className="h-3 w-3" />
                      {t('recalculate.action')}
                    </button>
                    {truingEnabled && <button
                      type="button"
                      onClick={() => setTruingSource(s)}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md border border-dashed border-border text-[11px] text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-colors"
                    >
                      <Target className="h-3 w-3" />
                      {t('truing.button')}
                    </button>}
                    <button
                      type="button"
                      onClick={() => setTargetSource(s)}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md border border-dashed border-border text-[11px] text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-colors"
                    >
                      <Camera className="h-3 w-3" />
                      {t('target.analyzeCard' as any)}
                    </button>
                    <div className="pt-1">
                      <SessionReportButton session={s} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Per-card "Compare with…" picker */}
      <SessionPickerDialog
        open={pickerSource !== null}
        onOpenChange={(open) => { if (!open) setPickerSource(null); }}
        source={pickerSource}
        sessions={sessions}
        onPick={launchCompareWithPicker}
      />

      {/* Tranche C — Recalculate dialog. Opening = free; only confirm runs the
          engine and creates a brand-new linked session. The original is never
          mutated. */}
      {/* Truing dialog */}
      <Dialog open={truingSource !== null} onOpenChange={(open) => { if (!open) setTruingSource(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('truing.title')}</DialogTitle>
          </DialogHeader>
          {truingSource && (
            <TruingPanel
              session={truingSource}
              allowNewProjectile={isAdvanced}
              onBcCorrected={(correctedBc, projectileId, calibrationEntry) => {
                if (!truingSource) return;
                const updatedInput = { ...truingSource.input, bc: correctedBc };
                let newResults = truingSource.results;
                try {
                  newResults = calculateTrajectory(updatedInput);
                } catch (e) {
                  console.warn('[truing] recalc failed, keeping old results', e);
                }
                const prevHistory = truingSource.calibrationHistory ?? [];
                sessionStore.update(truingSource.id, {
                  input: updatedInput,
                  results: newResults,
                  ...(calibrationEntry
                    ? { calibrationHistory: [...prevHistory, calibrationEntry] }
                    : {}),
                });
                refresh();
                setTruingSource(null);
                toast.success(
                  projectileId ? t('truing.created') : t('truing.applySession'),
                );
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <RecalculateDialog
        open={recalcSource !== null}
        onOpenChange={(open) => { if (!open) setRecalcSource(null); }}
        source={recalcSource}
        onCreated={(created) => {
          refresh();
          toast.success(t('recalculate.toastSuccess'), { description: created.name });
        }}
      />

      {/* Target photo analyzer dialog */}
      <Dialog open={targetSource !== null} onOpenChange={(open) => { if (!open) setTargetSource(null); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('target.title' as any)}</DialogTitle>
          </DialogHeader>
          {targetSource && (
            <TargetPhotoAnalyzer
              sessionId={targetSource.id}
              distanceM={targetSource.input.zeroRange}
            />
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

/**
 * Tranche J — Bloc avancé d'une session : table balistique + assistant
 * réticule, partageant la même `BallisticTableConfig` locale. Aucun recalcul
 * moteur, aucune persistance — la config vit le temps de la vue.
 */
function SessionAdvancedReadouts({ session }: { session: Session }) {
  const [tableConfig, setTableConfig] = useState<BallisticTableConfig>(() =>
    defaultConfig(session.input.maxRange),
  );
  const optic = useMemo(
    () => (session.opticId ? opticStore.getById(session.opticId) ?? null : null),
    [session.opticId],
  );
  const distances = useMemo(
    () => buildDistanceList(tableConfig).filter(d => d > 0),
    [tableConfig],
  );
  // Tranche P — Near / Far Zero mémoïsés, partagés entre la carte dédiée et
  // les marqueurs de ligne dans la BallisticTable.
  const zeroIntersections = useMemo(
    () => computeZeroIntersections(session.results),
    [session.results],
  );
  // Tranche R — Overlay PBR pour le mini-graphe (préférence utilisateur partagée).
  const { vitalZoneM } = usePbrPrefs();
  const pbrOverlay = useMemo(
    () => computePointBlankRange(session.results, vitalZoneM),
    [session.results, vitalZoneM],
  );
  return (
    <>
      {/* Tranche O — Near / Far Zero, dérivés des résultats stockés. */}
      {session.results && session.results.length > 1 && (
        <ZeroIntersectionsCard data={zeroIntersections} />
      )}
      {/* Tranche P — Mini-graphique trajectoire avec marqueurs NZ/FZ.
          Tranche R — overlay bande PBR (zone vitale persistée). */}
      {session.results && session.results.length > 1 && (
        <TrajectoryMiniChart
          rows={session.results}
          nearZeroDistance={zeroIntersections.nearZeroDistance}
          farZeroDistance={zeroIntersections.farZeroDistance}
          pbr={{
            vitalZoneM,
            startDistance: pbrOverlay.startDistance,
            endDistance: pbrOverlay.endDistance,
            apexDistance: pbrOverlay.maxOrdinateDistance,
            apexMm: pbrOverlay.maxOrdinateMm,
            limitedByComputedRange: pbrOverlay.limitedByComputedRange,
          }}
        />
      )}
      {/* Tranche P — Point Blank Range, dérivé des résultats stockés. */}
      {session.results && session.results.length > 1 && (
        <PbrCard rows={session.results} />
      )}
      {/* Advanced multi-curve chart — drop, windage, energy */}
      {session.results && session.results.length > 1 && (
        <AdvancedTrajectoryChart
          results={session.results}
          zeroRange={session.input.zeroRange}
          pbr={{
            vitalZoneM: vitalZoneM,
            startDistance: pbrOverlay.startDistance,
            endDistance: pbrOverlay.endDistance,
          }}
        />
      )}
      <BallisticTable
        rows={session.results}
        clickUnit={session.input.clickUnit ?? 'MRAD'}
        maxRangeHint={session.input.maxRange}
        initialConfig={tableConfig}
        onConfigChange={setTableConfig}
        nearZeroDistance={zeroIntersections.nearZeroDistance}
        farZeroDistance={zeroIntersections.farZeroDistance}
      />
      <ReticleAssistPanel
        optic={optic}
        results={session.results}
        distances={distances}
      />
    </>
  );
}
