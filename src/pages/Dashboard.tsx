import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Target, FileText, Timer, Settings2, Star, ChevronRight } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { sessionStore } from '@/lib/storage';
import { calculateTrajectory } from '@/lib/ballistics';
import { BallisticResult } from '@/lib/types';
import { AppCard } from '@/components/ui/AppCard';
import { TrajectoryMiniChart } from '@/components/calc/TrajectoryMiniChart';
import { OnboardingWizard, useOnboarding } from '@/components/OnboardingWizard';
import { DashboardWidgets } from '@/components/DashboardWidgets';

export default function Dashboard() {
  const { t } = useI18n();
  const sessions = sessionStore.getAll();
  const last = sessions.length > 0 ? sessions[sessions.length - 1] : null;
  const { shouldShow: showOnboarding, markDone } = useOnboarding();

  // Compute stats from last session
  const lastResult = useMemo(() => {
    if (!last) return null;
    try {
      return calculateTrajectory(last.input);
    } catch {
      return null;
    }
  }, [last]);

  const zeroRow = lastResult?.find((r: BallisticResult) => r.range === (last?.input.zeroRange ?? 0));
  const dropAtZero = zeroRow ? zeroRow.drop.toFixed(1) : '—';
  const velocityAtZero = zeroRow ? Math.round(zeroRow.velocity).toString() : '—';
  const energyAtZero = zeroRow ? zeroRow.energy.toFixed(1) : '—';

  return (
    <div className="space-y-6">
      {/* A2 — Onboarding wizard (first visit only) */}
      {showOnboarding && <OnboardingWizard onComplete={markDone} />}

      {/* HUD Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
            {t('dashboard.greeting')}
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">{t('dashboard.subtitle')}</p>
        </div>
        {/* Decorative tactical element */}
        <div className="hidden md:flex items-center gap-4 text-xs font-mono text-muted-foreground">
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-primary animate-pulse" /> SYSTEM ONLINE</div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-info" /> DB SYNCED</div>
        </div>
      </div>

      {/* A1 — Drag-and-drop dashboard widgets */}
      <DashboardWidgets />

      {/* Main Command Center - Latest Session */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm uppercase tracking-widest text-primary font-bold flex items-center gap-2">
            <Target className="h-4 w-4" /> Command Center
          </h2>
          {sessions.length > 0 && (
            <Link to="/sessions" className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
              {t('dashboard.viewAll')} <ChevronRight className="h-3 w-3" />
            </Link>
          )}
        </div>

        {!last ? (
          <AppCard variant="glass" className="text-center py-12 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Target className="h-8 w-8 text-primary opacity-80" />
            </div>
            <p className="text-muted-foreground text-sm mb-6 max-w-md">{t('dashboard.noSession')}</p>
            <Link
              to="/calc"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90 transition-all duration-300 shadow-[0_0_20px_rgba(var(--primary),0.3)] hover:shadow-[0_0_30px_rgba(var(--primary),0.5)] hover:-translate-y-0.5"
            >
              <Target className="h-4 w-4" />
              {t('dashboard.createFirst')}
            </Link>
          </AppCard>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Session Info & KPIs */}
            <AppCard variant="glass" className="col-span-1 lg:col-span-1 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-heading font-bold text-lg leading-tight group-hover:text-primary transition-colors">
                      {last.name}
                    </h3>
                    <div className="text-xs text-muted-foreground font-mono mt-1 opacity-80">
                      {new Date(last.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  {last.favorite && <Star className="h-4 w-4 text-primary fill-primary shrink-0" />}
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center text-sm border-b border-border/40 pb-1">
                    <span className="text-muted-foreground">Munition</span>
                    <span className="font-medium text-right max-w-[150px] truncate" title={last.input.projectileName}>{last.input.projectileName}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-border/40 pb-1">
                    <span className="text-muted-foreground">Vélocité</span>
                    <span className="font-mono text-primary">{last.input.muzzleVelocity} m/s</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-border/40 pb-1">
                    <span className="text-muted-foreground">Distance Zéro</span>
                    <span className="font-mono">{last.input.zeroRange} m</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4">
                <div className="bg-background/50 rounded-lg p-2 border border-border/40">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Drop @ Zéro</div>
                  <div className="font-mono font-bold">{dropAtZero} <span className="text-xs font-sans font-normal opacity-70">mm</span></div>
                </div>
                <div className="bg-background/50 rounded-lg p-2 border border-border/40">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Énergie</div>
                  <div className="font-mono font-bold">{energyAtZero} <span className="text-xs font-sans font-normal opacity-70">J</span></div>
                </div>
              </div>
            </AppCard>

            {/* Trajectory Chart */}
            {lastResult && (
              <AppCard variant="glass" className="col-span-1 lg:col-span-2 flex flex-col h-full min-h-[250px]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" /> {t('dashboard.trajectory')}
                  </h3>
                  <Link to={`/sessions/${last.id}`} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20 transition-colors">
                    Ouvrir →
                  </Link>
                </div>
                <div className="flex-1 min-h-[200px] w-full -ml-2">
                  <TrajectoryMiniChart rows={lastResult} />
                </div>
              </AppCard>
            )}
          </div>
        )}
      </section>

      {/* Quick Tools Grid */}
      <section>
        <h2 className="text-sm uppercase tracking-widest text-muted-foreground font-bold mb-3 flex items-center gap-2">
          <Settings2 className="h-4 w-4 opacity-50" /> {t('dashboard.quickAccess')}
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Link to="/calc">
            <AppCard variant="glass" className="flex flex-col items-center justify-center gap-3 p-5 hover:border-primary/50 group text-center h-full">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                <Target className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium">{t('dashboard.newCalc')}</span>
            </AppCard>
          </Link>
          <Link to="/chrono">
            <AppCard variant="glass" className="flex flex-col items-center justify-center gap-3 p-5 hover:border-info/50 group text-center h-full">
              <div className="w-10 h-10 rounded-full bg-info/10 text-info flex items-center justify-center group-hover:scale-110 group-hover:bg-info group-hover:text-info-foreground transition-all duration-300">
                <Timer className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium">{t('chrono.title')}</span>
            </AppCard>
          </Link>
          <Link to="/compare">
            <AppCard variant="glass" className="flex flex-col items-center justify-center gap-3 p-5 hover:border-warning/50 group text-center h-full">
              <div className="w-10 h-10 rounded-full bg-warning/10 text-warning flex items-center justify-center group-hover:scale-110 group-hover:bg-warning group-hover:text-warning-foreground transition-all duration-300">
                <Star className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium">{t('nav.compare')}</span>
            </AppCard>
          </Link>
          <Link to="/sessions">
            <AppCard variant="glass" className="flex flex-col items-center justify-center gap-3 p-5 hover:border-tactical/50 group text-center h-full">
              <div className="w-10 h-10 rounded-full bg-tactical/10 text-tactical flex items-center justify-center group-hover:scale-110 group-hover:bg-tactical group-hover:text-tactical-foreground transition-all duration-300">
                <FileText className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium">{t('dashboard.dopePdf')}</span>
            </AppCard>
          </Link>
        </div>
      </section>
    </div>
  );
}
