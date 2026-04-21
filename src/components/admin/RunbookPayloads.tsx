/**
 * Copiable JSON payload examples for manual dispatcher validation via curl.
 */
import React from 'react';
import { Copy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { toast } from 'sonner';

interface PayloadBlock {
  titleKey: string;
  body: string;
  expected: string;
}

const PAYLOADS: PayloadBlock[] = [
  {
    titleKey: 'admin.ai.runbook.payload.dispatchQuatarly',
    body: JSON.stringify(
      { agent_slug: 'cross-validation-strelok-rows', prompt: 'Ceci est un test. Reponds { "test": true } en JSON.' },
      null, 2,
    ),
    expected: 'HTTP 200 — provider: "quatarly", fallback_used: false',
  },
  {
    titleKey: 'admin.ai.runbook.payload.dispatchGoogle',
    body: JSON.stringify(
      { agent_slug: 'cross-validation-strelok-rows', prompt: 'Test. Reponds { "test": true }.', provider_override: 'google-direct', model_override: 'gemini-2.5-flash' },
      null, 2,
    ),
    expected: 'HTTP 200 — provider: "google-direct"',
  },
  {
    titleKey: 'admin.ai.runbook.payload.agentMissing',
    body: JSON.stringify(
      { agent_slug: 'agent-qui-nexiste-pas', prompt: 'test' },
      null, 2,
    ),
    expected: 'HTTP 503 — { "error": "agent-disabled" }',
  },
  {
    titleKey: 'admin.ai.runbook.payload.ollamaOverride',
    body: JSON.stringify(
      { agent_slug: 'cross-validation-strelok-rows', prompt: 'test', provider_override: 'ollama' },
      null, 2,
    ),
    expected: 'HTTP 503 — { "error": "ollama-disabled" }',
  },
  {
    titleKey: 'admin.ai.runbook.payload.bodyInvalid',
    body: JSON.stringify({ prompt: 'test' }, null, 2),
    expected: 'HTTP 400 — { "error": "invalid-body" }',
  },
];

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).then(
    () => toast.success('Copied'),
    () => toast.error('Copy failed'),
  );
}

export default function RunbookPayloads() {
  const { t } = useI18n();

  return (
    <Card data-testid="runbook-payloads">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{t('admin.ai.runbook.payloadsTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-3">
        {PAYLOADS.map((p, i) => (
          <div key={i} className="border border-border rounded p-2 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">{t(p.titleKey as any)}</span>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => copyToClipboard(p.body)}
                data-testid={`runbook-copy-${i}`}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <pre className="text-[11px] font-mono bg-muted/50 rounded p-2 overflow-x-auto whitespace-pre-wrap">{p.body}</pre>
            <p className="text-[11px] text-muted-foreground">→ {p.expected}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}