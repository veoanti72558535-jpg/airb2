import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import RunDetail from './RunDetail';

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

const PAGE_SIZE = 20;

export default function LogsViewer() {
  const { t } = useI18n();
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [selectedRun, setSelectedRun] = useState<RunRow | null>(null);

  // filters
  const [agentFilter, setAgentFilter] = useState('__all__');
  const [statusFilter, setStatusFilter] = useState('__all__');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [slugs, setSlugs] = useState<string[]>([]);

  // load distinct agent slugs
  useEffect(() => {
    if (!supabase) return;
    supabase
      .from('ai_agent_runs')
      .select('agent_slug')
      .then(({ data }) => {
        if (!data) return;
        const unique = [...new Set((data as Array<{ agent_slug: string }>).map((r) => r.agent_slug))];
        unique.sort();
        setSlugs(unique);
      });
  }, []);

  const load = useCallback(async (p: number) => {
    if (!supabase) return;
    setLoading(true);
    let q = supabase
      .from('ai_agent_runs')
      .select('id,agent_slug,provider,model,status,latency_ms,error_code,fallback_used,started_at,finished_at')
      .order('started_at', { ascending: false })
      .range(p * PAGE_SIZE, (p + 1) * PAGE_SIZE); // fetch 1 extra to detect hasMore

    if (agentFilter !== '__all__') q = q.eq('agent_slug', agentFilter);
    if (statusFilter !== '__all__') q = q.eq('status', statusFilter);
    if (dateFrom) q = q.gte('started_at', `${dateFrom}T00:00:00Z`);
    if (dateTo) q = q.lte('started_at', `${dateTo}T23:59:59Z`);

    const { data } = await q;
    setLoading(false);
    const rows = (data ?? []) as RunRow[];
    setHasMore(rows.length > PAGE_SIZE);
    setRuns(rows.slice(0, PAGE_SIZE));
    setPage(p);
  }, [agentFilter, statusFilter, dateFrom, dateTo]);

  useEffect(() => { void load(0); }, [load]);

  const statusColor = (s: string) =>
    s === 'success' ? 'default' : s === 'error' ? 'destructive' : 'secondary';

  return (
    <Card data-testid="logs-viewer">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{t('admin.ai.logs.title')}</CardTitle>
          <Button size="sm" variant="ghost" onClick={() => void load(page)} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="ml-1 text-xs">{t('admin.ai.logs.refresh')}</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-3">
        {/* Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">{t('admin.ai.logs.agent')}</Label>
            <Select value={agentFilter} onValueChange={setAgentFilter}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__" className="text-xs">All</SelectItem>
                {slugs.map((s) => <SelectItem key={s} value={s} className="text-xs font-mono">{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('admin.ai.logs.status')}</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__" className="text-xs">All</SelectItem>
                <SelectItem value="success" className="text-xs">success</SelectItem>
                <SelectItem value="error" className="text-xs">error</SelectItem>
                <SelectItem value="pending" className="text-xs">pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input type="date" className="h-8 text-xs" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input type="date" className="h-8 text-xs" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>

        {/* Table */}
        {runs.length === 0 && !loading && (
          <p className="text-xs text-muted-foreground">{t('admin.ai.logs.noLogs')}</p>
        )}

        {runs.length > 0 && (
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-muted-foreground text-left">
                  <th className="py-1 pr-2">{t('admin.ai.logs.agent')}</th>
                  <th className="py-1 pr-2">{t('admin.ai.logs.provider')}</th>
                  <th className="py-1 pr-2 hidden sm:table-cell">Model</th>
                  <th className="py-1 pr-2">{t('admin.ai.logs.status')}</th>
                  <th className="py-1 pr-2">{t('admin.ai.logs.latency')}</th>
                  <th className="py-1 pr-2 hidden sm:table-cell">{t('admin.ai.logs.fallback')}</th>
                  <th className="py-1">Date</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-border/50 cursor-pointer hover:bg-muted/40 transition-colors"
                    onClick={() => setSelectedRun(r)}
                    data-testid="log-row"
                  >
                    <td className="py-1.5 pr-2 font-mono">{r.agent_slug}</td>
                    <td className="py-1.5 pr-2">{r.provider}</td>
                    <td className="py-1.5 pr-2 hidden sm:table-cell font-mono">{r.model}</td>
                    <td className="py-1.5 pr-2">
                      <Badge variant={statusColor(r.status)} className="text-[10px]">{r.status}</Badge>
                    </td>
                    <td className="py-1.5 pr-2">{r.latency_ms != null ? `${r.latency_ms}ms` : '—'}</td>
                    <td className="py-1.5 pr-2 hidden sm:table-cell">{r.fallback_used ? '✓' : '—'}</td>
                    <td className="py-1.5 font-mono text-[10px]">{r.started_at?.slice(0, 16).replace('T', ' ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => void load(page - 1)}>
            ← Prev
          </Button>
          <span className="text-xs text-muted-foreground">Page {page + 1}</span>
          <Button size="sm" variant="outline" disabled={!hasMore} onClick={() => void load(page + 1)}>
            Next →
          </Button>
        </div>

        {/* Run detail */}
        {selectedRun && <RunDetail run={selectedRun} onClose={() => setSelectedRun(null)} />}
      </CardContent>
    </Card>
  );
}