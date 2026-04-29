import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftRight, ChevronRight } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

/**
 * Hub Réglages — onglet "Conversions" :
 * raccourci vers la page complète /conversions, sans dupliquer la logique.
 * On résume les catégories disponibles pour donner du contexte.
 */
export function ConversionsPanel() {
  const { t } = useI18n();

  const categories = [
    { icon: '⚡', key: 'velocity', labelFr: 'Vitesse', labelEn: 'Velocity' },
    { icon: '💥', key: 'energy', labelFr: 'Énergie', labelEn: 'Energy' },
    { icon: '📏', key: 'distance', labelFr: 'Distance', labelEn: 'Distance' },
    { icon: '⚖️', key: 'weight', labelFr: 'Poids', labelEn: 'Weight' },
    { icon: '🌡', key: 'temperature', labelFr: 'Température', labelEn: 'Temperature' },
    { icon: '🔧', key: 'pressure', labelFr: 'Pression', labelEn: 'Pressure' },
    { icon: '🎯', key: 'correction', labelFr: 'Correction angulaire', labelEn: 'Angular correction' },
  ];

  return (
    <div className="space-y-3">
      <div className="surface-elevated p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-md bg-primary/10 text-primary shrink-0">
            <ArrowLeftRight className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">{t('settings.conversions.title' as any)}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {t('settings.conversions.desc' as any)}
            </div>
          </div>
        </div>
        <Link
          to="/conversions"
          className="mt-3 flex items-center justify-center gap-2 px-3 py-2 bg-primary/10 text-primary rounded-md text-xs font-medium hover:bg-primary/20 transition-colors"
        >
          {t('settings.conversions.open' as any)}
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="surface-elevated p-4 space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2">
          {t('settings.conversions.categories' as any)}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {categories.map((c) => (
            <div key={c.key} className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/30 text-xs">
              <span className="text-base">{c.icon}</span>
              <span className="text-muted-foreground">{c.labelFr === c.labelEn ? c.labelFr : (
                <span className="i18n">{/* fallback bilingual */}{c.labelFr}</span>
              )}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
