import React, { useState } from 'react';
import { BookOpen, Target, Zap, Eye, Music } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { motion } from 'framer-motion';
import AirgunsPage from './AirgunsPage';
import ProjectilesPage from './ProjectilesPage';
import OpticsPage from './OpticsPage';
import TunesPage from './TunesPage';
import { cn } from '@/lib/utils';

const tabs = [
  { key: 'airguns', icon: Target, labelKey: 'library.tabs.airguns' as const },
  { key: 'tunes', icon: Music, labelKey: 'library.tabs.tunes' as const },
  { key: 'projectiles', icon: Zap, labelKey: 'library.tabs.projectiles' as const },
  { key: 'optics', icon: Eye, labelKey: 'library.tabs.optics' as const },
] as const;

type TabKey = typeof tabs[number]['key'];

export default function LibraryPage() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<TabKey>('airguns');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <BookOpen className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-heading font-bold">{t('library.title')}</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors',
              activeTab === tab.key
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'airguns' && <AirgunsPage />}
      {activeTab === 'tunes' && <TunesPage />}
      {activeTab === 'projectiles' && <ProjectilesPage />}
      {activeTab === 'optics' && <OpticsPage />}
    </motion.div>
  );
}
