import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { History, Star, Trash2, Search, Crosshair, Play } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { sessionStore } from '@/lib/storage';
import { Session } from '@/lib/types';
import { motion } from 'framer-motion';

export default function SessionsPage() {
  const { t } = useI18n();
  const [sessions, setSessions] = useState<Session[]>(sessionStore.getAll());
  const [filter, setFilter] = useState<'all' | 'favorites'>('all');
  const [query, setQuery] = useState('');

  const refresh = () => setSessions(sessionStore.getAll());

  const toggleFav = (id: string) => {
    const s = sessions.find(s => s.id === id);
    if (s) { sessionStore.update(id, { favorite: !s.favorite }); refresh(); }
  };

  const handleDelete = (id: string) => { sessionStore.delete(id); refresh(); };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sessions
      .filter(s => filter === 'favorites' ? s.favorite : true)
      .filter(s => !q || `${s.name} ${s.notes ?? ''} ${s.tags.join(' ')}`.toLowerCase().includes(q))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [sessions, filter, query]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-heading font-bold">{t('sessions.title')}</h1>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setFilter('all')} className={`px-3 py-1 rounded-md text-xs font-medium ${filter === 'all' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>{t('common.all')}</button>
          <button onClick={() => setFilter('favorites')} className={`px-3 py-1 rounded-md text-xs font-medium ${filter === 'favorites' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>★</button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t('sessions.searchPlaceholder')}
          className="w-full bg-muted border border-border rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* CTA */}
      {filtered.length === 0 && sessions.length === 0 && (
        <Link to="/calc" className="surface-elevated p-4 flex items-center gap-3 hover:border-primary/30 transition-colors block text-center">
          <Crosshair className="h-5 w-5 text-primary mx-auto" />
          <span className="text-sm font-medium text-primary">{t('sessions.createFromCalc')}</span>
        </Link>
      )}

      {filtered.length === 0 ? (
        <div className="surface-card p-8 text-center text-muted-foreground text-sm">{t('sessions.noSessions')}</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(s => {
            const advBadges: string[] = [];
            if (s.input.dragModel && s.input.dragModel !== 'G1') advBadges.push(s.input.dragModel);
            if (s.input.focalPlane) advBadges.push(s.input.focalPlane);
            if (s.input.zeroWeather) advBadges.push(t('sessions.badgeZeroWeather'));
            if (s.input.twistRate) advBadges.push(`1:${s.input.twistRate}″`);
            return (
              <div key={s.id} className="surface-elevated p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{s.name}</div>
                    <div className="text-xs text-muted-foreground font-mono mt-1">
                      {s.input.muzzleVelocity} m/s • BC {s.input.bc} • {s.input.projectileWeight} gr • Zero {s.input.zeroRange}m
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {new Date(s.createdAt).toLocaleString()}
                    </div>
                    {(s.tags.length > 0 || advBadges.length > 0) && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {advBadges.map(b => <span key={b} className="tactical-badge">{b}</span>)}
                        {s.tags.map(tag => <span key={tag} className="tactical-badge">{tag}</span>)}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Link
                      to={`/calc?session=${s.id}`}
                      title={t('sessions.openInCalc')}
                      className="p-1.5 rounded hover:bg-primary/10 text-primary"
                    >
                      <Play className="h-4 w-4" />
                    </Link>
                    <button onClick={() => toggleFav(s.id)} className={`p-1.5 rounded ${s.favorite ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}>
                      <Star className="h-4 w-4" fill={s.favorite ? 'currentColor' : 'none'} />
                    </button>
                    <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {/* Quick summary */}
                {s.results.length > 0 && (
                  <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                    {s.results.filter(r => r.range > 0).slice(0, 4).map(r => (
                      <div key={r.range} className="bg-muted rounded p-2">
                        <div className="text-[10px] text-muted-foreground">{r.range}m</div>
                        <div className="text-xs font-mono font-semibold">{r.drop.toFixed(1)}<span className="text-muted-foreground">mm</span></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
