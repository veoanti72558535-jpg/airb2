/**
 * Read-only log viewer: enter a run_id, fetch matching rows from
 * ai_agent_runs + ai_usage_events and display them.
 */
import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RunRow {
  id: string;
  agent_slug: string;
  provider: string;
  model: string;
  status: string;
  latency_ms: number | null;
  error_code: string | null;
  fallback_used: boolean;
  started_at: string;
  finished_at: string | null;
}

interface EventRow {
  id: string;
  run_id: string;
  event_type: string;
  provider: string;
  model: string;
  success: boolean;
  error_code: string | null;
  latency_ms: number | null;
  created_at: string;
}

export default function RunbookLogViewer() {
  const { t } = useI18n();
  const [runId, setRunId] = useState('');
  const [loading, setLoading] = useState(false);
  const [run, setRun] = useState<RunRow | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [searched, setSearched] = useState(false);

  const search = async () => {
    const id = runId.trim();
    if (!id || !supabase) return;
    setLoading(true);
    setSearched(true);

    const [runRes, eventsRes] = await Promise.all([
      supabase
        .from('ai_agent_runs')
        .select('id,agent_slug,provider,model,status,latency_ms,error_code,fallback_used,started_at,finished_at')
        .eq('id', id)
        .maybeSingle(),
      supabase
        .from('ai_usage_events')
        .select('id,run_id,event_type,provider,model,success,error_code,latency_ms,created_at')
        .eq('run_id', id)
        .order('created_at', { ascending: true }),
    ]);

    setLoading(false);

    if (runRes.error) {
      toast.error(runRes.error.message);
      return;
    }
    if (eventsRes.error) {
      toast.error(eventsRes.error.message);
      return;
    }

    setRun(runRes.data as RunRow | null);
    setEvents((eventsRes.data ?? []) as EventRow[]);
  };

  return (
    <Card data-testid="runbook-log-viewer">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{t('admin.ai.runbook.logViewerTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="run_id (UUID)"
            value={runId}
            onChange={(e) => setRunId(e.target.value)}
            className="font-mono text-xs"
            data-testid="runbook-run-id-input"
          />
          <Button size="sm" onClick={() => void search()} disabled={loading || !runId.trim()} data-testid="runbook-log-search">
            <Search className="h-4 w-4 mr-1" />
            {t('admin.ai.runbook.logSearch')}
          </Button>
        </div>

        {searched && !loading && !run && (
          <p className="text-xs text-muted-foreground">{t('admin.ai.runbook.logNoResult')}</p>
        )}

        {run && (
          <div className="border border-border rounded p-2 space-y-1 text-xs">
            <div className="font-medium">{t('admin.ai.runbook.logRun')}</div>
            <div className="grid grid-cols-2 gap-1">
              <span className="text-muted-foreground">agent_slug</span>
              <span className="font-mono">{run.agent_slug}</span>
              <span className="text-muted-foreground">provider</span>
              <span className="font-mono">{run.provider}</span>
              <span className="text-muted-foreground">model</span>
              <span className="font-mono">{run.model}</span>
              <span className="text-muted-foreground">status</span>
              <Badge variant={run.status === 'success' ? 'default' : 'destructive'} className="w-fit text-[10px]">
                {run.status}
              </Badge>
              <span className="text-muted-foreground">latency_ms</span>
              <span>{run.latency_ms ?? '—'}</span>
              <span className="text-muted-foreground">fallback_used</span>
              <span>{run.fallback_used ? '✓' : '—'}</span>
              {run.error_code && (
                <>
                  <span className="text-muted-foreground">error_code</span>
                  <span className="text-destructive font-mono">{run.error_code}</span>
                </>
              )}
              <span className="text-muted-foreground">started_at</span>
              <span className="font-mono text-[10px]">{run.started_at}</span>
              {run.finished_at && (
                <>
                  <span className="text-muted-foreground">finished_at</span>
                  <span className="font-mono text-[10px]">{run.finished_at}</span>
                </>
              )}
            </div>
          </div>
        )}

        {events.length > 0 && (
          <div className="border border-border rounded p-2 space-y-2 text-xs">
            <div className="font-medium">{t('admin.ai.runbook.logEvents')} ({events.length})</div>
            {events.map((ev) => (
              <div key={ev.id} className="bg-muted/30 rounded p-1.5 grid grid-cols-2 gap-1">
                <span className="text-muted-foreground">event_type</span>
                <span className="font-mono">{ev.event_type}</span>
                <span className="text-muted-foreground">provider</span>
                <span className="font-mono">{ev.provider}</span>
                <span className="text-muted-foreground">model</span>
                <span className="font-mono">{ev.model}</span>
                <span className="text-muted-foreground">success</span>
                <Badge variant={ev.success ? 'default' : 'destructive'} className="w-fit text-[10px]">
                  {ev.success ? 'true' : 'false'}
                </Badge>
                {ev.error_code && (
                  <>
                    <span className="text-muted-foreground">error_code</span>
                    <span className="text-destructive font-mono">{ev.error_code}</span>
                  </>
                )}
                <span className="text-muted-foreground">latency_ms</span>
                <span>{ev.latency_ms ?? '—'}</span>
                <span className="text-muted-foreground">created_at</span>
                <span className="font-mono text-[10px]">{ev.created_at}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}