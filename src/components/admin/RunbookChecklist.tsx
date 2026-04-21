/**
 * Runbook checklist — 13 validation items with untested/OK/KO status.
 * State is persisted to localStorage under `airballistik:runbook-validation`.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, XCircle, CircleDashed, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';

export type CheckStatus = 'untested' | 'ok' | 'ko';

export interface CheckItem {
  id: string;
  labelKey: string;
}

export const RUNBOOK_ITEMS: CheckItem[] = [
  { id: 'auth-admin-ok', labelKey: 'admin.ai.runbook.item.authAdmin' },
  { id: 'auth-no-jwt', labelKey: 'admin.ai.runbook.item.authNoJwt' },
  { id: 'auth-no-role', labelKey: 'admin.ai.runbook.item.authNoRole' },
  { id: 'providers-test', labelKey: 'admin.ai.runbook.item.providersTest' },
  { id: 'dispatch-quatarly', labelKey: 'admin.ai.runbook.item.dispatchQuatarly' },
  { id: 'dispatch-google', labelKey: 'admin.ai.runbook.item.dispatchGoogle' },
  { id: 'fallback-google', labelKey: 'admin.ai.runbook.item.fallbackGoogle' },
  { id: 'agent-missing', labelKey: 'admin.ai.runbook.item.agentMissing' },
  { id: 'body-invalid', labelKey: 'admin.ai.runbook.item.bodyInvalid' },
  { id: 'ollama-cloud', labelKey: 'admin.ai.runbook.item.ollamaCloud' },
  { id: 'quota-google', labelKey: 'admin.ai.runbook.item.quotaGoogle' },
  { id: 'logs-runs', labelKey: 'admin.ai.runbook.item.logsRuns' },
  { id: 'logs-events', labelKey: 'admin.ai.runbook.item.logsEvents' },
];

const STORAGE_KEY = 'airballistik:runbook-validation';

function loadState(): Record<string, CheckStatus> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, CheckStatus>;
  } catch {
    return {};
  }
}

function saveState(state: Record<string, CheckStatus>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function computeScore(state: Record<string, CheckStatus>): { ok: number; ko: number; total: number } {
  let ok = 0;
  let ko = 0;
  for (const item of RUNBOOK_ITEMS) {
    const s = state[item.id];
    if (s === 'ok') ok++;
    else if (s === 'ko') ko++;
  }
  return { ok, ko, total: RUNBOOK_ITEMS.length };
}

const nextStatus: Record<CheckStatus, CheckStatus> = {
  untested: 'ok',
  ok: 'ko',
  ko: 'untested',
};

const statusIcon: Record<CheckStatus, React.ReactNode> = {
  untested: <CircleDashed className="h-4 w-4 text-muted-foreground" />,
  ok: <CheckCircle2 className="h-4 w-4 text-primary" />,
  ko: <XCircle className="h-4 w-4 text-destructive" />,
};

export default function RunbookChecklist() {
  const { t } = useI18n();
  const [state, setState] = useState<Record<string, CheckStatus>>(loadState);

  useEffect(() => { saveState(state); }, [state]);

  const toggle = useCallback((id: string) => {
    setState((prev) => {
      const cur: CheckStatus = prev[id] ?? 'untested';
      return { ...prev, [id]: nextStatus[cur] };
    });
  }, []);

  const reset = useCallback(() => { setState({}); }, []);

  const score = useMemo(() => computeScore(state), [state]);

  return (
    <Card data-testid="runbook-checklist">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{t('admin.ai.runbook.checklistTitle')}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge
              variant={score.ok === score.total ? 'default' : score.ko > 0 ? 'destructive' : 'secondary'}
              data-testid="runbook-score"
            >
              {score.ok}/{score.total}
            </Badge>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={reset} title={t('admin.ai.runbook.reset')}>
              <RotateCcw className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-1">
        {RUNBOOK_ITEMS.map((item) => {
          const status: CheckStatus = state[item.id] ?? 'untested';
          return (
            <button
              key={item.id}
              type="button"
              className="flex items-center gap-2 w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted/50 transition-colors"
              onClick={() => toggle(item.id)}
              data-testid={`runbook-item-${item.id}`}
              data-status={status}
            >
              {statusIcon[status]}
              <span className={status === 'ko' ? 'text-destructive' : ''}>{t(item.labelKey as any)}</span>
            </button>
          );
        })}
        {score.ko > 0 && (
          <p className="text-xs text-destructive mt-2">{t('admin.ai.runbook.hasFailures')}</p>
        )}
      </CardContent>
    </Card>
  );
}