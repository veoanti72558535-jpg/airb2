import React, { useState, useMemo } from 'react';
import { Search, Target, Zap, History, Eye, FileText } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { airgunStore, projectileStore, sessionStore, opticStore } from '@/lib/storage';
import { motion } from 'framer-motion';

export default function SearchPage() {
  const { t } = useI18n();
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    if (query.length < 2) return null;
    const q = query.toLowerCase();
    return {
      airguns: airgunStore.getAll().filter(a => `${a.brand} ${a.model} ${a.caliber}`.toLowerCase().includes(q)),
      projectiles: projectileStore.getAll().filter(p => `${p.brand} ${p.model} ${p.caliber}`.toLowerCase().includes(q)),
      sessions: sessionStore.getAll().filter(s => `${s.name} ${s.tags.join(' ')}`.toLowerCase().includes(q)),
      optics: opticStore.getAll().filter(o => `${o.name} ${o.type}`.toLowerCase().includes(q)),
    };
  }, [query]);

  const totalResults = results ? Object.values(results).reduce((sum, arr) => sum + arr.length, 0) : 0;

  const categories = [
    { key: 'airguns' as const, icon: Target, label: t('search.categories.airguns') },
    { key: 'projectiles' as const, icon: Zap, label: t('search.categories.projectiles') },
    { key: 'sessions' as const, icon: History, label: t('search.categories.sessions') },
    { key: 'optics' as const, icon: Eye, label: t('search.categories.optics') },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div className="flex items-center gap-2 mb-1">
        <Search className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-heading font-bold">{t('search.title')}</h1>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t('search.placeholder')}
          className="w-full bg-muted border border-border rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          autoFocus
        />
      </div>

      {!results && (
        <div className="surface-card p-8 text-center text-muted-foreground text-sm">
          {t('search.hint')}
        </div>
      )}

      {results && totalResults === 0 && (
        <div className="surface-card p-8 text-center text-muted-foreground text-sm">
          {t('search.noResults')}
        </div>
      )}

      {results && totalResults > 0 && (
        <div className="space-y-4">
          {categories.map(cat => {
            const items = results[cat.key];
            if (items.length === 0) return null;
            return (
              <div key={cat.key}>
                <h2 className="font-heading font-semibold text-sm flex items-center gap-2 mb-2">
                  <cat.icon className="h-4 w-4 text-primary" />
                  {cat.label}
                  <span className="text-xs text-muted-foreground">({items.length})</span>
                </h2>
                <div className="space-y-1">
                  {items.slice(0, 5).map((item: any) => (
                    <div key={item.id} className="surface-card p-3">
                      <div className="text-sm font-medium">
                        {item.brand ? `${item.brand} ${item.model}` : item.name}
                      </div>
                      {item.caliber && <span className="tactical-badge text-[10px] mt-1 inline-block">{item.caliber}</span>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
