/**
 * RLS Details panel — human-readable, audit-friendly summary of every
 * Row-Level Security policy currently shipped in the project's
 * migrations.
 *
 * This panel is intentionally STATIC: it documents what the migrations
 * declare. The live probe (does anon really get refused? does
 * has_role() resolve?) is handled by `AiGuardrailsCard`. The two
 * complement each other:
 *
 *   - AiGuardrailsCard  → "is the door currently locked?"
 *   - RlsDetailsPanel   → "what does the lock do, on which doors?"
 *
 * Source of truth (kept in sync manually with):
 *   supabase/migrations/20260420000000_ia1_init.sql
 *   supabase/migrations/20260427000000_ia3_agents.sql
 *
 * The panel is bilingual (FR/EN) via `useI18n`. All strings live in
 * `src/lib/translations.ts` under the `admin.ai.rls.*` namespace.
 */
import React, { useMemo, useState } from 'react';
import {
  Lock,
  Database,
  ShieldCheck,
  Eye,
  PencilLine,
  Trash2,
  Plus,
  Globe,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type Operation = 'select' | 'insert' | 'update' | 'delete' | 'all';
type Audience = 'admin' | 'authenticated' | 'self';

interface PolicyRow {
  /** PostgreSQL policy name as declared in the migration. */
  name: string;
  operation: Operation;
  audience: Audience;
  /** i18n key explaining the rule in plain language. */
  descriptionKey: string;
  /** Optional SQL excerpt (already escaped, ≤ 80 chars). */
  using?: string;
}

interface TableRls {
  /** `public.<table>` */
  table: string;
  /** i18n key for a one-line purpose summary. */
  purposeKey: string;
  /** Migration file the table comes from. */
  source: string;
  /** Whether the table is sensitive (drives the badge color). */
  sensitivity: 'critical' | 'sensitive' | 'shared';
  policies: PolicyRow[];
}

const TABLES: TableRls[] = [
  {
    table: 'public.user_roles',
    purposeKey: 'admin.ai.rls.tables.user_roles',
    source: '20260420000000_ia1_init.sql',
    sensitivity: 'critical',
    policies: [
      {
        name: 'user_roles_select_self',
        operation: 'select',
        audience: 'self',
        descriptionKey: 'admin.ai.rls.policy.userRolesSelectSelf',
        using: 'auth.uid() = user_id',
      },
      {
        name: 'user_roles_admin_insert',
        operation: 'insert',
        audience: 'admin',
        descriptionKey: 'admin.ai.rls.policy.userRolesAdminInsert',
        using: "has_role(auth.uid(), 'admin')",
      },
      {
        name: 'user_roles_admin_delete',
        operation: 'delete',
        audience: 'admin',
        descriptionKey: 'admin.ai.rls.policy.userRolesAdminDelete',
        using: "has_role(auth.uid(), 'admin')",
      },
    ],
  },
  {
    table: 'public.app_settings',
    purposeKey: 'admin.ai.rls.tables.app_settings',
    source: '20260420000000_ia1_init.sql',
    sensitivity: 'sensitive',
    policies: [
      {
        name: 'app_settings_read_auth',
        operation: 'select',
        audience: 'authenticated',
        descriptionKey: 'admin.ai.rls.policy.appSettingsReadAuth',
        using: 'auth.role() = \'authenticated\'',
      },
      {
        name: 'app_settings_write_admin',
        operation: 'all',
        audience: 'admin',
        descriptionKey: 'admin.ai.rls.policy.appSettingsWriteAdmin',
        using: "has_role(auth.uid(), 'admin')",
      },
    ],
  },
  {
    table: 'public.ai_agent_configs',
    purposeKey: 'admin.ai.rls.tables.ai_agent_configs',
    source: '20260420000000_ia1_init.sql',
    sensitivity: 'sensitive',
    policies: [
      {
        name: 'ai_agent_configs_admin_all',
        operation: 'all',
        audience: 'admin',
        descriptionKey: 'admin.ai.rls.policy.aiAgentConfigsAdminAll',
        using: "has_role(auth.uid(), 'admin')",
      },
    ],
  },
  {
    table: 'public.ai_agent_runs',
    purposeKey: 'admin.ai.rls.tables.ai_agent_runs',
    source: '20260420000000_ia1_init.sql',
    sensitivity: 'sensitive',
    policies: [
      {
        name: 'ai_agent_runs_admin_read',
        operation: 'select',
        audience: 'admin',
        descriptionKey: 'admin.ai.rls.policy.aiAgentRunsAdminRead',
        using: "has_role(auth.uid(), 'admin')",
      },
    ],
  },
  {
    table: 'public.ai_usage_events',
    purposeKey: 'admin.ai.rls.tables.ai_usage_events',
    source: '20260420000000_ia1_init.sql',
    sensitivity: 'sensitive',
    policies: [
      {
        name: 'ai_usage_events_admin_read',
        operation: 'select',
        audience: 'admin',
        descriptionKey: 'admin.ai.rls.policy.aiUsageEventsAdminRead',
        using: "has_role(auth.uid(), 'admin')",
      },
    ],
  },
];

const OP_META: Record<Operation, { icon: React.ComponentType<{ className?: string }>; cls: string }> = {
  select: { icon: Eye,        cls: 'bg-sky-500/10 text-sky-500 border-sky-500/20' },
  insert: { icon: Plus,       cls: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  update: { icon: PencilLine, cls: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  delete: { icon: Trash2,     cls: 'bg-destructive/10 text-destructive border-destructive/20' },
  all:    { icon: Lock,       cls: 'bg-primary/10 text-primary border-primary/20' },
};

const AUD_META: Record<Audience, { icon: React.ComponentType<{ className?: string }>; cls: string }> = {
  admin:         { icon: ShieldCheck, cls: 'bg-primary/10 text-primary border-primary/20' },
  authenticated: { icon: Globe,       cls: 'bg-muted text-foreground border-border' },
  self:          { icon: Eye,         cls: 'bg-sky-500/10 text-sky-500 border-sky-500/20' },
};

const SENS_CLS: Record<TableRls['sensitivity'], string> = {
  critical:  'bg-destructive/10 text-destructive border-destructive/20',
  sensitive: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  shared:    'bg-muted text-foreground border-border',
};

export function RlsDetailsPanel() {
  const { t } = useI18n();
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(TABLES.map((tab) => [tab.table, true])),
  );

  const counts = useMemo(() => {
    const total = TABLES.reduce((acc, t) => acc + t.policies.length, 0);
    const byAudience = TABLES.flatMap((t) => t.policies).reduce(
      (acc, p) => {
        acc[p.audience] = (acc[p.audience] ?? 0) + 1;
        return acc;
      },
      {} as Record<Audience, number>,
    );
    return { tables: TABLES.length, policies: total, byAudience };
  }, []);

  const toggle = (table: string) => setOpen((prev) => ({ ...prev, [table]: !prev[table] }));
  const expandAll = () => setOpen(Object.fromEntries(TABLES.map((tab) => [tab.table, true])));
  const collapseAll = () => setOpen(Object.fromEntries(TABLES.map((tab) => [tab.table, false])));

  return (
    <Card data-testid="rls-details-panel">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              {t('admin.ai.rls.title')}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1 max-w-prose">
              {t('admin.ai.rls.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={expandAll}>
              {t('admin.ai.rls.expandAll')}
            </Button>
            <Button size="sm" variant="ghost" onClick={collapseAll}>
              {t('admin.ai.rls.collapseAll')}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Summary row */}
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-border bg-muted/40">
            <Database className="h-3 w-3" />
            <span className="tabular-nums font-semibold">{counts.tables}</span>
            <span className="opacity-80">{t('admin.ai.rls.summary.tables')}</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-border bg-muted/40">
            <Lock className="h-3 w-3" />
            <span className="tabular-nums font-semibold">{counts.policies}</span>
            <span className="opacity-80">{t('admin.ai.rls.summary.policies')}</span>
          </span>
          {(['admin', 'authenticated', 'self'] as Audience[]).map((a) => {
            const n = counts.byAudience[a] ?? 0;
            if (!n) return null;
            const meta = AUD_META[a];
            return (
              <span key={a} className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md border', meta.cls)}>
                <meta.icon className="h-3 w-3" />
                <span className="tabular-nums font-semibold">{n}</span>
                <span className="opacity-80">{t(`admin.ai.rls.audience.${a}` as any)}</span>
              </span>
            );
          })}
        </div>

        {/* Tables list */}
        <ul className="space-y-2">
          {TABLES.map((tab) => {
            const isOpen = open[tab.table] ?? true;
            const ChevIcon = isOpen ? ChevronDown : ChevronRight;
            return (
              <li key={tab.table} className="rounded-md border border-border/50 overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggle(tab.table)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/30 transition-colors"
                  aria-expanded={isOpen}
                  data-testid={`rls-table-${tab.table}`}
                >
                  <ChevIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  <Database className="h-3.5 w-3.5 text-primary" />
                  <span className="text-sm font-mono">{tab.table}</span>
                  <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 h-4 border', SENS_CLS[tab.sensitivity])}>
                    {t(`admin.ai.rls.sensitivity.${tab.sensitivity}` as any)}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground ml-auto font-mono">
                    {tab.policies.length} · {tab.source}
                  </span>
                </button>
                {isOpen && (
                  <div className="border-t border-border/40 px-3 py-2 space-y-2 bg-muted/10">
                    <p className="text-[11px] text-muted-foreground">{t(tab.purposeKey as any)}</p>
                    <ul className="divide-y divide-border/30 rounded-md border border-border/30 overflow-hidden">
                      {tab.policies.map((p) => {
                        const op = OP_META[p.operation];
                        const aud = AUD_META[p.audience];
                        const OpIcon = op.icon;
                        const AudIcon = aud.icon;
                        return (
                          <li key={p.name} className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-2 px-2.5 py-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 h-4 border uppercase', op.cls)}>
                                <OpIcon className="h-2.5 w-2.5 mr-1" />
                                {p.operation}
                              </Badge>
                              <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 h-4 border', aud.cls)}>
                                <AudIcon className="h-2.5 w-2.5 mr-1" />
                                {t(`admin.ai.rls.audience.${p.audience}` as any)}
                              </Badge>
                            </div>
                            <div className="min-w-0">
                              <div className="text-[11px] font-mono text-muted-foreground truncate">{p.name}</div>
                              <div className="text-xs">{t(p.descriptionKey as any)}</div>
                            </div>
                            {p.using && (
                              <code className="text-[10px] font-mono text-muted-foreground md:text-right break-all md:max-w-[220px]">
                                {p.using}
                              </code>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <p className="text-[10px] text-muted-foreground pt-1">
          {t('admin.ai.rls.disclaimer')}
        </p>
      </CardContent>
    </Card>
  );
}

export default RlsDetailsPanel;