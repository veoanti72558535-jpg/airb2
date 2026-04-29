import React, { useMemo, useState } from 'react';
import {
  Shield, Lock, KeyRound, FileLock2, ServerOff, Cpu, Database,
  CheckCircle2, AlertTriangle, XCircle, Loader2, ChevronDown, ChevronRight,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/**
 * Section "Sécurité IA" exposée dans Settings → Affichage (Advanced).
 *
 * Audit STATIQUE côté client : aucune dépendance backend (Cloud désactivé,
 * voir core memory). On documente les garde-fous appliqués par la stack
 * AirBallistik et on propose des tests de configuration synchrones.
 *
 * Aucun secret n'est lu ici — on vérifie uniquement la *présence* de
 * patterns suspects (clés en clair dans le bundle index.html, absence de
 * meta CSP, feature flags IA, etc.).
 */

type Status = 'ok' | 'warn' | 'fail' | 'info' | 'pending';

interface Guardrail {
  icon: React.ComponentType<{ className?: string }>;
  titleKey: string;
  descKey: string;
  status: Status;
}

interface CheckResult {
  id: string;
  labelKey: string;
  status: Status;
  detail?: string;
}

const STATUS_STYLES: Record<Status, { icon: React.ComponentType<{ className?: string }>; cls: string }> = {
  ok:      { icon: CheckCircle2,  cls: 'text-emerald-500' },
  warn:    { icon: AlertTriangle, cls: 'text-amber-500' },
  fail:    { icon: XCircle,       cls: 'text-destructive' },
  info:    { icon: Shield,        cls: 'text-muted-foreground' },
  pending: { icon: Loader2,       cls: 'text-muted-foreground animate-spin' },
};

function StatusPill({ status, label }: { status: Status; label: string }) {
  const meta = STATUS_STYLES[status];
  const Icon = meta.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 text-[11px] font-medium', meta.cls)}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

export function SecurityAuditCard() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<CheckResult[] | null>(null);

  const guardrails: Guardrail[] = useMemo(() => ([
    {
      icon: Cpu,
      titleKey: 'settings.security.guard.deterministic',
      descKey: 'settings.security.guard.deterministicDesc',
      status: 'ok',
    },
    {
      icon: ServerOff,
      titleKey: 'settings.security.guard.noBackend',
      descKey: 'settings.security.guard.noBackendDesc',
      status: 'info',
    },
    {
      icon: KeyRound,
      titleKey: 'settings.security.guard.aiSecrets',
      descKey: 'settings.security.guard.aiSecretsDesc',
      status: 'info',
    },
    {
      icon: Lock,
      titleKey: 'settings.security.guard.rls',
      descKey: 'settings.security.guard.rlsDesc',
      status: 'info',
    },
    {
      icon: Shield,
      titleKey: 'settings.security.guard.roles',
      descKey: 'settings.security.guard.rolesDesc',
      status: 'info',
    },
    {
      icon: FileLock2,
      titleKey: 'settings.security.guard.csp',
      descKey: 'settings.security.guard.cspDesc',
      status: 'warn',
    },
    {
      icon: Database,
      titleKey: 'settings.security.guard.localStorage',
      descKey: 'settings.security.guard.localStorageDesc',
      status: 'warn',
    },
  ]), []);

  const runChecks = async () => {
    setRunning(true);
    setResults(null);
    const out: CheckResult[] = [];

    // 1. CSP meta tag presence
    const csp = document.querySelector('meta[http-equiv="Content-Security-Policy" i]');
    out.push({
      id: 'csp',
      labelKey: 'settings.security.test.csp',
      status: csp ? 'ok' : 'warn',
      detail: csp ? (csp.getAttribute('content') ?? '').slice(0, 80) : undefined,
    });

    // 2. HTTPS in production
    const isHttps = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
    out.push({
      id: 'https',
      labelKey: 'settings.security.test.https',
      status: isHttps ? 'ok' : 'fail',
      detail: window.location.protocol,
    });

    // 3. Service worker registered (PWA hardening)
    let swOk = false;
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        swOk = !!reg;
      } catch { /* ignore */ }
    }
    out.push({
      id: 'sw',
      labelKey: 'settings.security.test.sw',
      status: swOk ? 'ok' : 'warn',
    });

    // 4. No obvious secrets exposed in window globals
    const globals = Object.keys(window as any);
    const suspicious = globals.filter((k) => /SECRET|PRIVATE_KEY|SERVICE_ROLE/i.test(k));
    out.push({
      id: 'globals',
      labelKey: 'settings.security.test.globals',
      status: suspicious.length === 0 ? 'ok' : 'fail',
      detail: suspicious.join(', ') || undefined,
    });

    // 5. AI feature flag — assistance only, never used in deterministic engine
    const aiOff = (() => {
      try {
        const raw = localStorage.getItem('pcp-settings');
        if (!raw) return null;
        const s = JSON.parse(raw);
        return s?.featureFlags?.ai === false;
      } catch { return null; }
    })();
    out.push({
      id: 'ai-flag',
      labelKey: 'settings.security.test.aiFlag',
      status: aiOff === null ? 'info' : aiOff ? 'ok' : 'info',
    });

    // 6. Crypto API available (WebCrypto required for any future signing)
    out.push({
      id: 'crypto',
      labelKey: 'settings.security.test.crypto',
      status: typeof crypto !== 'undefined' && !!crypto.subtle ? 'ok' : 'warn',
    });

    setResults(out);
    setRunning(false);
  };

  return (
    <div className="surface-elevated p-4 space-y-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Shield className="h-4 w-4 text-primary shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-medium">{t('settings.security.title' as any)}</div>
            <div className="text-[11px] text-muted-foreground">
              {t('settings.security.subtitle' as any)}
            </div>
          </div>
        </div>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="space-y-4 pt-1">
          {/* Guardrails list */}
          <div className="space-y-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {t('settings.security.guardrailsTitle' as any)}
            </div>
            <ul className="space-y-1.5">
              {guardrails.map((g) => {
                const Icon = g.icon;
                return (
                  <li
                    key={g.titleKey}
                    className="flex items-start gap-3 rounded-md border border-border/40 bg-muted/20 p-2.5"
                  >
                    <Icon className="h-4 w-4 text-primary/80 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium">{t(g.titleKey as any)}</span>
                        <StatusPill
                          status={g.status}
                          label={t(`settings.security.status.${g.status}` as any)}
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{t(g.descKey as any)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Tests */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {t('settings.security.testsTitle' as any)}
              </div>
              <button
                onClick={runChecks}
                disabled={running}
                className={cn(
                  'px-3 py-1 rounded-md text-xs font-medium',
                  'bg-primary/10 text-primary hover:bg-primary/15 disabled:opacity-50'
                )}
              >
                {running ? t('settings.security.running' as any) : t('settings.security.runTests' as any)}
              </button>
            </div>

            {results && (
              <ul className="space-y-1">
                {results.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-3 px-2.5 py-1.5 rounded-md hover:bg-muted/30"
                  >
                    <div className="min-w-0">
                      <div className="text-xs">{t(r.labelKey as any)}</div>
                      {r.detail && (
                        <div className="text-[10px] text-muted-foreground font-mono truncate">{r.detail}</div>
                      )}
                    </div>
                    <StatusPill
                      status={r.status}
                      label={t(`settings.security.status.${r.status}` as any)}
                    />
                  </li>
                ))}
              </ul>
            )}

            {!results && !running && (
              <p className="text-[11px] text-muted-foreground italic">
                {t('settings.security.noResults' as any)}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}