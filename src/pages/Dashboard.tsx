import React from 'react';
import { Link } from 'react-router-dom';
import { Crosshair, Target, Eye, History, ArrowLeftRight, Zap, BarChart3 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { airgunStore, projectileStore, opticStore, sessionStore } from '@/lib/storage';
import { motion } from 'framer-motion';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function Dashboard() {
  const { t } = useI18n();
  const airguns = airgunStore.getAll();
  const projectiles = projectileStore.getAll();
  const optics = opticStore.getAll();
  const sessions = sessionStore.getAll();

  const stats = [
    { label: t('dashboard.stats.airguns'), value: airguns.length, icon: Target, color: 'text-primary' },
    { label: t('dashboard.stats.projectiles'), value: projectiles.length, icon: Zap, color: 'text-tactical' },
    { label: t('dashboard.stats.optics'), value: optics.length, icon: Eye, color: 'text-accent' },
    { label: t('dashboard.stats.sessions'), value: sessions.length, icon: BarChart3, color: 'text-primary' },
  ];

  const quickActions = [
    { path: '/calc', icon: Crosshair, label: t('dashboard.quickCalc'), desc: t('calc.subtitle') },
    { path: '/airguns', icon: Target, label: t('dashboard.myAirguns'), desc: '' },
    { path: '/projectiles', icon: Zap, label: t('dashboard.myProjectiles'), desc: '' },
    { path: '/sessions', icon: History, label: t('dashboard.mySessions'), desc: '' },
    { path: '/conversions', icon: ArrowLeftRight, label: t('nav.conversions'), desc: t('conv.subtitle') },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Hero */}
      <motion.div variants={item} className="text-center py-6">
        <div className="inline-flex items-center gap-2 mb-3">
          <Crosshair className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-heading font-bold tracking-tight">
            Air<span className="text-gradient">Ballistik</span>
          </h1>
        </div>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          {t('dashboard.subtitle')}
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="surface-elevated p-4 text-center">
            <s.icon className={`h-5 w-5 mx-auto mb-2 ${s.color}`} />
            <div className="text-2xl font-mono font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {quickActions.map(action => (
          <Link
            key={action.path}
            to={action.path}
            className="surface-elevated p-4 flex items-start gap-3 hover:border-primary/30 transition-colors group"
          >
            <div className="p-2 rounded-md bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
              <action.icon className="h-5 w-5" />
            </div>
            <div>
              <div className="font-medium text-sm">{action.label}</div>
              {action.desc && (
                <div className="text-xs text-muted-foreground mt-0.5">{action.desc}</div>
              )}
            </div>
          </Link>
        ))}
      </motion.div>

      {/* Recent Sessions */}
      <motion.div variants={item}>
        <h2 className="font-heading font-semibold text-lg mb-3">{t('dashboard.recentSessions')}</h2>
        {sessions.length === 0 ? (
          <div className="surface-card p-8 text-center text-muted-foreground text-sm">
            {t('dashboard.noSessions')}
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.slice(-5).reverse().map(session => (
              <Link
                key={session.id}
                to={`/sessions`}
                className="surface-card p-3 flex items-center justify-between hover:border-primary/30 transition-colors block"
              >
                <div>
                  <div className="text-sm font-medium">{session.name}</div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {new Date(session.createdAt).toLocaleDateString()} — {session.input.muzzleVelocity} m/s
                  </div>
                </div>
                {session.favorite && <span className="text-primary text-xs">★</span>}
              </Link>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
