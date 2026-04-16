import React from 'react';
import { FileText, Search, Filter, File } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { motion } from 'framer-motion';

const mockDocs = [
  { brand: 'FX', model: 'Impact MKII', type: 'manual', lang: 'EN' },
  { brand: 'FX', model: 'Impact M4', type: 'diagram', lang: 'EN' },
  { brand: 'FX', model: 'Dreamline Classic', type: 'partsList', lang: 'FR' },
  { brand: 'FX', model: 'Impact MKII', type: 'tuning', lang: 'FR' },
];

export default function DocsPage() {
  const { t } = useI18n();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <FileText className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-heading font-bold">{t('docs.title')}</h1>
        </div>
        <p className="text-xs text-muted-foreground">{t('docs.subtitle')}</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          placeholder={t('docs.search')}
          className="w-full bg-muted border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button className="px-3 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary">{t('common.all')}</button>
        <button className="px-3 py-1 rounded-md text-xs font-medium text-muted-foreground hover:bg-muted">{t('docs.types.manual')}</button>
        <button className="px-3 py-1 rounded-md text-xs font-medium text-muted-foreground hover:bg-muted">{t('docs.types.diagram')}</button>
        <button className="px-3 py-1 rounded-md text-xs font-medium text-muted-foreground hover:bg-muted">{t('docs.types.partsList')}</button>
        <button className="px-3 py-1 rounded-md text-xs font-medium text-muted-foreground hover:bg-muted">{t('docs.types.tuning')}</button>
      </div>

      {/* FX Section */}
      <div>
        <h2 className="font-heading font-semibold text-base mb-3">{t('docs.fxSection')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {mockDocs.map((doc, i) => (
            <div key={i} className="surface-elevated p-4 flex items-start gap-3 opacity-60">
              <div className="p-2 rounded-md bg-primary/10 text-primary shrink-0">
                <File className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{doc.brand} {doc.model}</div>
                <div className="flex gap-2 mt-1">
                  <span className="tactical-badge">{t(`docs.types.${doc.type}` as any)}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">{doc.lang}</span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-2 italic">{t('docs.comingSoon')}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
