/**
 * AgentForm — create/edit an AI agent config.
 * slug 'cross-validation-strelok-rows' is rejected in creation mode.
 */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getQuatarlyModels } from '@/lib/ai/quatarly-models-cache';
import type { AgentRow } from './AgentsList';

const PROTECTED_SLUG = 'cross-validation-strelok-rows';
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const PROVIDERS = ['quatarly', 'google-direct', 'ollama'] as const;
const GOOGLE_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro-preview',
  'gemini-2.0-flash',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
];

/** Fallback list when Quatarly cache is empty. */
const QUATARLY_FALLBACK = [
  'claude-sonnet-4-6-thinking',
  'claude-haiku-4-5-20251001',
  'claude-opus-4-6',
  'claude-sonnet-4-6',
  'claude-haiku-4-5',
];

/** Returns true if a model supports image inputs. */
function supportsVision(model: string): boolean {
  return (
    /^claude-(sonnet|opus)-/i.test(model) ||
    /^gemini-/i.test(model)
  );
}

/** Returns true if a model is a "thinking" / reasoning variant. */
function isThinking(model: string): boolean {
  return /-thinking($|[-_])/i.test(model);
}

interface Props {
  agent: AgentRow | null; // null = creation
  onCancel: () => void;
  onSaved: () => void;
}

export default function AgentForm({ agent, onCancel, onSaved }: Props) {
  const { t } = useI18n();
  const sb = supabase!;
  const isEdit = !!agent;

  const [slug, setSlug] = useState(agent?.slug ?? '');
  const [displayName, setDisplayName] = useState(agent?.display_name ?? '');
  const [description, setDescription] = useState(agent?.description ?? '');
  const [provider, setProvider] = useState(agent?.provider ?? 'quatarly');
  const [model, setModel] = useState(agent?.model ?? '');
  const [allowFallback, setAllowFallback] = useState(agent?.allow_fallback ?? false);
  const [systemPrompt, setSystemPrompt] = useState(agent?.system_prompt ?? '');
  const [promptVersion, setPromptVersion] = useState(agent?.prompt_version ?? '1.0');
  const [enabled, setEnabled] = useState(agent?.enabled ?? true);
  const [maxPerDay, setMaxPerDay] = useState<number>(
    (agent?.budget_guardrails as any)?.max_per_day ?? 100
  );
  const [saving, setSaving] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);

  // Quatarly models
  const [quatarlyModels, setQuatarlyModels] = useState<string[]>([]);
  useEffect(() => {
    void getQuatarlyModels().then((m) =>
      setQuatarlyModels(m.length > 0 ? m : QUATARLY_FALLBACK),
    );
  }, []);

  const validateSlug = (v: string) => {
    if (!v) { setSlugError(null); return; }
    if (v === PROTECTED_SLUG) {
      setSlugError(t('admin.ai.agents.slugReserved' as any));
    } else if (!SLUG_RE.test(v)) {
      setSlugError(t('admin.ai.agents.slugFormat' as any));
    } else {
      setSlugError(null);
    }
  };

  const modelOptions = provider === 'quatarly'
    ? quatarlyModels
    : provider === 'google-direct'
      ? GOOGLE_MODELS
      : [];

  const save = async () => {
    if (!slug || (!isEdit && slugError)) return;
    if (!displayName) return;
    if (!systemPrompt) return;

    setSaving(true);
    const row = {
      slug,
      display_name: displayName,
      description: description || null,
      provider,
      model,
      allow_fallback: allowFallback,
      system_prompt: systemPrompt,
      prompt_version: promptVersion || '1.0',
      enabled,
      budget_guardrails: { max_per_day: maxPerDay },
    };

    const { error } = await sb
      .from('ai_agent_configs')
      .upsert(row, { onConflict: 'slug' });

    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t('admin.ai.agents.save' as any));
    onSaved();
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">
          {isEdit ? t('admin.ai.agents.edit' as any) : t('admin.ai.agents.new' as any)}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-3">
        {/* Slug */}
        <div className="space-y-1">
          <Label className="text-xs">{t('admin.ai.agents.slug' as any)}</Label>
          <Input
            value={slug}
            onChange={(e) => { setSlug(e.target.value); validateSlug(e.target.value); }}
            disabled={isEdit}
            placeholder="my-agent-slug"
            data-testid="agent-form-slug"
          />
          {slugError && <p className="text-xs text-destructive" data-testid="agent-slug-error">{slugError}</p>}
        </div>

        {/* Display name */}
        <div className="space-y-1">
          <Label className="text-xs">{t('admin.ai.agents.displayName' as any)}</Label>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} data-testid="agent-form-displayName" />
        </div>

        {/* Description */}
        <div className="space-y-1">
          <Label className="text-xs">{t('admin.ai.agents.description' as any) || 'Description'}</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} data-testid="agent-form-description" />
        </div>

        {/* Provider */}
        <div className="space-y-1">
          <Label className="text-xs">{t('admin.ai.agents.provider')}</Label>
          <Select value={provider} onValueChange={(v) => { setProvider(v); setModel(''); }}>
            <SelectTrigger data-testid="agent-form-provider" className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROVIDERS.map((p) => (
                <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Model */}
        <div className="space-y-1">
          <Label className="text-xs">{t('admin.ai.agents.model')}</Label>
          {provider === 'ollama' ? (
            <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="qwen3:14b" data-testid="agent-form-model" />
          ) : (
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger data-testid="agent-form-model" className="h-9 text-xs font-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {modelOptions.map((m) => (
                  <SelectItem key={m} value={m} className="text-xs font-mono">{m}</SelectItem>
                ))}
                {model && !modelOptions.includes(model) && (
                  <SelectItem value={model} className="text-xs font-mono text-muted-foreground">{model} (current)</SelectItem>
                )}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Switches row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center justify-between gap-2 border border-border rounded px-3 py-2">
            <Label className="text-xs">{t('admin.ai.agents.fallback')}</Label>
            <Switch checked={allowFallback} onCheckedChange={setAllowFallback} data-testid="agent-form-fallback" />
          </div>
          <div className="flex items-center justify-between gap-2 border border-border rounded px-3 py-2">
            <Label className="text-xs">{t('admin.ai.agents.enabled')}</Label>
            <Switch checked={enabled} onCheckedChange={setEnabled} data-testid="agent-form-enabled" />
          </div>
        </div>

        {/* System prompt */}
        <div className="space-y-1">
          <Label className="text-xs">{t('admin.ai.agents.systemPrompt' as any)}</Label>
          <Textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} rows={6} className="font-mono text-xs" data-testid="agent-form-systemPrompt" />
        </div>

        {/* Prompt version + quota */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">{t('admin.ai.agents.promptVersion' as any)}</Label>
            <Input value={promptVersion} onChange={(e) => setPromptVersion(e.target.value)} data-testid="agent-form-promptVersion" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('admin.ai.agents.quota' as any)}</Label>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              value={maxPerDay}
              onChange={(e) => { const n = Number(e.target.value); if (Number.isFinite(n) && n >= 0) setMaxPerDay(Math.round(n)); }}
              data-testid="agent-form-quota"
            />
            <p className="text-[10px] text-muted-foreground">0 = {t('admin.ai.agents.noLimit' as any)}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button onClick={() => void save()} disabled={saving || !slug || !displayName || !systemPrompt || (!!slugError && !isEdit)} data-testid="agent-form-save">
            {t('admin.ai.agents.save' as any)}
          </Button>
          <Button variant="ghost" onClick={onCancel} data-testid="agent-form-cancel">
            {t('admin.ai.agents.cancel' as any)}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}