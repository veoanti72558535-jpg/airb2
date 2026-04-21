/**
 * Carte Ollama — settings + test connexion.
 */
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Wifi, WifiOff } from 'lucide-react';
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

export function AiOllamaCard({
  enabled, baseUrl, model,
  onEnabledChange, onBaseUrlChange, onModelChange,
  disabled, testResult, onTest, testing,
}: Props) {
  const { t } = useI18n();

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
            {onTest && (
              <Button size="sm" variant="outline" onClick={onTest} disabled={testing || disabled}>
                {testing ? t('admin.ai.ollama.testRunning') : t('admin.ai.ollama.testConnection')}
              </Button>
            )}
            {testResult && (
              <div className="border border-border rounded p-2 text-xs space-y-1">
                <div className="flex items-center gap-2">
                  {testResult.reachable
                    ? <><Wifi className="h-3 w-3 text-green-500" /><Badge variant="default">{t('admin.ai.ollama.reachable')}</Badge></>
                    : <><WifiOff className="h-3 w-3 text-destructive" /><Badge variant="destructive">{t('admin.ai.ollama.unreachable')}</Badge></>
                  }
                </div>
                {testResult.reachable && testResult.models.length > 0 && (
                  <div>
                    <span className="text-muted-foreground">{t('admin.ai.ollama.models')}: </span>
                    <span className="font-mono">{testResult.models.join(', ')}</span>
                  </div>
                )}
                {testResult.error && (
                  <div className="text-destructive font-mono">{testResult.error}</div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}