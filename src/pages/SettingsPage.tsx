/**
 * Hub Réglages unifié — Sprint 2.
 *
 * Onglets : Général · Unités · Affichage · Données · Conversions · IA.
 * État synchronisé avec `?tab=` pour permettre les deep-links
 * (ex : /settings?tab=data depuis l'ancien /admin).
 *
 * Le contenu est éclaté en panneaux dans `src/components/settings/panels/`
 * pour rester maintenable. La console IA complète reste à `/admin/ai` —
 * cet onglet l'expose proprement sans la dupliquer.
 */
import React from 'react';
import { motion } from 'framer-motion';
import {
  Settings, Sliders, Ruler, Palette, Database, ArrowLeftRight, Bot, SlidersHorizontal,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUrlFilter } from '@/hooks/use-url-filter';
import { PreferencesPanel } from '@/components/settings/panels/PreferencesPanel';
import { GeneralPanel } from '@/components/settings/panels/GeneralPanel';
import { UnitsPanel } from '@/components/settings/panels/UnitsPanel';
import { AdvancedPanel } from '@/components/settings/panels/AdvancedPanel';
import { DataPanel } from '@/components/settings/panels/DataPanel';
import { ConversionsPanel } from '@/components/settings/panels/ConversionsPanel';
import { AiPanel } from '@/components/settings/panels/AiPanel';

const TABS = ['preferences', 'general', 'units', 'display', 'data', 'conversions', 'ai'] as const;
type TabKey = typeof TABS[number];

function isTabKey(v: string | null): v is TabKey {
  return TABS.includes((v ?? '') as TabKey);
}

export default function SettingsPage() {
  const { t } = useI18n();
  const [tabParam, setTabParam] = useUrlFilter('tab');
  // Default tab is "preferences" — the unified langue/thème/mode menu.
  // We omit the `?tab=` param when it equals the default to keep URLs clean.
  const active: TabKey = isTabKey(tabParam) ? tabParam : 'preferences';
  const setActive = (k: TabKey) => setTabParam(k === 'preferences' ? null : k);

  const tabMeta: { key: TabKey; icon: React.ComponentType<{ className?: string }>; labelKey: any }[] = [
    { key: 'preferences', icon: SlidersHorizontal, labelKey: 'settings.tabs.preferences' },
    { key: 'general', icon: Sliders, labelKey: 'settings.tabs.general' },
    { key: 'units', icon: Ruler, labelKey: 'settings.tabs.units' },
    { key: 'display', icon: Palette, labelKey: 'settings.tabs.display' },
    { key: 'data', icon: Database, labelKey: 'settings.tabs.data' },
    { key: 'conversions', icon: ArrowLeftRight, labelKey: 'settings.tabs.conversions' },
    { key: 'ai', icon: Bot, labelKey: 'settings.tabs.ai' },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-heading font-bold">{t('settings.title')}</h1>
      </div>

      <Tabs value={active} onValueChange={(v) => setActive(v as TabKey)} className="w-full">
        <TabsList className="w-full h-auto flex-wrap justify-start gap-1 bg-muted/30 p-1">
          {tabMeta.map((tab) => (
            <TabsTrigger
              key={tab.key}
              value={tab.key}
              className="flex items-center gap-1.5 text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            >
              <tab.icon className="h-3.5 w-3.5" />
              <span>{t(tab.labelKey)}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="preferences" className="mt-4"><PreferencesPanel /></TabsContent>
        <TabsContent value="general" className="mt-4"><GeneralPanel /></TabsContent>
        <TabsContent value="units" className="mt-4"><UnitsPanel /></TabsContent>
        <TabsContent value="display" className="mt-4"><AdvancedPanel /></TabsContent>
        <TabsContent value="data" className="mt-4"><DataPanel /></TabsContent>
        <TabsContent value="conversions" className="mt-4"><ConversionsPanel /></TabsContent>
        <TabsContent value="ai" className="mt-4"><AiPanel /></TabsContent>
      </Tabs>
    </motion.div>
  );
}
