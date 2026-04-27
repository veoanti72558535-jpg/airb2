/**
 * /admin/ai — IA-1 minimal admin page.
 *
 * Périmètre strict (cf. plan §11) :
 *   - sign-in Supabase (email + mot de passe) si pas de session ;
 *   - lecture/édition des `app_settings` IA minimaux ;
 *   - bouton "Tester providers" (ping `ai-providers-test`).
 *
 * Aucune refonte admin globale, aucune console complexe.
 * Aucune clé provider n'est jamais lue ni affichée — seulement
 * `keyPresent` côté serveur.
 *
 * Si Supabase self-hosted n'est pas configuré côté frontend
 * (`isSupabaseConfigured() === false`), la page affiche un bandeau
 * d'indisponibilité et NE TENTE AUCUN appel.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Bot, KeyRound, RefreshCw, ShieldAlert, LogOut, Server, Clock } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useI18n } from '@/lib/i18n';
import { isSupabaseConfigured, supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AiQuotaCard, type GoogleQuotaData } from '@/components/admin/AiQuotaCard';
import { AiOllamaCard, type OllamaTestResult } from '@/components/admin/AiOllamaCard';
import AgentsList from '@/components/admin/AgentsList';
import LogsViewer from '@/components/admin/LogsViewer';
import AiDailyStats from '@/components/admin/AiDailyStats';
import RunbookChecklist from '@/components/admin/RunbookChecklist';
import RunbookPayloads from '@/components/admin/RunbookPayloads';
import RunbookLogViewer from '@/components/admin/RunbookLogViewer';
import UsageQuotasPanel from '@/components/admin/UsageQuotasPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardCheck } from 'lucide-react';
import { getQuatarlyModels, refreshQuatarlyModels, getCacheFetchedAt } from '@/lib/ai/quatarly-models-cache';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const GOOGLE_DIRECT_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-preview-05-20',
  'gemini-2.5-pro-preview-06-05',
];

interface AiSettingsForm {
  providerPrimary: string;
  modelPrimary: string;
  quatarlyApiUrl: string;
  allowGoogleFallback: boolean;
  googleDirectEnabled: boolean;
  googleDirectModel: string;
  maxImageBytes: number;
  googleMaxRequestsPerDay: number;
  ollamaEnabled: boolean;
  ollamaBaseUrl: string;
  ollamaDefaultModel: string;
}

interface ProvidersTestResult {
  quatarly: { keyPresent: boolean; urlConfigured: boolean; model: string };
  google: { keyPresent: boolean; enabled: boolean; allowedAsFallback: boolean; model: string };
  primaryProvider: string;
  maxImageBytes: number;
  ollama?: { reachable: boolean; models: string[]; error?: string };
  googleQuota?: { used: number; max: number; remaining: number; allowed: boolean };
  quatarlyModels?: string[];
}

const SETTINGS_KEYS: Record<keyof AiSettingsForm, string> = {
  providerPrimary: 'ai.provider_primary',
  modelPrimary: 'ai.provider_model_primary',
  quatarlyApiUrl: 'ai.quatarly_api_url',
  allowGoogleFallback: 'ai.allow_google_fallback',
  googleDirectEnabled: 'ai.google_direct_enabled',
  googleDirectModel: 'ai.google_direct_model',
  maxImageBytes: 'ai.max_image_bytes',
  googleMaxRequestsPerDay: 'ai.google_direct_max_requests_per_day',
  ollamaEnabled: 'ai.ollama_enabled',
  ollamaBaseUrl: 'ai.ollama_base_url',
  ollamaDefaultModel: 'ai.ollama_default_model',
};

const DEFAULT_FORM: AiSettingsForm = {
  providerPrimary: 'quatarly',
  modelPrimary: 'claude-sonnet-4',
  quatarlyApiUrl: 'https://api.quatarly.ai/v1/chat/completions',
  allowGoogleFallback: true,
  googleDirectEnabled: true,
  googleDirectModel: 'gemini-2.5-flash',
  maxImageBytes: 4_194_304,
  googleMaxRequestsPerDay: 20,
  ollamaEnabled: false,
  ollamaBaseUrl: 'http://localhost:11434',
  ollamaDefaultModel: 'qwen3:14b',
};

export default function AdminAiPage() {
  const { t } = useI18n();
  const configured = isSupabaseConfigured();

  if (!configured || !supabase) {
    return (
      <div className="space-y-4">
        <PageHeader />
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>{t('admin.ai.unavailable')}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return <AdminAiInner />;
}

function PageHeader() {
  const { t } = useI18n();
  return (
    <header className="space-y-1">
      <div className="flex items-center gap-2">
        <Bot className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-heading font-bold">{t('admin.ai.title')}</h1>
      </div>
    </header>
  );
}

function PageHeaderWithSubtitle() {
  const { t } = useI18n();
  return (
    <header className="space-y-1">
      <div className="flex items-center gap-2">
        <Bot className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-heading font-bold">{t('admin.ai.title')}</h1>
      </div>
      <p className="text-xs text-muted-foreground">{t('admin.ai.subtitle')}</p>
    </header>
  );
}

function AdminAiInner() {
  const { t } = useI18n();
  const sb = supabase!;
  const [session, setSession] = useState<Session | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    let alive = true;
    sb.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session ?? null);
      setBootstrapped(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => {
      setSession(s ?? null);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [sb]);

  if (!bootstrapped) {
    return (
      <div className="space-y-4">
        <PageHeaderWithSubtitle />
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">…</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeaderWithSubtitle />
      {!session ? <SignInCard /> : <AdminAiAuthenticated />}
    </div>
  );
}

function SignInCard() {
  const { t } = useI18n();
  const sb = supabase!;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await sb.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('OK');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" />
          {t('admin.ai.signIn')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription className="text-xs">{t('admin.ai.notAdmin')}</AlertDescription>
        </Alert>
        <form className="space-y-2" onSubmit={submit}>
          <div className="space-y-1">
            <Label htmlFor="ai-admin-email" className="text-xs">
              {t('admin.ai.signInEmail')}
            </Label>
            <Input
              id="ai-admin-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              data-testid="ai-admin-email"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ai-admin-password" className="text-xs">
              {t('admin.ai.signInPassword')}
            </Label>
            <Input
              id="ai-admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              data-testid="ai-admin-password"
            />
          </div>
          <Button type="submit" disabled={busy} data-testid="ai-admin-signin-submit">
            {t('admin.ai.signInSubmit')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function AdminAiAuthenticated() {
  const { t } = useI18n();
  const sb = supabase!;
  const [form, setForm] = useState<AiSettingsForm>(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<ProvidersTestResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [quatarlyModels, setQuatarlyModels] = useState<string[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [cacheFetchedAt, setCacheFetchedAt] = useState<number | null>(null);

  const loadModels = useCallback(async (force = false) => {
    setModelsLoading(true);
    const models = force ? await refreshQuatarlyModels() : await getQuatarlyModels();
    setQuatarlyModels(models);
    setCacheFetchedAt(getCacheFetchedAt());
    setModelsLoading(false);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await sb
      .from('app_settings')
      .select('key,value')
      .in('key', Object.values(SETTINGS_KEYS));
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const map = new Map<string, unknown>();
    for (const row of data ?? []) map.set((row as { key: string }).key, (row as { value: unknown }).value);
    setForm({
      providerPrimary: (map.get(SETTINGS_KEYS.providerPrimary) as string) ?? DEFAULT_FORM.providerPrimary,
      modelPrimary: (map.get(SETTINGS_KEYS.modelPrimary) as string) ?? DEFAULT_FORM.modelPrimary,
      quatarlyApiUrl: (map.get(SETTINGS_KEYS.quatarlyApiUrl) as string) ?? DEFAULT_FORM.quatarlyApiUrl,
      allowGoogleFallback: (map.get(SETTINGS_KEYS.allowGoogleFallback) as boolean) ?? DEFAULT_FORM.allowGoogleFallback,
      googleDirectEnabled: (map.get(SETTINGS_KEYS.googleDirectEnabled) as boolean) ?? DEFAULT_FORM.googleDirectEnabled,
      googleDirectModel: (map.get(SETTINGS_KEYS.googleDirectModel) as string) ?? DEFAULT_FORM.googleDirectModel,
      maxImageBytes: (map.get(SETTINGS_KEYS.maxImageBytes) as number) ?? DEFAULT_FORM.maxImageBytes,
      googleMaxRequestsPerDay: (map.get(SETTINGS_KEYS.googleMaxRequestsPerDay) as number) ?? DEFAULT_FORM.googleMaxRequestsPerDay,
      ollamaEnabled: (map.get(SETTINGS_KEYS.ollamaEnabled) as boolean) ?? DEFAULT_FORM.ollamaEnabled,
      ollamaBaseUrl: (map.get(SETTINGS_KEYS.ollamaBaseUrl) as string) ?? DEFAULT_FORM.ollamaBaseUrl,
      ollamaDefaultModel: (map.get(SETTINGS_KEYS.ollamaDefaultModel) as string) ?? DEFAULT_FORM.ollamaDefaultModel,
    });
  }, [sb]);

  useEffect(() => {
    void load();
    void loadModels();
  }, [load, loadModels]);

  const save = async () => {
    setSaving(true);
    // Upsert in a small batch — `app_settings` est en RLS admin-only
    // côté migration ; tout échec d'autorisation remonte ici.
    const rows = (Object.keys(SETTINGS_KEYS) as Array<keyof AiSettingsForm>).map((k) => ({
      key: SETTINGS_KEYS[k],
      value: form[k],
    }));
    const { error } = await sb.from('app_settings').upsert(rows, { onConflict: 'key' });
    setSaving(false);
    if (error) {
      toast.error(`${t('admin.ai.settings.saveFailed')}: ${error.message}`);
      return;
    }
    toast.success(t('admin.ai.settings.saved'));
  };

  const test = async () => {
    setTesting(true);
    const { data, error } = await sb.functions.invoke('ai-providers-test', { body: {} });
    setTesting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setTestResult(data as ProvidersTestResult);
  };

  const signOut = async () => {
    await sb.auth.signOut();
  };

  const update = <K extends keyof AiSettingsForm>(key: K, value: AiSettingsForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => void load()} data-testid="ai-admin-reload">
          <RefreshCw className="h-4 w-4 mr-1" />
          {t('admin.ai.refresh')}
        </Button>
        <Button size="sm" variant="default" onClick={() => void test()} disabled={testing} data-testid="ai-admin-test">
          <Bot className="h-4 w-4 mr-1" />
          {testing ? t('admin.ai.testRunning') : t('admin.ai.testProviders')}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => void signOut()} className="ml-auto">
          <LogOut className="h-4 w-4 mr-1" />
          {t('admin.ai.signOut')}
        </Button>
      </div>

      <Tabs defaultValue="config" className="w-full">
        <TabsList className="grid grid-cols-2 w-full sm:w-auto">
          <TabsTrigger value="config" data-testid="tab-config">
            {t('admin.ai.usage.tabConfig')}
          </TabsTrigger>
          <TabsTrigger value="usage" data-testid="tab-usage">
            {t('admin.ai.usage.tabUsage')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-4 mt-4">
      {testResult && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t('admin.ai.testProviders')}</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 grid grid-cols-2 gap-2 text-xs">
            <ProviderStatusBlock
              label={t('admin.ai.testQuatarly')}
              keyPresent={testResult.quatarly.keyPresent}
              detail={`${testResult.quatarly.model}${testResult.quatarly.urlConfigured ? '' : ' · URL?'}`}
            />
            <ProviderStatusBlock
              label={t('admin.ai.testGoogle')}
              keyPresent={testResult.google.keyPresent}
              detail={`${testResult.google.model}${testResult.google.enabled ? '' : ' · disabled'}`}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">app_settings</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SettingText
            label={t('admin.ai.settings.providerPrimary')}
            value={form.providerPrimary}
            onChange={(v) => update('providerPrimary', v)}
            disabled={loading}
            testId="ai-set-providerPrimary"
          />
          <ModelSelectCard
            label={t('admin.ai.models.quatarlyPrimary')}
            value={form.modelPrimary}
            options={quatarlyModels}
            onChange={(v) => update('modelPrimary', v)}
            disabled={loading}
            modelsLoading={modelsLoading}
            onRefresh={() => void loadModels(true)}
            cacheFetchedAt={cacheFetchedAt}
            testId="ai-set-modelPrimary"
          />
          <SettingText
            label={t('admin.ai.settings.quatarlyApiUrl')}
            value={form.quatarlyApiUrl}
            onChange={(v) => update('quatarlyApiUrl', v)}
            disabled={loading}
            testId="ai-set-quatarlyApiUrl"
            wide
          />
          <ModelSelectCard
            label={t('admin.ai.models.googleFallback')}
            value={form.googleDirectModel}
            options={GOOGLE_DIRECT_MODELS}
            onChange={(v) => update('googleDirectModel', v)}
            disabled={loading}
            testId="ai-set-googleDirectModel"
          />
          <SettingNumber
            label={t('admin.ai.settings.maxImageBytes')}
            value={form.maxImageBytes}
            onChange={(v) => update('maxImageBytes', v)}
            disabled={loading}
            testId="ai-set-maxImageBytes"
          />
          <SettingSwitch
            label={t('admin.ai.settings.allowGoogleFallback')}
            value={form.allowGoogleFallback}
            onChange={(v) => update('allowGoogleFallback', v)}
            disabled={loading}
            testId="ai-set-allowGoogleFallback"
          />
          <SettingSwitch
            label={t('admin.ai.settings.googleDirectEnabled')}
            value={form.googleDirectEnabled}
            onChange={(v) => update('googleDirectEnabled', v)}
            disabled={loading}
            testId="ai-set-googleDirectEnabled"
          />
          <SettingNumber
            label={t('admin.ai.settings.googleMaxRequestsPerDay')}
            value={form.googleMaxRequestsPerDay}
            onChange={(v) => update('googleMaxRequestsPerDay', v)}
            disabled={loading}
            testId="ai-set-googleMaxRequestsPerDay"
          />
          <div className="sm:col-span-2 pt-1">
            <Button onClick={() => void save()} disabled={saving || loading} data-testid="ai-admin-save">
              {t('common.save')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* IA2 — Quota Google */}
      <AiQuotaCard quota={testResult?.googleQuota as GoogleQuotaData ?? null} />

      {/* IA2 — Ollama */}
      <AiOllamaCard
        enabled={form.ollamaEnabled}
        baseUrl={form.ollamaBaseUrl}
        model={form.ollamaDefaultModel}
        onEnabledChange={(v) => update('ollamaEnabled', v)}
        onBaseUrlChange={(v) => update('ollamaBaseUrl', v)}
        onModelChange={(v) => update('ollamaDefaultModel', v)}
        disabled={loading}
        testResult={testResult?.ollama as OllamaTestResult ?? null}
        onTest={() => void test()}
        testing={testing}
      />

      {/* IA2 — Quatarly models (from test result) */}
      {testResult?.quatarlyModels && testResult.quatarlyModels.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t('admin.ai.quatarly.models')}</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="flex flex-wrap gap-1">
              {testResult.quatarlyModels.map((m) => (
                <Badge key={m} variant="secondary" className="font-mono text-[11px]">{m}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* IA2 — Agents */}
      <AgentsList />

      {/* IA2h — Logs */}
      <AiDailyStats />
      <LogsViewer />

      {/* IA2f — Runbook validation dispatcher */}
      <div className="pt-4 border-t border-border space-y-4">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">{t('admin.ai.runbook.sectionTitle')}</h2>
        </div>
        <RunbookChecklist />
        <RunbookPayloads />
        <RunbookLogViewer />
      </div>
        </TabsContent>

        <TabsContent value="usage" className="space-y-4 mt-4">
          <UsageQuotasPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProviderStatusBlock({
  label,
  keyPresent,
  detail,
}: {
  label: string;
  keyPresent: boolean;
  detail: string;
}) {
  const { t } = useI18n();
  return (
    <div className="border border-border rounded p-2">
      <div className="font-medium">{label}</div>
      <div className="mt-1">
        <Badge variant={keyPresent ? 'default' : 'destructive'}>
          {keyPresent ? t('admin.ai.keyPresent') : t('admin.ai.keyMissing')}
        </Badge>
      </div>
      <div className="mt-1 text-muted-foreground font-mono text-[11px]">{detail}</div>
    </div>
  );
}

function SettingText({
  label,
  value,
  onChange,
  disabled,
  testId,
  wide,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  testId?: string;
  wide?: boolean;
}) {
  return (
    <div className={`space-y-1 ${wide ? 'sm:col-span-2' : ''}`}>
      <Label className="text-xs">{label}</Label>
      <Input
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        data-testid={testId}
      />
    </div>
  );
}

function SettingNumber({
  label,
  value,
  onChange,
  disabled,
  testId,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  testId?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        inputMode="numeric"
        value={value}
        disabled={disabled}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(n);
        }}
        data-testid={testId}
      />
    </div>
  );
}

