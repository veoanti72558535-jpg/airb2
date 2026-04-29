/**
 * /admin/ai/simulation — AI simulation mode.
 *
 * Replays the same admin probes as production (guardrails, providers,
 * runbook checklist) against the `ai.*.staging` profile stored in
 * `app_settings`. Each test exposes a per-test dry-run / live toggle so
 * an admin can validate a configuration BEFORE rotating prod.
 *
 * Hard rules:
 *   - Admin-only (uses the same `useIsAdmin` lock as /admin/ai).
 *   - Read-only: never writes to `app_settings`. Edits are still made
 *     via /admin/ai or directly in the table.
 *   - The runbook checklist persists to a SEPARATE storage key so it
 *     never overwrites the production validation state.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Beaker,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Lock,
  LogOut,
  Loader2,
  PlayCircle,
  CheckCircle2,
  XCircle,
  CircleDashed,
  RotateCcw,
  Server,
  ListChecks,
  ArrowLeft,
} from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useI18n } from '@/lib/i18n';
import { isSupabaseConfigured, supabase } from '@/integrations/supabase/client';
import { useIsAdmin } from '@/lib/hooks/useIsAdmin';
import { AiGuardrailsCard } from '@/components/admin/AiGuardrailsCard';
import { RUNBOOK_ITEMS, computeScore, type CheckStatus } from '@/components/admin/RunbookChecklist';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const STAGING_KEYS = [
  'ai.provider_primary.staging',
  'ai.provider_model_primary.staging',
  'ai.quatarly_api_url.staging',
  'ai.allow_google_fallback.staging',
  'ai.google_direct_enabled.staging',
  'ai.google_direct_model.staging',
  'ai.google_direct_max_requests_per_day.staging',
  'ai.max_image_bytes.staging',
  'ai.ollama_enabled.staging',
  'ai.ollama_base_url.staging',
  'ai.ollama_default_model.staging',
] as const;

type StagingProfile = Partial<Record<(typeof STAGING_KEYS)[number], unknown>>;

type TestId = 'guardrails' | 'providers' | 'runbook';
type TestMode = 'dry-run' | 'live';

const RUNBOOK_SIMULATION_STORAGE_KEY = 'airballistik:runbook-validation:simulation';

export default function AdminAiSimulationPage() {
  const { t } = useI18n();
  const configured = isSupabaseConfigured();

  if (!configured || !supabase) {
    return (
      <div className="space-y-4">
        <Header />
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>{t('admin.ai.unavailable')}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return <SimulationInner />;
}

function Header() {
  const { t } = useI18n();
  return (
    <header className="space-y-1">
      <div className="flex items-center gap-2">
        <Beaker className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-heading font-bold">{t('admin.ai.simulation.title')}</h1>
      </div>
      <p className="text-xs text-muted-foreground">{t('admin.ai.simulation.subtitle')}</p>
      <Link
        to="/admin/ai"
        className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        /admin/ai
      </Link>
    </header>
  );
}

function SimulationInner() {
  const { t } = useI18n();
  const sb = supabase!;
  const [session, setSession] = useState<Session | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);
  const admin = useIsAdmin();

  useEffect(() => {
    let alive = true;
    sb.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session ?? null);
      setBootstrapped(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(s ?? null));
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [sb]);

  if (!bootstrapped) {
    return (
      <div className="space-y-4">
        <Header />
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">…</CardContent>
        </Card>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="space-y-4">
        <Header />
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertDescription className="text-xs">{t('admin.ai.notAdmin')}</AlertDescription>
        </Alert>
        <Link to="/admin/ai" className="text-xs underline">/admin/ai</Link>
      </div>
    );
  }

  if (admin.status !== 'admin') {
    const tone = admin.status === 'loading' ? 'checking' : admin.status === 'error' ? 'error' : 'denied';
    return (
      <div className="space-y-4">
        <Header />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              {t('admin.ai.lock.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Alert variant={tone === 'denied' || tone === 'error' ? 'destructive' : 'default'}>
              {tone === 'checking' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Lock className="h-4 w-4" />
              )}
              <AlertDescription className="text-xs">
                {tone === 'checking'
                  ? t('admin.ai.lock.checking')
                  : tone === 'error'
                  ? t('admin.ai.lock.errorDesc')
                  : t('admin.ai.lock.deniedDesc')}
              </AlertDescription>
            </Alert>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <Lock className="h-3 w-3" />
              {t('admin.ai.lock.sourcesHidden')}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => void admin.recheck()}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                {t('admin.ai.lock.recheck')}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => void sb.auth.signOut()}>
                <LogOut className="h-3.5 w-3.5 mr-1.5" />
                {t('admin.ai.signOut')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <SimulationDashboard />;
}

function SimulationDashboard() {
  const { t } = useI18n();
  const sb = supabase!;
  const [profile, setProfile] = useState<StagingProfile>({});
  const [loading, setLoading] = useState(true);
  const [modes, setModes] = useState<Record<TestId, TestMode>>({
    guardrails: 'dry-run',
    providers: 'dry-run',
    runbook: 'dry-run',
  });
  const [lastRun, setLastRun] = useState<Record<TestId, number | null>>({
    guardrails: null,
    providers: null,
    runbook: null,
  });

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await sb
      .from('app_settings')
      .select('key,value')
      .in('key', STAGING_KEYS as unknown as string[]);
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const next: StagingProfile = {};
    for (const row of data ?? []) {
      next[(row as { key: keyof StagingProfile }).key] = (row as { value: unknown }).value;
    }
    setProfile(next);
  }, [sb]);

  useEffect(() => {
    void load();
  }, [load]);

  const setMode = (id: TestId, mode: TestMode) =>
    setModes((prev) => ({ ...prev, [id]: mode }));
  const markRan = (id: TestId) => setLastRun((prev) => ({ ...prev, [id]: Date.now() }));

  const allDryRun = useMemo(() => Object.values(modes).every((m) => m === 'dry-run'), [modes]);

  return (
    <div className="space-y-4">
      <Header />

      <Alert variant={allDryRun ? 'default' : 'destructive'}>
        {allDryRun ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
        <AlertDescription className="text-xs">
          {allDryRun ? t('admin.ai.simulation.banner.dryRun') : t('admin.ai.simulation.banner.live')}
        </AlertDescription>
      </Alert>

      <ProfileCard profile={profile} loading={loading} onReload={() => void load()} />

      <SimulationSection
        id="guardrails"
        icon={ShieldCheck}
        titleKey="admin.ai.simulation.section.guardrails"
        descKey="admin.ai.simulation.section.guardrailsDesc"
        mode={modes.guardrails}
        lastRun={lastRun.guardrails}
        onMode={(m) => setMode('guardrails', m)}
        onRun={() => markRan('guardrails')}
      >
        {modes.guardrails === 'live' ? (
          <AiGuardrailsCard />
        ) : (
          <DryRunGuardrailsPreview />
        )}
      </SimulationSection>

      <SimulationSection
        id="providers"
        icon={Server}
        titleKey="admin.ai.simulation.section.providers"
        descKey="admin.ai.simulation.section.providersDesc"
        mode={modes.providers}
        lastRun={lastRun.providers}
        onMode={(m) => setMode('providers', m)}
        onRun={() => markRan('providers')}
      >
        <ProvidersTest mode={modes.providers} profile={profile} onCompleted={() => markRan('providers')} />
      </SimulationSection>

      <SimulationSection
        id="runbook"
        icon={ListChecks}
        titleKey="admin.ai.simulation.section.runbook"
        descKey="admin.ai.simulation.section.runbookDesc"
        mode={modes.runbook}
        lastRun={lastRun.runbook}
        onMode={(m) => setMode('runbook', m)}
        onRun={() => markRan('runbook')}
      >
        <SimulationRunbook mode={modes.runbook} />
      </SimulationSection>
    </div>
  );
}

function ProfileCard({
  profile,
  loading,
  onReload,
}: {
  profile: StagingProfile;
  loading: boolean;
  onReload: () => void;
}) {
  const { t } = useI18n();
  const entries = STAGING_KEYS.map((k) => [k, profile[k]] as const);
  const empty = entries.every(([, v]) => v === undefined);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <Beaker className="h-4 w-4 text-primary" />
              {t('admin.ai.simulation.profile.title')}
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {t('admin.ai.simulation.profile.subtitle')}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={onReload} disabled={loading}>
            <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', loading && 'animate-spin')} />
            {t('admin.ai.simulation.profile.refresh')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {empty && !loading && (
          <Alert>
            <ShieldAlert className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {t('admin.ai.simulation.profile.empty')}
            </AlertDescription>
          </Alert>
        )}
        <ul className="divide-y divide-border/40 rounded-md border border-border/40 overflow-hidden">
          {entries.map(([k, v]) => (
            <li key={k} className="grid grid-cols-[1fr_auto] gap-3 px-3 py-1.5 text-xs">
              <span className="font-mono text-muted-foreground truncate">{k}</span>
              <span className="font-mono text-right">
                {v === undefined ? <em className="text-muted-foreground">—</em> : formatValue(v)}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function formatValue(v: unknown): string {
  if (typeof v === 'string') return v.length > 48 ? v.slice(0, 45) + '…' : v;
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function SimulationSection({
  id,
  icon: Icon,
  titleKey,
  descKey,
  mode,
  lastRun,
  onMode,
  onRun,
  children,
}: {
  id: TestId;
  icon: React.ComponentType<{ className?: string }>;
  titleKey: string;
  descKey: string;
  mode: TestMode;
  lastRun: number | null;
  onMode: (mode: TestMode) => void;
  onRun: () => void;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <Card data-testid={`sim-section-${id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <Icon className="h-4 w-4 text-primary" />
              {t(titleKey as any)}
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-1 max-w-prose">{t(descKey as any)}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Label htmlFor={`mode-${id}`} className="text-[11px] text-muted-foreground">
                {t('admin.ai.simulation.mode.label')}
              </Label>
              <div className="flex items-center gap-1.5">
                <span className={cn('text-[11px]', mode === 'dry-run' ? 'font-semibold' : 'text-muted-foreground')}>
                  {t('admin.ai.simulation.mode.dryRun')}
                </span>
                <Switch
                  id={`mode-${id}`}
                  checked={mode === 'live'}
                  onCheckedChange={(v) => onMode(v ? 'live' : 'dry-run')}
                  data-testid={`sim-mode-${id}`}
                />
                <span className={cn('text-[11px]', mode === 'live' ? 'font-semibold text-amber-500' : 'text-muted-foreground')}>
                  {t('admin.ai.simulation.mode.live')}
                </span>
              </div>
            </div>
            <Button size="sm" variant="default" onClick={onRun} data-testid={`sim-run-${id}`}>
              <PlayCircle className="h-3.5 w-3.5 mr-1.5" />
              {t('admin.ai.simulation.run')}
            </Button>
          </div>
        </div>
        <div className="text-[10px] text-muted-foreground mt-1">
          {t('admin.ai.simulation.lastRun')}:{' '}
          {lastRun ? new Date(lastRun).toLocaleTimeString() : t('admin.ai.simulation.never')}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/**
 * Dry-run guardrails preview — lists the same items as `AiGuardrailsCard`
 * but without firing live RLS / role probes.
 */
