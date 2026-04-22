import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';

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

interface Props {
  run: RunRow;
  onClose: () => void;
}

export default function RunDetail({ run, onClose }: Props) {
  const { t } = useI18n();
  const [events, setEvents] = useState<EventRow[]>([]);

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from('ai_usage_events')
      .select('id,run_id,event_type,provider,model,success,error_code,latency_ms,created_at')
      .eq('run_id', run.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => setEvents((data ?? []) as EventRow[]));
  }, [run.id]);

  const statusVariant = run.status === 'success' ? 'default' : run.status === 'error' ? 'destructive' : 'secondary';

  return (
    <div className="border border-border rounded-lg p-4 space-y-4 bg-card" data-testid="run-detail">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t('admin.ai.logs.runDetail')}</h3>
        <Button size="icon" variant="ghost" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>

      <div className="grid grid-cols-2 gap-1 text-xs">
        <span className="text-muted-foreground">id</span>
        <span className="font-mono text-[10px] break-all">{run.id}</span>
        <span className="text-muted-foreground">agent_slug</span>
        <span className="font-mono">{run.agent_slug}</span>
        <span className="text-muted-foreground">provider</span>
        <span className="font-mono">{run.provider}</span>
        <span className="text-muted-foreground">model</span>
        <span className="font-mono">{run.model}</span>
        <span className="text-muted-foreground">status</span>
        <Badge variant={statusVariant} className="w-fit text-[10px]">{run.status}</Badge>
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

      {events.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium">{t('admin.ai.logs.events')} ({events.length})</div>
          {events.map((ev) => (
            <div key={ev.id} className="bg-muted/30 rounded p-2 grid grid-cols-2 gap-1 text-xs" data-testid="run-event">
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
    </div>
  );
}