function SettingSwitch({
  label,
  value,
  onChange,
  disabled,
  testId,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  testId?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border border-border rounded px-3 py-2">
      <Label className="text-xs">{label}</Label>
      <Switch
        checked={value}
        disabled={disabled}
        onCheckedChange={onChange}
        data-testid={testId}
      />
    </div>
  );
}

function ModelSelectCard({
  label,
  value,
  options,
  onChange,
  disabled,
  modelsLoading,
  onRefresh,
  cacheFetchedAt,
  testId,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  disabled?: boolean;
  modelsLoading?: boolean;
  onRefresh?: () => void;
  cacheFetchedAt?: number | null;
  testId?: string;
}) {
  const { t } = useI18n();

  const ageText = cacheFetchedAt
    ? (() => {
        const mins = Math.round((Date.now() - cacheFetchedAt) / 60_000);
        if (mins < 1) return `${t('admin.ai.models.lastUpdated' as any)} < 1 min`;
        if (mins < 60) return `${t('admin.ai.models.lastUpdated' as any)} ${mins} min ${t('admin.ai.models.cacheAge' as any)}`;
        const hrs = Math.round(mins / 60);
        return `${t('admin.ai.models.lastUpdated' as any)} ${hrs}h ${t('admin.ai.models.cacheAge' as any)}`;
      })()
    : null;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Label className="text-xs">{label}</Label>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={modelsLoading}
            className="text-muted-foreground hover:text-primary transition-colors"
            title={t('admin.ai.models.refresh' as any)}
          >
            <RefreshCw className={`h-3 w-3 ${modelsLoading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>
      {modelsLoading && options.length === 0 ? (
        <div className="text-xs text-muted-foreground py-1">{t('admin.ai.models.loading' as any)}</div>
      ) : (
        <Select value={value} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger data-testid={testId} className="h-9 text-xs font-mono">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((m) => (
              <SelectItem key={m} value={m} className="text-xs font-mono">
                {m}
              </SelectItem>
            ))}
            {/* Keep current value selectable even if not in list */}
            {value && !options.includes(value) && (
              <SelectItem value={value} className="text-xs font-mono text-muted-foreground">
                {value} (current)
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      )}
      {ageText && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="h-2.5 w-2.5" />
          {ageText}
        </div>
      )}
    </div>
  );
}