function DryRunGuardrailsPreview() {
  const { t } = useI18n();
  const items = [
    { key: 'admin.ai.guardrails.rls', source: 'docs/migrations/20260427-user-data-rls.sql' },
    { key: 'admin.ai.guardrails.roles', source: 'public.user_roles + has_role()' },
    { key: 'admin.ai.guardrails.secrets', source: 'Edge Functions secrets · LOVABLE_API_KEY' },
    { key: 'admin.ai.guardrails.noClientKeys', source: 'window scan' },
    { key: 'admin.ai.guardrails.csp', source: 'index.html · meta CSP' },
    { key: 'admin.ai.guardrails.https', source: 'window.location.protocol' },
    { key: 'admin.ai.guardrails.deterministic', source: 'src/lib/ballistics.ts' },
  ];
  return (
    <ul className="divide-y divide-border/40 rounded-md border border-border/40 overflow-hidden">
      {items.map((it) => (
        <li key={it.key} className="grid grid-cols-[1fr_auto] gap-3 px-3 py-2 text-xs">
          <span className="font-medium">{t(it.key as any)}</span>
          <span className="font-mono text-[10px] text-muted-foreground text-right">{it.source}</span>
        </li>
      ))}
    </ul>
  );
}

function ProvidersTest({
  mode,
  profile,
  onCompleted,
}: {
  mode: TestMode;
  profile: StagingProfile;
  onCompleted: () => void;
}) {
  const { t } = useI18n();
  const sb = supabase!;
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<unknown>(null);

  const run = async () => {
    if (mode === 'dry-run') {
      // Dry-run = surface what the staging profile would request without
      // contacting the edge function.
      setResult({
        mode: 'dry-run',
        wouldUseProvider: profile['ai.provider_primary.staging'] ?? null,
        wouldUseModel: profile['ai.provider_model_primary.staging'] ?? null,
        wouldAllowGoogleFallback: profile['ai.allow_google_fallback.staging'] ?? null,
        wouldEnableGoogleDirect: profile['ai.google_direct_enabled.staging'] ?? null,
        wouldUseGoogleModel: profile['ai.google_direct_model.staging'] ?? null,
        wouldEnableOllama: profile['ai.ollama_enabled.staging'] ?? null,
      });
      onCompleted();
      return;
    }
    setBusy(true);
    const { data, error } = await sb.functions.invoke('ai-providers-test', { body: {} });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setResult(data);
    onCompleted();
  };

  return (
    <div className="space-y-3">
      {mode === 'live' && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription className="text-xs">
            {t('admin.ai.simulation.warning.prodFallback')}
          </AlertDescription>
        </Alert>
      )}
      <Button size="sm" variant="secondary" onClick={() => void run()} disabled={busy} data-testid="sim-providers-fire">
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
        ) : (
          <PlayCircle className="h-3.5 w-3.5 mr-1.5" />
        )}
        {busy ? t('admin.ai.simulation.running') : t('admin.ai.simulation.run')}
      </Button>
      {result !== null && (
        <pre className="text-[10px] font-mono bg-muted/40 rounded-md border border-border/40 p-2 overflow-auto max-h-72">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}

/**
 * Runbook checklist scoped to the simulation profile. Same 13 items as
 * production, but state lives under a separate localStorage key so prod
 * validation is never overwritten.
 */
function SimulationRunbook({ mode }: { mode: TestMode }) {
  const { t } = useI18n();
  const [state, setState] = useState<Record<string, CheckStatus>>(() => {
    try {
      const raw = localStorage.getItem(RUNBOOK_SIMULATION_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Record<string, CheckStatus>) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(RUNBOOK_SIMULATION_STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore quota */
    }
  }, [state]);

  const toggle = useCallback(
    (id: string) => {
      if (mode === 'dry-run') {
        toast.info(t('admin.ai.simulation.mode.dryRunDesc'));
        return;
      }
      setState((prev) => {
        const cur: CheckStatus = prev[id] ?? 'untested';
        const next: CheckStatus = cur === 'untested' ? 'ok' : cur === 'ok' ? 'ko' : 'untested';
        return { ...prev, [id]: next };
      });
    },
    [mode, t],
  );

  const reset = () => setState({});
  const score = computeScore(state);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Badge
          variant={score.ok === score.total ? 'default' : score.ko > 0 ? 'destructive' : 'secondary'}
          data-testid="sim-runbook-score"
        >
          {score.ok}/{score.total}
        </Badge>
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={reset} title={t('admin.ai.simulation.runbook.reset')}>
          <RotateCcw className="h-3 w-3" />
        </Button>
      </div>
      <ul className="space-y-1">
        {RUNBOOK_ITEMS.map((item) => {
          const status: CheckStatus = state[item.id] ?? 'untested';
          const Icon = status === 'ok' ? CheckCircle2 : status === 'ko' ? XCircle : CircleDashed;
          const cls =
            status === 'ok'
              ? 'text-primary'
              : status === 'ko'
              ? 'text-destructive'
              : 'text-muted-foreground';
          return (
            <li key={item.id}>
              <button
                type="button"
                disabled={mode === 'dry-run'}
                onClick={() => toggle(item.id)}
                className={cn(
                  'flex items-center gap-2 w-full text-left text-xs px-2 py-1.5 rounded transition-colors',
                  mode === 'live' ? 'hover:bg-muted/50' : 'opacity-60 cursor-not-allowed',
                )}
                data-testid={`sim-runbook-item-${item.id}`}
                data-status={status}
              >
                <Icon className={cn('h-4 w-4', cls)} />
                <span className={status === 'ko' ? 'text-destructive' : ''}>{t(item.labelKey as any)}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="text-[10px] text-muted-foreground pt-1">
        {t('admin.ai.simulation.runbook.scoped')}
      </p>
    </div>
  );
}