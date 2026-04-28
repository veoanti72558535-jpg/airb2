/**
 * Carte Ollama — settings + test connexion direct (côté client).
 *
 * Le test se fait DIRECTEMENT depuis le navigateur (fetch vers l'URL Ollama),
 * sans passer par l'edge function Supabase. Cela garantit que :
 *   1. Le test fonctionne même sans authentification admin
 *   2. Le test vérifie la connectivité RÉELLE depuis le client
 *   3. Le résultat est immédiat (pas de round-trip Docker)
 */
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export interface OllamaTestResult {
  reachable: boolean;
  models: string[];
  error?: string;
}

interface Props {
  enabled: boolean;
  baseUrl: string;
  model: string;
  onEnabledChange: (v: boolean) => void;
  onBaseUrlChange: (v: string) => void;
  onModelChange: (v: string) => void;
  disabled?: boolean;
  testResult?: OllamaTestResult | null;
  onTest?: () => void;
  testing?: boolean;
}

/**
 * Test direct Ollama depuis le navigateur.
 * Fait un fetch vers /api/tags pour lister les modèles disponibles.
 */
async function testOllamaDirect(baseUrl: string): Promise<OllamaTestResult> {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/tags`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8_000);
    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!resp.ok) {
      return { reachable: false, models: [], error: `HTTP ${resp.status} ${resp.statusText}` };
    }
    const data = await resp.json() as { models?: Array<{ name?: string }> };
    const models = (data.models ?? []).map((m) => m.name).filter(Boolean) as string[];
    return { reachable: true, models };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Distinguish between network errors and timeouts
    if (msg.includes('abort')) {
      return { reachable: false, models: [], error: 'Timeout (8s) — Ollama ne répond pas' };
    }
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
      return {
        reachable: false,
        models: [],
        error: `Connexion refusée — vérifiez que Ollama est démarré sur ${baseUrl} et que OLLAMA_ORIGINS autorise ce domaine`,
      };
    }
    return { reachable: false, models: [], error: msg };
  }
}

export function AiOllamaCard({
  enabled, baseUrl, model,
  onEnabledChange, onBaseUrlChange, onModelChange,
  disabled, testResult: serverTestResult, onTest, testing: serverTesting,
}: Props) {
  const { t } = useI18n();
  const [directResult, setDirectResult] = useState<OllamaTestResult | null>(null);
  const [directTesting, setDirectTesting] = useState(false);

  const handleDirectTest = async () => {
    setDirectTesting(true);
    setDirectResult(null);
    const result = await testOllamaDirect(baseUrl);
    setDirectResult(result);
    setDirectTesting(false);
  };

  // Show direct result if available, otherwise server result
  const displayResult = directResult ?? serverTestResult ?? null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{t('admin.ai.ollama.title')}</CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-3">
        <div className="flex items-center justify-between gap-3 border border-border rounded px-3 py-2">
          <Label className="text-xs">{t('admin.ai.ollama.enabled')}</Label>
          <Switch checked={enabled} disabled={disabled} onCheckedChange={onEnabledChange} />
        </div>
        {enabled && (
          <>
            <div className="space-y-1">
              <Label className="text-xs">{t('admin.ai.ollama.baseUrl')}</Label>
              <Input value={baseUrl} disabled={disabled} onChange={(e) => onBaseUrlChange(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('admin.ai.ollama.model')}</Label>
              <Input value={model} disabled={disabled} onChange={(e) => onModelChange(e.target.value)} />
            </div>

            {/* Direct client-side test button */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => void handleDirectTest()}
              disabled={directTesting || disabled}
            >
              {directTesting && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
              {directTesting
                ? t('admin.ai.ollama.testRunning')
                : `${t('admin.ai.ollama.testConnection')} → ${baseUrl}`}
            </Button>

            {/* Result display */}
            {displayResult && (
              <div className="border border-border rounded p-2 text-xs space-y-1">
                <div className="flex items-center gap-2">
                  {displayResult.reachable
                    ? <><Wifi className="h-3 w-3 text-green-500" /><Badge variant="default">{t('admin.ai.ollama.reachable')}</Badge></>
                    : <><WifiOff className="h-3 w-3 text-destructive" /><Badge variant="destructive">{t('admin.ai.ollama.unreachable')}</Badge></>
                  }
                </div>
                {displayResult.reachable && displayResult.models.length > 0 && (
                  <div>
                    <span className="text-muted-foreground">{t('admin.ai.ollama.models')}: </span>
                    <span className="font-mono">{displayResult.models.join(', ')}</span>
                  </div>
                )}
                {displayResult.error && (
                  <div className="text-destructive font-mono text-[11px] break-all">{displayResult.error}</div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}