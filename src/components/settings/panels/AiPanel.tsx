import React from 'react';
import { Link } from 'react-router-dom';
import { Bot, ShieldAlert, ChevronRight, Cpu, MessageCircle, FlaskConical } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { isSupabaseConfigured } from '@/integrations/supabase/client';

/**
 * Hub Réglages — onglet "IA" :
 * - statut Supabase (la console IA complète /admin/ai requiert Supabase) ;
 * - bouton vers la console IA complète (agents, providers, quotas) ;
 * - raccourcis vers les surfaces utilisateur de l'IA (chat, validation).
 *
 * On NE duplique PAS le contenu d'AdminAiPage ici — celle-ci a sa propre
 * logique d'auth Supabase et 700 lignes d'UI. On la garde comme page
 * dédiée et on l'expose proprement depuis le hub.
 */
export function AiPanel() {
  const { t } = useI18n();
  const ready = isSupabaseConfigured();

  return (
    <div className="space-y-3">
      {/* Status banner */}
      <div className="surface-elevated p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-md shrink-0 ${ready ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
            {ready ? <Bot className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">{t('settings.ai')}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {ready ? t('settings.aiDesc') : t('settings.aiRequiresSupabase')}
            </div>
            {ready && (
              <Link
                to="/admin/ai"
                className="mt-3 inline-flex items-center gap-2 px-3 py-2 bg-primary/10 text-primary rounded-md text-xs font-medium hover:bg-primary/20 transition-colors"
                data-testid="settings-open-ai-console"
              >
                <Cpu className="h-3.5 w-3.5" />
                {t('settings.aiConfigure')}
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* User-facing AI surfaces */}
      <div className="surface-elevated p-4 space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1">
          {t('settings.ai.userSurfaces' as any)}
        </div>
        <Link
          to="/chat"
          className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-muted transition-colors"
        >
          <MessageCircle className="h-4 w-4 text-primary" />
          <span className="text-sm flex-1">{t('nav.chat')}</span>
          <ChevronRight className="h-4 w-4 opacity-40" />
        </Link>
        <Link
          to="/cross-validation"
          className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-muted transition-colors"
        >
          <FlaskConical className="h-4 w-4 text-primary" />
          <span className="text-sm flex-1">{t('nav.crossValidation')}</span>
          <ChevronRight className="h-4 w-4 opacity-40" />
        </Link>
      </div>
    </div>
  );
}
