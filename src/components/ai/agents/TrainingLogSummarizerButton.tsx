/**
 * P2 — Training log summarizer.
 * Summarises the latest N sessions; displays a Markdown block in a modal.
 */
import { useCallback, useState } from 'react';
import { Calendar, Loader2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth-context';
import { queryAIWithCache } from '@/lib/ai/agent-cache';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Session } from '@/lib/types';
import { SimpleMarkdown } from './SimpleMarkdown';

interface Props {
  sessions: Session[];
  maxSessions?: number;
  lang?: string;
}

function buildPrompt(sessions: Session[], language: string): string {
  const lines = sessions.map(s => {
    const i = s.input;
    const date = s.createdAt ? new Date(s.createdAt).toISOString().slice(0, 10) : '?';
    return `${date} | ${s.name ?? s.id.slice(0, 6)} | ${i.weight}gr BC ${i.bc} | V0 ${i.muzzleVelocity}m/s | T ${i.temperature}°C`;
  });
  return (
    `Sessions:\n${lines.join('\n')}\n` +
    `Nb sessions: ${sessions.length} | ` +
    `Langue: ${language}`
  );
}

export function TrainingLogSummarizerButton({ sessions, maxSessions = 10, lang }: Props) {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const language = lang ?? locale;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState<string | null>(null);

  const slice = sessions.slice(-maxSessions);
  const prompt = buildPrompt(slice, language);

  const run = useCallback(async () => {
    setLoading(true);
    const res = await queryAIWithCache(
      { agent_slug: 'training-log-summarizer', prompt },
      user?.id ?? '',
    );
    setLoading(false);
    setText(res.ok ? res.data.text : t('shotLineExplainer.error'));
  }, [prompt, user?.id, t]);

  const handleOpen = () => {
    setOpen(true);
    if (text == null) void run();
  };

  if (slice.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        data-testid="training-log-btn"
        className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border border-primary/30 text-primary/80 hover:bg-primary/10"
      >
        <Calendar className="h-3 w-3" />
        {t('agents2.trainingLog' as any)}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('agents2.trainingLog' as any)}</DialogTitle>
          </DialogHeader>
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('shotLineExplainer.loading')}
            </div>
          )}
          {text && (
            <div data-testid="training-log-content" className="rounded-md border border-border bg-card/50 p-3">
              <SimpleMarkdown source={text} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}