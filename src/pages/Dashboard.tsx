import React from 'react';
import { Link } from 'react-router-dom';
import { Crosshair, Target, Eye, History, ArrowLeftRight, Zap, BarChart3, Star, FileText, BookOpen, Search } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { airgunStore, projectileStore, opticStore, sessionStore } from '@/lib/storage';
import { motion } from 'framer-motion';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

export default function Dashboard() {
  const { t } = useI18n();
  const airguns = airgunStore.getAll();
  const projectiles = projectileStore.getAll();
  const optics = opticStore.getAll();
  const sessions = sessionStore.getAll();
  const favorites = sessions.filter(s => s.favorite);

  const stats = [
    { label: t('dashboard.stats.airguns'), value: airguns.length, icon: Target, color: 'text-primary' },
    { label: t('dashboard.stats.projectiles'), value: projectiles.length, icon: Zap, color: 'text-tactical' },
    { label: t('dashboard.stats.optics'), value: optics.length, icon: Eye, color: 'text-accent' },
    { label: t('dashboard.stats.sessions'), value: sessions.length, icon: BarChart3, color: 'text-primary' },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Hero */}
      <motion.div variants={item} className="py-4">
        <div className="flex items-center gap-2 mb-2">
          <Crosshair className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-heading font-bold tracking-tight">
            Air<span className="text-gradient">Ballistik</span>
          </h1>
        </div>
        <p className="text-muted-foreground text-sm">{t('dashboard.subtitle')}</p>

        <Link
          to="/calc"
          className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          <Crosshair className="h-4 w-4" />
          {t('dashboard.quickCalc')}
        </Link>
      </motion.div>

      {/* Stats */}
      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="surface-elevated p-3 text-center">
            <s.icon className={`h-4 w-4 mx-auto mb-1.5 ${s.color}`} />
            <div className="text-xl font-mono font-bold">{s.value}</div>
            <div className="text-[11px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </motion.div>

      {/* Recent Sessions */}
      <motion.div variants={item}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading font-semibold text-base flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            {t('dashboard.recentSessions')}
          </h2>
          {sessions.length > 0 && (
            <Link to="/sessions" className="text-xs text-primary font-medium hover:underline">{t('common.viewAll')}</Link>
          )}
        </div>
        {sessions.length === 0 ? (
          <div className="surface-card p-6 text-center text-muted-foreground text-sm">
            {t('dashboard.noSessions')}
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.slice(-3).reverse().map(session => (
              <Link
                key={session.id}
                to="/sessions"
                className="surface-card p-3 flex items-center justify-between hover:border-primary/30 transition-colors block"
              >
                <div>
                  <div className="text-sm font-medium">{session.name}</div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {new Date(session.createdAt).toLocaleDateString()} — {session.input.muzzleVelocity} m/s
                  </div>
                </div>
                {session.favorite && <Star className="h-3.5 w-3.5 text-primary fill-primary" />}
              </Link>
            ))}
          </div>
        )}
      </motion.div>

      {/* Favorites */}
      <motion.div variants={item}>
        <h2 className="font-heading font-semibold text-base flex items-center gap-2 mb-3">
          <Star className="h-4 w-4 text-primary" />
          {t('dashboard.favorites')}
        </h2>
        {favorites.length === 0 ? (
          <div className="surface-card p-6 text-center text-muted-foreground text-sm">
            {t('dashboard.noFavorites')}
          </div>
        ) : (
          <div className="space-y-2">
            {favorites.slice(0, 3).map(fav => (
              <Link key={fav.id} to="/sessions" className="surface-card p-3 block hover:border-primary/30 transition-colors">
                <div className="text-sm font-medium">{fav.name}</div>
                <div className="text-xs text-muted-foreground font-mono mt-0.5">
                  {fav.input.muzzleVelocity} m/s • BC {fav.input.bc} • {fav.input.projectileWeight} gr
                </div>
              </Link>
            ))}
          </div>
        )}
      </motion.div>

      {/* Quick grid */}
      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Link to="/library" className="surface-elevated p-4 flex flex-col items-center text-center gap-2 hover:border-primary/30 transition-colors group">
          <BookOpen className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
          <span className="text-xs font-medium">{t('dashboard.recentProfiles')}</span>
        </Link>
        <Link to="/conversions" className="surface-elevated p-4 flex flex-col items-center text-center gap-2 hover:border-primary/30 transition-colors group">
          <ArrowLeftRight className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
          <span className="text-xs font-medium">{t('dashboard.quickConversions')}</span>
        </Link>
        <Link to="/docs" className="surface-elevated p-4 flex flex-col items-center text-center gap-2 hover:border-primary/30 transition-colors group">
          <FileText className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
          <span className="text-xs font-medium">{t('dashboard.fxDocs')}</span>
        </Link>
      </motion.div>
    </motion.div>
  );
}
