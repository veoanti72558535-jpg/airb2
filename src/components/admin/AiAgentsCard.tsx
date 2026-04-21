/**
 * Carte agents IA — lecture seule depuis `ai_agent_configs`.
 */
import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AgentRow {
  slug: string;
  provider: string;
  model: string;
  allow_fallback: boolean;
  enabled: boolean;
}

export function AiAgentsCard() {
  const { t } = useI18n();
  const sb = supabase!;
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await sb
      .from('ai_agent_configs')
      .select('slug, provider, model, allow_fallback, enabled')
      .order('slug');
    setLoading(false);
    if (error) {
      toast.error(`${t('admin.ai.agents.loadError')}: ${error.message}`);
      return;
    }
    setAgents((data ?? []) as AgentRow[]);
  }, [sb, t]);

  useEffect(() => { void load(); }, [load]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{t('admin.ai.agents.title')}</CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        {loading ? (
          <p className="text-xs text-muted-foreground">…</p>
        ) : agents.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t('admin.ai.agents.empty')}</p>
        ) : (
          <div className="space-y-2">
            {agents.map((a) => (
              <div key={a.slug} className="border border-border rounded p-2 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-medium">{a.slug}</span>
                  <Badge variant={a.enabled ? 'default' : 'secondary'}>
                    {a.enabled ? t('admin.ai.agents.enabled') : t('admin.ai.agents.disabled')}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-1 text-muted-foreground">
                  <span>{t('admin.ai.agents.provider')}: <span className="text-foreground font-mono">{a.provider || '—'}</span></span>
                  <span>{t('admin.ai.agents.model')}: <span className="text-foreground font-mono">{a.model || '—'}</span></span>
                  <span>{t('admin.ai.agents.fallback')}: {a.allow_fallback ? '✓' : '✗'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}