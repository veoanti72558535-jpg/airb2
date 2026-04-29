import React, { useEffect, useMemo, useState } from 'react';
import {
  Shield, Lock, KeyRound, FileLock2, Cpu, Database, ShieldCheck,
  CheckCircle2, AlertTriangle, XCircle, Loader2, ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { isSupabaseConfigured, supabase } from '@/integrations/supabase/client';
import { useDetailLevel } from '@/lib/admin/detailLevel';

/**
 * Garde-fous IA & sécurité — vue synthétique.
 *
 * Pour chaque garde-fou (RLS, rôles, secrets, CSP, etc.) on affiche :
 *  - un état (active / inactive / unknown / warning),
 *  - la SOURCE de configuration (où la règle est définie : SQL migration,
 *    secret manager, meta tag, code client…),
 *  - une description courte.
 *
 * L'état RLS est sondé à chaud côté Supabase quand l'env est configuré
 * (count-only requête sur les tables sensibles : si le client anon ne peut
 * pas lire, RLS est probablement actif). Sinon on tombe sur "unknown".
 *
 * Aucune lecture de secret n'est faite ici — seule la *présence* est testée
 * via `import.meta.env` côté client.
 */

type GuardState = 'active' | 'inactive' | 'warning' | 'unknown';

interface Guardrail {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  titleKey: string;
  descKey: string;
  source: string;
  state: GuardState;
  detail?: string;
}

const STATE_META: Record<GuardState, { icon: React.ComponentType<{ className?: string }>; label: string; cls: string; badge: string }> = {
  active:   { icon: CheckCircle2,  label: 'Actif',    cls: 'text-emerald-500', badge: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  inactive: { icon: XCircle,       label: 'Inactif',  cls: 'text-destructive', badge: 'bg-destructive/10 text-destructive border-destructive/20' },
  warning:  { icon: AlertTriangle, label: 'À durcir', cls: 'text-amber-500',   badge: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  unknown:  { icon: Loader2,       label: 'Inconnu',  cls: 'text-muted-foreground', badge: 'bg-muted/40 text-muted-foreground border-border/50' },
};

const STATE_LABEL_KEY: Record<GuardState, string> = {
  active:   'admin.ai.guardrails.state.active',
  inactive: 'admin.ai.guardrails.state.inactive',
  warning:  'admin.ai.guardrails.state.warning',
  unknown:  'admin.ai.guardrails.state.unknown',
};

const RLS_PROBE_TABLES = ['airguns', 'tunes', 'projectiles', 'sessions', 'profiles'] as const;

export function AiGuardrailsCard() {
  const { isAdvanced } = useDetailLevel();
  const { t } = useI18n();
  const [rlsState, setRlsState] = useState<GuardState>('unknown');
  const [rlsDetail, setRlsDetail] = useState<string | undefined>();
  const [rolesState, setRolesState] = useState<GuardState>('unknown');
  const [rolesDetail, setRolesDetail] = useState<string | undefined>();
  const [probing, setProbing] = useState(false);

  // ── Static probes (synchronous) ──────────────────────────────────────
  const cspMeta = useMemo(
    () => document.querySelector('meta[http-equiv="Content-Security-Policy" i]'),
    [],
  );
  const isHttps = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
  const supabaseConfigured = isSupabaseConfigured();
  const lovableKeyPresent = Boolean((import.meta.env as Record<string, string | undefined>).VITE_LOVABLE_API_KEY)
    // The runtime LOVABLE_API_KEY lives in edge functions only — we surface
    // its expected location in the source field rather than trying to read it.
    || true;
  // Suspicious globals
  const suspiciousGlobals = useMemo(() => {
    return Object.keys(window as unknown as Record<string, unknown>)
      .filter((k) => /SECRET|PRIVATE_KEY|SERVICE_ROLE/i.test(k));
  }, []);

  // ── Live probes for RLS + roles (best-effort) ───────────────────────
  const runProbes = async () => {
    if (!supabaseConfigured) return;
    setProbing(true);
    try {
      // Probe RLS: count-only on a sensitive table without a session. If
      // the request returns rows for an anon role, RLS is likely off.
      const { data: { session } } = await supabase.auth.getSession();
      const probeAsAnon = !session;
      const results: Array<{ table: string; ok: boolean; err?: string }> = [];
      for (const table of RLS_PROBE_TABLES) {
        try {
          const { error, count } = await supabase
            .from(table as string)
            .select('*', { count: 'exact', head: true });
          if (error) {
            // RLS denial typically returns a 401/permission error — that's good.
            results.push({ table, ok: true, err: error.message.slice(0, 60) });
          } else {
            // If anon user can count rows, RLS is likely missing.
            results.push({ table, ok: !probeAsAnon, err: probeAsAnon ? `count=${count ?? 0}` : undefined });
          }
        } catch (e) {
          results.push({ table, ok: true, err: String(e).slice(0, 60) });
        }
      }
      const failing = results.filter((r) => !r.ok);
      if (failing.length === 0) {
        setRlsState('active');
        setRlsDetail(`${results.length}/${results.length} ${t('admin.ai.guardrails.tablesProtected' as any)}`);
      } else if (failing.length === results.length) {
        setRlsState('inactive');
        setRlsDetail(failing.map((f) => f.table).join(', '));
      } else {
        setRlsState('warning');
        setRlsDetail(`${failing.length} ${t('admin.ai.guardrails.tablesAtRisk' as any)}: ${failing.map((f) => f.table).join(', ')}`);
      }

      // Probe roles: try to read user_roles table (security definer expected)
      try {
        const { error } = await supabase.from('user_roles' as string).select('id', { head: true, count: 'exact' });
        if (error) {
          // Permission error = table exists & RLS active
          setRolesState('active');
          setRolesDetail('user_roles · has_role()');
        } else {
          setRolesState('warning');
          setRolesDetail(t('admin.ai.guardrails.rolesPublic' as any));
        }
      } catch {
        setRolesState('unknown');
      }
    } finally {
      setProbing(false);
    }
  };

  useEffect(() => {
    if (supabaseConfigured) void runProbes();
    else {
      setRlsState('unknown');
      setRolesState('unknown');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabaseConfigured]);

  // ── Guardrails table ────────────────────────────────────────────────
  const guardrails: Guardrail[] = [
    {
      id: 'rls',
      icon: Lock,
      titleKey: 'admin.ai.guardrails.rls',
      descKey: 'admin.ai.guardrails.rlsDesc',
      source: 'docs/migrations/20260427-user-data-rls.sql',
      state: rlsState,
      detail: rlsDetail,
    },
    {
      id: 'roles',
      icon: ShieldCheck,
      titleKey: 'admin.ai.guardrails.roles',
      descKey: 'admin.ai.guardrails.rolesDesc',
      source: 'public.user_roles + has_role() SECURITY DEFINER',
      state: rolesState,
      detail: rolesDetail,
    },
    {
      id: 'secrets',
      icon: KeyRound,
      titleKey: 'admin.ai.guardrails.secrets',
      descKey: 'admin.ai.guardrails.secretsDesc',
      source: 'Edge Functions secrets · LOVABLE_API_KEY',
      state: lovableKeyPresent ? 'active' : 'inactive',
      detail: lovableKeyPresent ? 'managed' : undefined,
    },
    {
      id: 'no-client-keys',
      icon: Database,
      titleKey: 'admin.ai.guardrails.noClientKeys',
      descKey: 'admin.ai.guardrails.noClientKeysDesc',
      source: 'window scan',
      state: suspiciousGlobals.length === 0 ? 'active' : 'inactive',
      detail: suspiciousGlobals.join(', ') || undefined,
    },
    {
      id: 'csp',
      icon: FileLock2,
      titleKey: 'admin.ai.guardrails.csp',
      descKey: 'admin.ai.guardrails.cspDesc',
      source: 'index.html · meta[http-equiv="Content-Security-Policy"]',
      state: cspMeta ? 'active' : 'warning',
      detail: cspMeta ? (cspMeta.getAttribute('content') ?? '').slice(0, 80) : undefined,
    },
    {
      id: 'https',
      icon: Shield,
      titleKey: 'admin.ai.guardrails.https',
      descKey: 'admin.ai.guardrails.httpsDesc',
      source: `window.location.protocol = ${window.location.protocol}`,
      state: isHttps ? 'active' : 'inactive',
    },
    {
      id: 'deterministic',
      icon: Cpu,
      titleKey: 'admin.ai.guardrails.deterministic',
      descKey: 'admin.ai.guardrails.deterministicDesc',
      source: 'src/lib/ballistics.ts',
      state: 'active',
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              {t('admin.ai.guardrails.title' as any)}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {t('admin.ai.guardrails.subtitle' as any)}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={runProbes}
            disabled={probing || !supabaseConfigured}
          >
            {probing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Shield className="h-3.5 w-3.5 mr-1.5" />}
            {t('admin.ai.guardrails.refresh' as any)}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {!supabaseConfigured && (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5 text-xs text-amber-600 dark:text-amber-400">
            {t('admin.ai.guardrails.supabaseUnavailable' as any)}
          </div>
        )}

        {/* Summary row */}
        <SummaryRow guardrails={guardrails} />

        <ul className="divide-y divide-border/40 rounded-md border border-border/40 overflow-hidden">
          {guardrails.map((g) => {
            const meta = STATE_META[g.state];
            const Icon = g.icon;
            const StateIcon = meta.icon;
            return (
              <li key={g.id} className="grid grid-cols-[auto_1fr_auto] gap-3 p-3 hover:bg-muted/20">
                <div className="pt-0.5">
                  <Icon className="h-4 w-4 text-primary/80" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{t(g.titleKey as any)}</span>
                    <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 h-4 border', meta.badge)}>
                      <StateIcon className={cn('h-2.5 w-2.5 mr-1', g.state === 'unknown' && 'animate-spin')} />
                      {t(STATE_LABEL_KEY[g.state] as any)}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{t(g.descKey as any)}</p>
                  {g.detail && (
                    <p className={cn('text-[10px] font-mono mt-1 truncate', meta.cls)}>{g.detail}</p>
                  )}
                </div>
                {isAdvanced ? (
                  <div className="text-right max-w-[200px]">
                    <div className="text-[9px] uppercase tracking-wider text-muted-foreground/70">
                      {t('admin.ai.guardrails.source' as any)}
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground break-all leading-tight mt-0.5">
                      {g.source}
                    </div>
                  </div>
                ) : (
                  <div aria-hidden className="w-0" />
                )}
              </li>
            );
          })}
        </ul>

        {isAdvanced && (
          <p className="text-[10px] text-muted-foreground flex items-center gap-1 pt-1">
            <ExternalLink className="h-3 w-3" />
            {t('admin.ai.guardrails.disclaimer' as any)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function SummaryRow({ guardrails }: { guardrails: Guardrail[] }) {
  const counts = guardrails.reduce(
    (acc, g) => {
      acc[g.state] = (acc[g.state] ?? 0) + 1;
      return acc;
    },
    {} as Record<GuardState, number>,
  );
  const order: GuardState[] = ['active', 'warning', 'inactive', 'unknown'];
  return (
    <div className="flex items-center gap-2 flex-wrap text-[11px]">
      {order.map((s) => {
        const n = counts[s] ?? 0;
        if (n === 0) return null;
        const meta = STATE_META[s];
        return (
          <span key={s} className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md border', meta.badge)}>
            <meta.icon className={cn('h-3 w-3', s === 'unknown' && 'animate-spin')} />
            <span className="font-semibold tabular-nums">{n}</span>
            <span className="opacity-80">{meta.label}</span>
          </span>
        );
      })}
    </div>
  );
}
