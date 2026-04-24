import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowLeftRight,
  Camera,
  Check,
  Crosshair,
  History,
  Loader2,
  Pencil,
  Play,
  RotateCcw,
  Star,
  Tag,
  Target,
  Trash2,
  TriangleAlert,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/i18n';
import { calculateTrajectory } from '@/lib/ballistics';
import {
  airgunStore,
  getSettings,
  opticStore,
  projectileStore,
  sessionStore,
} from '@/lib/storage';
import { normalizeSession } from '@/lib/session-normalize';
import type { Session } from '@/lib/types';
import {
  buildComparisonRows,
  defaultRange,
  diffSessions,
  resolveSession,
} from '@/lib/compare';
import { computePointBlankRange } from '@/lib/pbr';
import { computeZeroIntersections } from '@/lib/zero-intersections';
import { usePbrPrefs } from '@/hooks/use-pbr-prefs';
import {
  buildDistanceList,
  defaultConfig,
  type BallisticTableConfig,
} from '@/lib/ballistic-table';
import { EngineBadge } from '@/components/sessions/EngineBadge';
import { CalculationMetadataBlock } from '@/components/sessions/CalculationMetadataBlock';
import { CalibrationHistoryBlock } from '@/components/sessions/CalibrationHistoryBlock';
import { FieldValidation } from '@/components/sessions/FieldValidation';
import { SessionLineage } from '@/components/sessions/SessionLineage';
import { SessionSummarizer } from '@/components/sessions/SessionSummarizer';
import { TruingPanel } from '@/components/sessions/TruingPanel';
import { TargetPhotoAnalyzer } from '@/components/sessions/TargetPhotoAnalyzer';
import { TargetAnalysesHistory } from '@/components/sessions/TargetAnalysesHistory';
import { RecalculateDialog } from '@/components/sessions/RecalculateDialog';
import { SessionPickerDialog } from '@/components/compare/SessionPickerDialog';
import { SessionReportButton } from '@/components/ai/agents/SessionReportButton';
import { BallisticTable } from '@/components/calc/BallisticTable';
import { TrajectoryMiniChart } from '@/components/calc/TrajectoryMiniChart';
import { AdvancedTrajectoryChart } from '@/components/calc/AdvancedTrajectoryChart';
import { PbrCard } from '@/components/calc/PbrCard';
import { ZeroIntersectionsCard } from '@/components/calc/ZeroIntersectionsCard';
import { ReticleAssistPanel } from '@/components/calc/ReticleAssistPanel';

/**
 * Détail SESSION — route dédiée /sessions/:id.
 *
 * Cette page COMPOSE les widgets existants (BallisticTable, mini-chart,
 * AdvancedTrajectoryChart, PbrCard, ZeroIntersectionsCard, ReticleAssistPanel,
 * EngineBadge, CalculationMetadataBlock, etc.) — aucun moteur balistique n'est
 * réinvoqué hors flux explicites (recalculate, truing) déjà existants.
 *
 * Édition inline : nom, notes, tags. Persistance via sessionStore.update,
 * jamais de mutation des `results` ni de `input` ici.
 *
 * Comparaison : CTA vers /compare?a=&b= ET mini-bloc inline (delta KPIs)
 * sur 3 distances clés.
 */
