/**
 * P1 — Session report generator.
 * Sends a structured snapshot of the session, displays the Markdown response in a modal.
 * Includes a "Download as PDF" action via jsPDF (text-only, lightweight).
 */
import { useCallback, useState } from 'react';
import { jsPDF } from 'jspdf';
import { FileText, Download, Loader2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth-context';
import { queryAIWithCache, invalidateCache, buildCacheKey } from '@/lib/ai/agent-cache';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Session } from '@/lib/types';
import { SimpleMarkdown } from './SimpleMarkdown';

interface Props {
  session: Session;
  lang?: string;
}

function buildPrompt(session: Session, language: string): string {
  const i = session.input;
  const r = session.results ?? [];
  const keyDistances = [25, 50, 75, 100].filter(d => r.some(x => x.range === d));
  const rows = keyDistances
    .map(d => {
      const row = r.find(x => x.range === d)!;
      return `${d}m: drop ${row.drop.toFixed(1)}mm, v ${row.velocity.toFixed(1)}m/s, E ${row.energy.toFixed(1)}J`;
    })
    .join(' | ');
  return (
    `Session: ${session.name ?? session.id} | ` +
    `Projectile: ${i.weight}gr BC ${i.bc} (${i.bcModel}) | ` +
    `V0: ${i.muzzleVelocity}m/s | ` +
    `Zéro: ${i.zeroRange}m | ` +
    `SightHeight: ${i.sightHeight}mm | ` +
    `T: ${i.temperature}°C, P: ${i.pressure}hPa, H: ${i.humidity}% | ` +
    `Vent: ${i.windSpeed}m/s @${i.windAngle}° | ` +
    `Distances clés: ${rows || 'n/a'} | ` +
    `Langue: ${language}`;
  );
}

export function SessionReportButton({ session, lang }: Props) {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const language = lang ?? locale;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const prompt = buildPrompt(session, language);

  const run = useCallback(
    async (force: boolean) => {
      setLoading(true);
      if (force && user?.id) {
        await invalidateCache(
          'session-report-generator',
          user.id,
          buildCacheKey('session-report-generator', prompt),
        );
      }
      const res = await queryAIWithCache(
        { agent_slug: 'session-report-generator', prompt, forceRefresh: force },
        user?.id ?? '',
      );
      setLoading(false);
      if (res.ok) {
        setText(res.data.text);
        setFromCache(res.data.fromCache);
      } else {
        setText(t('shotLineExplainer.error'));
        setFromCache(false);
      }
    },
    [prompt, user?.id, t],
  );

  const handleOpen = () => {
    setOpen(true);
    if (text == null) void run(false);
  };

  const handlePdf = () => {
    if (!text) return;
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    const margin = 15;
    pdf.setFontSize(14);
    pdf.text(`${t('agents2.sessionReport' as any)} — ${session.name ?? session.id}`, margin, 20);
    pdf.setFontSize(10);
    const lines = pdf.splitTextToSize(text, 180);
    pdf.text(lines, margin, 30);
    pdf.save(`session-report-${(session.name ?? session.id).replace(/\W+/g, '-')}.pdf`);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        data-testid="session-report-btn"
        className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border border-primary/30 text-primary/80 hover:bg-primary/10"
      >
        <FileText className="h-3 w-3" />
        {t('agents2.sessionReport' as any)}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('agents2.sessionReport' as any)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {loading && (
              <div data-testid="session-report-loading" className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('shotLineExplainer.loading')}
              </div>
            )}
            {text && (
              <>
                <div data-testid="session-report-content" className="rounded-md border border-border bg-card/50 p-3">
                  <SimpleMarkdown source={text} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handlePdf}
                    data-testid="session-report-pdf"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border text-xs hover:bg-muted"
                  >
                    <Download className="h-3 w-3" />
                    {t('agents2.exportPdf' as any)}
                  </button>
                  <button
                    type="button"
                    onClick={() => void run(true)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border text-xs hover:bg-muted"
                  >
                    {t('agentButton.refresh' as any)}
                  </button>
                  {fromCache && (
                    <span data-testid="session-report-cache" className="text-[10px] text-muted-foreground self-center">
                      💾 {t('agentButton.fromCache' as any)}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}