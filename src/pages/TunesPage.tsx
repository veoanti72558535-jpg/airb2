import React from 'react';
import { Music, Plus } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { tuneStore, airgunStore } from '@/lib/storage';
import { motion } from 'framer-motion';
import { useUnits } from '@/hooks/use-units';

export default function TunesPage() {
  const { t } = useI18n();
  const { display, symbol } = useUnits();
  const tunes = tuneStore.getAll();
  const airguns = airgunStore.getAll();

  const getAirgunName = (id: string) => {
    const a = airguns.find(a => a.id === id);
    return a ? `${a.brand} ${a.model}` : '—';
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Music className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-heading font-bold">{t('tunes.title')}</h1>
        </div>
        <button className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium flex items-center gap-1 hover:opacity-90">
          <Plus className="h-4 w-4" />{t('tunes.add')}
        </button>
      </div>

      {tunes.length === 0 ? (
        <div className="surface-card p-8 text-center text-muted-foreground text-sm">{t('common.noData')}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {tunes.map(tune => (
            <div key={tune.id} className="surface-elevated p-4">
              <div className="font-semibold text-sm">{tune.name}</div>
              <div className="text-xs text-muted-foreground mt-1 font-mono">
                {getAirgunName(tune.airgunId)}
                {tune.nominalVelocity != null && ` • ${display('velocity', tune.nominalVelocity).toFixed(1)} ${symbol('velocity')}`}
              </div>
              {tune.notes && <p className="text-xs text-muted-foreground mt-2 italic">{tune.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
