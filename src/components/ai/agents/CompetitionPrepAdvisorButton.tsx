/**
 * P3 — Competition prep advisor.
 * Inputs: comp type, expected distances, expected weather, gun + projectile.
 * Renders Markdown response inline.
 */
import { useCallback, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth-context';
import { queryAIWithCache } from '@/lib/ai/agent-cache';
import { SimpleMarkdown } from './SimpleMarkdown';

type CompType = 'ft' | 'hft' | 'benchrest';

interface Props {
  lang?: string;
}

export function CompetitionPrepAdvisorButton({ lang }: Props) {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const language = lang ?? locale;
  const [type, setType] = useState<CompType>('ft');
  const [distances, setDistances] = useState('15-50');
  const [weather, setWeather] = useState('');
  const [gun, setGun] = useState('');
  const [projectile, setProjectile] = useState('');
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState<string | null>(null);

  const typeLabel: Record<CompType, string> = {
    ft: 'Field Target',
    hft: 'Hunter Field Target',
    benchrest: 'Benchrest',
  };

  const ready = !!gun && !!projectile && !!distances;

  const run = useCallback(async () => {
    setLoading(true);
    const prompt =
      `Compétition: ${typeLabel[type]} | ` +
      `Distances: ${distances} m | ` +
      `Météo prévue: ${weather || 'non précisée'} | ` +
      `Arme: ${gun} | ` +
      `Projectile: ${projectile} | ` +
      `Langue: ${language}`;
    const res = await queryAIWithCache(
      { agent_slug: 'competition-prep-advisor', prompt },
      user?.id ?? '',
    );
    setLoading(false);
    setText(res.ok ? res.data.text : t('shotLineExplainer.error'));
  }, [type, distances, weather, gun, projectile, language, user?.id, t]);

  const inputCls = 'w-full bg-muted border border-border rounded-md px-2 py-1.5 text-sm font-mono';

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label className="text-xs text-muted-foreground">
          Type
          <select value={type} onChange={e => setType(e.target.value as CompType)} className={inputCls} data-testid="comp-type">
            <option value="ft">Field Target</option>
            <option value="hft">Hunter Field Target</option>
            <option value="benchrest">Benchrest</option>
          </select>
        </label>
        <label className="text-xs text-muted-foreground">
          Distances (m)
          <input value={distances} onChange={e => setDistances(e.target.value)} className={inputCls} data-testid="comp-distances" />
        </label>
        <label className="text-xs text-muted-foreground">
          {t('agents2.expectedWeather' as any)}
          <input value={weather} onChange={e => setWeather(e.target.value)} className={inputCls} placeholder="ex: 18°C, 1015hPa" />
        </label>
        <label className="text-xs text-muted-foreground">
          {t('airguns.title')}
          <input value={gun} onChange={e => setGun(e.target.value)} className={inputCls} data-testid="comp-gun" />
        </label>
        <label className="text-xs text-muted-foreground sm:col-span-2">
          {t('projectiles.title')}
          <input value={projectile} onChange={e => setProjectile(e.target.value)} className={inputCls} data-testid="comp-projectile" />
        </label>
      </div>

      <button
        type="button"
        onClick={() => void run()}
        disabled={!ready || loading}
        data-testid="comp-run"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm hover:opacity-90 disabled:opacity-40"
      >
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
        {t('agents2.competitionPrep' as any)}
      </button>

      {text && (
        <div data-testid="comp-content" className="rounded-md border border-border bg-card/50 p-3">
          <SimpleMarkdown source={text} />
        </div>
      )}
    </div>
  );
}