export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const settings = getSettings();
  const truingEnabled = settings.featureFlags.truing !== false;
  const isAdvanced = settings.advancedMode;

  const [raw, setRaw] = useState<Session | null>(() =>
    id ? sessionStore.getById(id) ?? null : null,
  );
  const session = useMemo(() => (raw ? normalizeSession(raw) : null), [raw]);

  // Édition inline locale
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftNotes, setDraftNotes] = useState('');
  const [draftTags, setDraftTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Dialogues secondaires
  const [pickerOpen, setPickerOpen] = useState(false);
  const [recalcOpen, setRecalcOpen] = useState(false);
  const [truingOpen, setTruingOpen] = useState(false);
  const [targetOpen, setTargetOpen] = useState(false);
  const [inlineCompareId, setInlineCompareId] = useState<string | null>(null);

  const allSessions = useMemo(() => sessionStore.getAll(), [raw]);
  const otherSessions = useMemo(
    () => allSessions.filter(s => s.id !== id),
    [allSessions, id],
  );

  useEffect(() => {
    if (!session) return;
    setDraftName(session.name);
    setDraftNotes(session.notes ?? '');
    setDraftTags(session.tags ?? []);
  }, [session?.id]);

  if (!id) {
    return null;
  }

  if (!session) {
    return (
      <div className="space-y-3">
        <Link
          to="/sessions"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t('detail.back')}
        </Link>
        <div className="surface-card p-8 text-center text-sm text-muted-foreground">
          {t('sessions.noSessions')}
        </div>
      </div>
    );
  }

  const refresh = () => {
    const fresh = sessionStore.getById(session.id);
    setRaw(fresh ?? null);
  };

  const toggleFav = () => {
    sessionStore.update(session.id, { favorite: !session.favorite });
    refresh();
  };

  const handleDelete = () => {
    if (!confirm(t('sessions.delete') + ' ?')) return;
    sessionStore.delete(session.id);
    navigate('/sessions');
  };

  const startEdit = () => {
    setDraftName(session.name);
    setDraftNotes(session.notes ?? '');
    setDraftTags(session.tags ?? []);
    setSaveStatus('idle');
    setEditing(true);
  };

  const cancelEdit = () => {
    if (saveStatus === 'saving') return;
    setEditing(false);
    setTagInput('');
    setSaveStatus('idle');
  };

  const commitTag = () => {
    const v = tagInput.trim();
    if (!v) return;
    if (!draftTags.includes(v)) setDraftTags(prev => [...prev, v]);
    setTagInput('');
  };

  const removeTag = (tag: string) =>
    setDraftTags(prev => prev.filter(t => t !== tag));

  const saveEdit = async () => {
    if (saveStatus === 'saving') return;
    setSaveStatus('saving');
    const name = draftName.trim() || session.name;
    try {
      // Yield to the event loop so the "saving" state is visible even though
      // sessionStore.update is synchronous. This also leaves room to plug an
      // async backend later without touching the UX.
      await Promise.resolve();
      sessionStore.update(session.id, {
        name,
        notes: draftNotes.trim() || undefined,
        tags: draftTags,
      });
      refresh();
      setSaveStatus('saved');
      setTagInput('');
      toast.success(t('sessionDetail.saved'));
      // Auto-close edit mode after a short confirmation window.
      window.setTimeout(() => {
        setEditing(false);
        setSaveStatus('idle');
      }, 900);
    } catch (e) {
      console.error('[session-detail] save failed', e);
      setSaveStatus('error');
      toast.error(t('sessionDetail.saveError'));
    }
  };

  const launchCompare = (other: Session) => {
    navigate(`/compare?a=${session.id}&b=${other.id}`);
  };

  const inlineOther = inlineCompareId
    ? allSessions.find(s => s.id === inlineCompareId) ?? null
    : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4 pb-8"
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <Link
        to="/sessions"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t('detail.back')}
      </Link>

      <header className="surface-elevated p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 shrink-0">
            <History className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            {editing ? (
              <Input
                value={draftName}
                onChange={e => setDraftName(e.target.value)}
                disabled={saveStatus === 'saving'}
                className="h-8 text-base font-semibold"
              />
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-heading font-bold leading-tight truncate">
                  {session.name}
                </h1>
                {session.favorite && (
                  <Star className="h-4 w-4 text-primary fill-primary shrink-0" />
                )}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground font-mono mt-1">
              {new Date(session.createdAt).toLocaleString(locale)}
            </p>
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <EngineBadge session={session} size="xs" />
              {session.calibrationHistory && session.calibrationHistory.length > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/15 text-primary">
                  <Target className="h-2.5 w-2.5" />
                  {t('truing.calibrated')} ({session.calibrationHistory.length})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions principales */}
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => navigate(`/calc?session=${session.id}`)}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Crosshair className="h-4 w-4" />
            {t('sessions.openInCalc')}
          </button>
          <button
            onClick={() => setPickerOpen(true)}
            disabled={otherSessions.length === 0}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-muted text-foreground text-sm font-medium hover:bg-muted/70 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ArrowLeftRight className="h-4 w-4" />
            {t('compare.compareWith')}
          </button>
        </div>

        {/* Actions secondaires */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={toggleFav}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
              session.favorite
                ? 'border-primary/30 text-primary bg-primary/5'
                : 'border-border text-muted-foreground hover:bg-muted/40'
            }`}
          >
            <Star className="h-3 w-3" fill={session.favorite ? 'currentColor' : 'none'} />
            {session.favorite ? t('sessions.favorite') : t('sessions.favorite')}
          </button>
          {!editing ? (
            <button
              onClick={startEdit}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40"
            >
              <Pencil className="h-3 w-3" />
              {t('common.edit')}
            </button>
          ) : (
            <>
              <button
                onClick={saveEdit}
                disabled={saveStatus === 'saving'}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saveStatus === 'saving' ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {t('sessionDetail.saving')}
                  </>
                ) : saveStatus === 'saved' ? (
                  <>
                    <Check className="h-3 w-3" />
                    {t('sessionDetail.savedInline')}
                  </>
                ) : (
                  t('sessionDetail.save')
                )}
              </button>
              <button
                onClick={cancelEdit}
                disabled={saveStatus === 'saving'}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium border border-border text-muted-foreground hover:bg-muted/40 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {t('common.cancel')}
              </button>
              {saveStatus === 'error' && (
                <span
                  role="status"
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-destructive bg-destructive/10 border border-destructive/30"
                >
                  <TriangleAlert className="h-3 w-3" />
                  {t('sessionDetail.saveError')}
                </span>
              )}
            </>
          )}
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium border border-destructive/30 text-destructive hover:bg-destructive/10 ml-auto"
          >
            <Trash2 className="h-3 w-3" />
            {t('sessions.delete')}
          </button>
        </div>

        {/* Tags & notes (inline edit) */}
        <div className="space-y-2 pt-2 border-t border-border/40">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1 mb-1">
              <Tag className="h-3 w-3" />
              {t('sessions.tags')}
            </div>
            <div className="flex flex-wrap gap-1">
              {(editing ? draftTags : session.tags).length === 0 && !editing && (
                <span className="text-[11px] italic text-muted-foreground">
                  {t('sessionDetail.noTags')}
                </span>
              )}
              {(editing ? draftTags : session.tags).map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 tactical-badge"
                >
                  {tag}
                  {editing && (
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="hover:text-destructive"
                      aria-label={`remove ${tag}`}
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  )}
                </span>
              ))}
              {editing && (
                <div className="inline-flex items-center gap-1">
                  <Input
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        commitTag();
                      }
                    }}
                    disabled={saveStatus === 'saving'}
                    placeholder={t('sessionDetail.addTagPlaceholder')}
                    className="h-7 text-xs w-32"
                  />
                  <button
                    type="button"
                    onClick={commitTag}
                    disabled={saveStatus === 'saving'}
                    className="px-2 py-1 rounded text-[11px] border border-border text-muted-foreground hover:bg-muted/40 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
              {t('sessionDetail.notes')}
            </div>
            {editing ? (
              <textarea
                value={draftNotes}
                onChange={e => setDraftNotes(e.target.value)}
                rows={3}
                disabled={saveStatus === 'saving'}
                className="w-full bg-muted border border-border rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder={t('sessionDetail.notesPlaceholder')}
              />
            ) : session.notes ? (
              <p className="text-xs text-foreground/90 whitespace-pre-wrap">
                {session.notes}
              </p>
            ) : (
              <p className="text-[11px] italic text-muted-foreground">
                {t('sessionDetail.noNotes')}
              </p>
            )}
          </div>
        </div>

        {/* Filiation */}
        <SessionLineage session={session} allSessions={allSessions} />
      </header>

      {/* ── KPIs résumé ────────────────────────────────────────────────── */}
      <SessionKpis session={session} />

      {/* ── Onglets : Trajectoire / Tableau / Réticule / Métadonnées ── */}
      <Tabs defaultValue="trajectory" className="w-full">
        <TabsList className="grid grid-cols-4 w-full h-auto">
          <TabsTrigger value="trajectory" className="text-xs">
            {t('sessionDetail.tabTrajectory')}
          </TabsTrigger>
          <TabsTrigger value="table" className="text-xs">
            {t('sessionDetail.tabTable')}
          </TabsTrigger>
          <TabsTrigger value="reticle" className="text-xs">
            {t('sessionDetail.tabReticle')}
          </TabsTrigger>
          <TabsTrigger value="meta" className="text-xs">
            {t('sessionDetail.tabMeta')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trajectory" className="space-y-3 mt-3">
          <SessionTrajectoryTab session={session} />
        </TabsContent>

        <TabsContent value="table" className="space-y-3 mt-3">
          <SessionTableTab session={session} />
        </TabsContent>

        <TabsContent value="reticle" className="space-y-3 mt-3">
          <SessionReticleTab session={session} />
        </TabsContent>

        <TabsContent value="meta" className="space-y-3 mt-3">
          <CalculationMetadataBlock session={session} defaultOpen />
          <FieldValidation session={session} />
          <CalibrationHistoryBlock history={session.calibrationHistory ?? []} />
          <TargetAnalysesHistory sessionId={session.id} />
          <div className="surface-card p-3 space-y-2">
            <SessionSummarizer session={session} />
            <SessionReportButton session={session} />
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Mini-comparaison inline ───────────────────────────────────── */}
      <section className="surface-card p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1.5">
            <ArrowLeftRight className="h-3.5 w-3.5" />
            {t('sessionDetail.quickCompare')}
          </h2>
          {inlineOther && (
            <button
              type="button"
              onClick={() => navigate(`/compare?a=${session.id}&b=${inlineOther.id}`)}
              className="text-[11px] text-primary hover:underline"
            >
              {t('sessionDetail.openFullCompare')} →
            </button>
          )}
        </div>
        {otherSessions.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            {t('compare.noOther')}
          </p>
        ) : (
          <>
            <select
              value={inlineCompareId ?? ''}
              onChange={e => setInlineCompareId(e.target.value || null)}
              className="w-full bg-muted border border-border rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">{t('sessionDetail.pickToCompare')}</option>
              {otherSessions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {inlineOther && <InlineCompareBlock a={session} b={inlineOther} />}
          </>
        )}
      </section>

      {/* ── Actions avancées ──────────────────────────────────────────── */}
      <section className="surface-card p-3 space-y-2">
        <button
          type="button"
          onClick={() => setRecalcOpen(true)}
          className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md border border-dashed border-border text-[11px] text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-colors"
        >
          <RotateCcw className="h-3 w-3" />
          {t('recalculate.action')}
        </button>
        {truingEnabled && (
          <button
            type="button"
            onClick={() => setTruingOpen(true)}
            className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md border border-dashed border-border text-[11px] text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-colors"
          >
            <Target className="h-3 w-3" />
            {t('truing.button')}
          </button>
        )}
        <button
          type="button"
          onClick={() => setTargetOpen(true)}
          className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md border border-dashed border-border text-[11px] text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-colors"
        >
          <Camera className="h-3 w-3" />
          {t('target.analyzeCard' as never)}
        </button>
      </section>

      {/* ── Dialogues ─────────────────────────────────────────────────── */}
      <SessionPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        source={session}
        sessions={allSessions}
        onPick={launchCompare}
      />

      <RecalculateDialog
        open={recalcOpen}
        onOpenChange={setRecalcOpen}
        source={recalcOpen ? session : null}
        onCreated={created => {
          toast.success(t('recalculate.toastSuccess'), { description: created.name });
          navigate(`/sessions/${created.id}`);
        }}
      />

      <Dialog open={truingOpen} onOpenChange={setTruingOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('truing.title')}</DialogTitle>
          </DialogHeader>
          {truingOpen && (
            <TruingPanel
              session={session}
              allowNewProjectile={isAdvanced}
              onBcCorrected={(correctedBc, projectileId, calibrationEntry) => {
                const updatedInput = { ...session.input, bc: correctedBc };
                let newResults = session.results;
                try {
                  newResults = calculateTrajectory(updatedInput);
                } catch (e) {
                  console.warn('[truing] recalc failed, keeping old results', e);
                }
                const prevHistory = session.calibrationHistory ?? [];
                sessionStore.update(session.id, {
                  input: updatedInput,
                  results: newResults,
                  ...(calibrationEntry
                    ? { calibrationHistory: [...prevHistory, calibrationEntry] }
                    : {}),
                });
                refresh();
                setTruingOpen(false);
                toast.success(
                  projectileId ? t('truing.created') : t('truing.applySession'),
                );
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={targetOpen} onOpenChange={setTargetOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('target.title' as never)}</DialogTitle>
          </DialogHeader>
          {targetOpen && (
            <TargetPhotoAnalyzer
              sessionId={session.id}
              distanceM={session.input.zeroRange}
            />
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

/** KPIs résumé : V0, BC, zéro, distance max, énergie au zéro. */
function SessionKpis({ session }: { session: Session }) {
  const { t } = useI18n();
  const zeroRow = session.results.find(r => r.range === session.input.zeroRange)
    ?? session.results[Math.floor(session.results.length / 2)];
  return (
    <section className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <Kpi label={t('calc.muzzleVelocity')} value={`${session.input.muzzleVelocity}`} unit="m/s" />
      <Kpi label="BC" value={`${session.input.bc}`} />
      <Kpi label={t('calc.zeroRange')} value={`${session.input.zeroRange}`} unit="m" />
      <Kpi
        label={t('calc.energy')}
        value={zeroRow ? zeroRow.energy.toFixed(1) : '—'}
        unit={zeroRow ? 'J' : ''}
      />
    </section>
  );
}

function Kpi({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="surface-card px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-mono text-base font-semibold">
        {value}
        {unit && <span className="text-xs text-muted-foreground ml-1">{unit}</span>}
      </div>
    </div>
  );
}

/** Onglet trajectoire : mini chart, advanced chart, PBR, zero intersections. */
function SessionTrajectoryTab({ session }: { session: Session }) {
  const { vitalZoneM } = usePbrPrefs();
  const zeroIntersections = useMemo(
    () => computeZeroIntersections(session.results),
    [session.results],
  );
  const pbrOverlay = useMemo(
    () => computePointBlankRange(session.results, vitalZoneM),
    [session.results, vitalZoneM],
  );

  if (!session.results || session.results.length < 2) {
    return (
      <div className="surface-card p-6 text-center text-xs text-muted-foreground">
        —
      </div>
    );
  }

  return (
    <>
      <ZeroIntersectionsCard data={zeroIntersections} />
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
      <PbrCard rows={session.results} />
      <AdvancedTrajectoryChart
        results={session.results}
        zeroRange={session.input.zeroRange}
        pbr={{
          vitalZoneM,
          startDistance: pbrOverlay.startDistance,
          endDistance: pbrOverlay.endDistance,
        }}
      />
    </>
  );
}

/** Onglet tableau balistique configurable. */
function SessionTableTab({ session }: { session: Session }) {
  const [tableConfig, setTableConfig] = useState<BallisticTableConfig>(() =>
    defaultConfig(session.input.maxRange),
  );
  const zeroIntersections = useMemo(
    () => computeZeroIntersections(session.results),
    [session.results],
  );
  if (!session.results || session.results.length < 2) {
    return (
      <div className="surface-card p-6 text-center text-xs text-muted-foreground">
        —
      </div>
    );
  }
  return (
    <BallisticTable
      rows={session.results}
      clickUnit={session.input.clickUnit ?? 'MRAD'}
      maxRangeHint={session.input.maxRange}
      initialConfig={tableConfig}
      onConfigChange={setTableConfig}
      nearZeroDistance={zeroIntersections.nearZeroDistance}
      farZeroDistance={zeroIntersections.farZeroDistance}
    />
  );
}

/** Onglet réticule. */
function SessionReticleTab({ session }: { session: Session }) {
  const { t } = useI18n();
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
  if (!optic) {
    return (
      <div className="surface-card p-6 text-center text-xs text-muted-foreground">
        {t('sessionDetail.noOptic')}
      </div>
    );
  }
  return (
    <ReticleAssistPanel
      optic={optic}
      results={session.results}
      distances={distances}
    />
  );
}

/** Bloc compact : 3 distances (zéro, médian, max) avec deltas A vs B. */
function InlineCompareBlock({ a, b }: { a: Session; b: Session }) {
  const { t } = useI18n();
  const range = useMemo(() => defaultRange(a, b), [a, b]);
  const rows = useMemo(
    () => buildComparisonRows(a, b, range),
    [a, b, range],
  );
  // Sélection : zéro, milieu, fin
  const picks = useMemo(() => {
    if (rows.length === 0) return [];
    const zeroR = a.input.zeroRange;
    const last = rows[rows.length - 1];
    const mid = rows[Math.floor(rows.length / 2)];
    const zero = rows.find(r => r.range === zeroR) ?? rows[0];
    return [zero, mid, last].filter(
      (r, i, arr) => arr.findIndex(x => x.range === r.range) === i,
    );
  }, [rows, a.input.zeroRange]);

  const diffs = diffSessions(a, b).filter(d => !d.same).slice(0, 4);

  return (
    <div className="space-y-3">
      {/* Deltas KPIs */}
      <div className="grid grid-cols-3 gap-2">
        {picks.map(row => {
          const dropDelta =
            row.a && row.b ? row.b.drop - row.a.drop : null;
          const velDelta =
            row.a && row.b ? row.b.velocity - row.a.velocity : null;
          return (
            <div key={row.range} className="surface-elevated px-2.5 py-2">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {row.range} m
              </div>
              <div className="mt-1 text-[11px] font-mono space-y-0.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-muted-foreground">Δ drop</span>
                  <span className={dropDelta != null && Math.abs(dropDelta) > 0.5 ? 'text-primary font-semibold' : ''}>
                    {dropDelta != null
                      ? `${dropDelta > 0 ? '+' : ''}${dropDelta.toFixed(1)} mm`
                      : '—'}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-muted-foreground">Δ V</span>
                  <span>
                    {velDelta != null
                      ? `${velDelta > 0 ? '+' : ''}${velDelta.toFixed(1)} m/s`
                      : '—'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Différences config */}
      {diffs.length > 0 && (
        <div className="border-t border-border/40 pt-2">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
            {t('compare.differences')}
          </div>
          <ul className="space-y-0.5">
            {diffs.map(d => (
              <li
                key={d.labelKey}
                className="text-[11px] flex items-baseline justify-between gap-2"
              >
                <span className="text-muted-foreground truncate">
                  {t(d.labelKey as never)}
                </span>
                <span className="font-mono text-right">
                  {d.a ?? '—'} → {d.b ?? '—'}
                  {d.unit && <span className="text-muted-foreground"> {d.unit}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}