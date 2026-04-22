import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';

interface DailyStats {
  total: number;
  success: number;
  google: number;
  fallbacks: number;
}

export default function AiDailyStats() {
  const { t } = useI18n();
  const [stats, setStats] = useState<DailyStats>({ total: 0, success: 0, google: 0, fallbacks: 0 });

  useEffect(() => {
    if (!supabase) return;
    const today = new Date().toISOString().slice(0, 10);
    supabase
      .from('ai_agent_runs')
      .select('status,provider,fallback_used')
      .gte('started_at', `${today}T00:00:00Z`)
      .then(({ data }) => {
        if (!data) return;
        const rows = data as Array<{ status: string; provider: string; fallback_used: boolean }>;
        setStats({
          total: rows.length,
          success: rows.filter((r) => r.status === 'success').length,
          google: rows.filter((r) => r.provider === 'google-direct').length,
          fallbacks: rows.filter((r) => r.fallback_used).length,
        });
      });
  }, []);

  const rate = stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0;

  const cards: Array<{ label: string; value: string | number }> = [
    { label: t('admin.ai.stats.callsToday'), value: stats.total },
    { label: t('admin.ai.stats.successRate'), value: `${rate}%` },
    { label: t('admin.ai.stats.googleCalls'), value: stats.google },
    { label: t('admin.ai.stats.fallbacks'), value: stats.fallbacks },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" data-testid="ai-daily-stats">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold">{c.value}</div>
            <div className="text-xs text-muted-foreground">{c.label}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}