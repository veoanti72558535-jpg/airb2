/**
 * AgentsList — full CRUD list for ai_agent_configs.
 * cross-validation-strelok-rows is always read-only (protected).
 */
import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Pencil, ShieldCheck } from 'lucide-react';
import AgentForm from './AgentForm';

const PROTECTED_SLUG = 'cross-validation-strelok-rows';

export interface AgentRow {
  slug: string;
  display_name: string | null;
  description: string | null;
  provider: string;
  model: string;
  allow_fallback: boolean;
  system_prompt: string | null;
  prompt_version: string | null;
  enabled: boolean;
  budget_guardrails: Record<string, unknown> | null;
}

export default function AgentsList() {
  const { t } = useI18n();
  const sb = supabase!;
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAgent, setEditingAgent] = useState<AgentRow | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await sb
      .from('ai_agent_configs')
      .select('slug, display_name, description, provider, model, allow_fallback, system_prompt, prompt_version, enabled, budget_guardrails')
      .order('slug');
    setLoading(false);
    if (error) {
      toast.error(`${t('admin.ai.agents.loadError')}: ${error.message}`);
      return;
    }
    setAgents((data ?? []) as AgentRow[]);
  }, [sb, t]);

  useEffect(() => { void load(); }, [load]);

  const toggleEnabled = async (slug: string, enabled: boolean) => {
    if (slug === PROTECTED_SLUG) return;
    const { error } = await sb
      .from('ai_agent_configs')
      .update({ enabled })
      .eq('slug', slug);
    if (error) {
      toast.error(error.message);
      return;
    }
    setAgents((prev) => prev.map((a) => a.slug === slug ? { ...a, enabled } : a));
  };

  const handleSaved = () => {
    setEditingAgent(null);
    setCreating(false);
    void load();
  };

  if (editingAgent || creating) {
    return (
      <AgentForm
        agent={editingAgent}
        onCancel={() => { setEditingAgent(null); setCreating(false); }}
        onSaved={handleSaved}
      />
    );
  }

  const getQuota = (a: AgentRow): string => {
    const max = (a.budget_guardrails as any)?.max_per_day;
    if (max === undefined || max === null || max === 0) return t('admin.ai.agents.noLimit' as any);
    return String(max);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{t('admin.ai.agents.list' as any)}</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setCreating(true)} data-testid="agent-new">
            <Plus className="h-3.5 w-3.5 mr-1" />
            {t('admin.ai.agents.new' as any)}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        {loading ? (
          <p className="text-xs text-muted-foreground">…</p>
        ) : agents.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t('admin.ai.agents.empty')}</p>
        ) : (
          <div className="space-y-2">
            {agents.map((a) => {
              const isProtected = a.slug === PROTECTED_SLUG;
              return (
                <div key={a.slug} className="border border-border rounded p-2 text-xs space-y-1" data-testid={`agent-row-${a.slug}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono font-medium truncate">{a.display_name || a.slug}</span>
                      {isProtected && (
                        <Badge variant="outline" className="gap-1 shrink-0" data-testid="agent-protected-badge">
                          <ShieldCheck className="h-3 w-3" />
                          {t('admin.ai.agents.protected' as any)}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!isProtected && (
                        <>
                          <Switch
                            checked={a.enabled}
                            onCheckedChange={(v) => void toggleEnabled(a.slug, v)}
                            data-testid={`agent-toggle-${a.slug}`}
                          />
                          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingAgent(a)} data-testid={`agent-edit-${a.slug}`}>
                            <Pencil className="h-3 w-3 mr-1" />
                            {t('admin.ai.agents.edit' as any)}
                          </Button>
                        </>
                      )}
                      {isProtected && (
                        <Badge variant={a.enabled ? 'default' : 'secondary'}>
                          {a.enabled ? t('admin.ai.agents.enabled') : t('admin.ai.agents.disabled')}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 text-muted-foreground">
                    <span>{t('admin.ai.agents.provider')}: <span className="text-foreground font-mono">{a.provider || '—'}</span></span>
                    <span>{t('admin.ai.agents.model')}: <span className="text-foreground font-mono">{a.model || '—'}</span></span>
                    <span>{t('admin.ai.agents.fallback')}: {a.allow_fallback ? '✓' : '✗'}</span>
                    <span>{t('admin.ai.agents.quota' as any)}: <span className="text-foreground">{getQuota(a)}</span></span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}