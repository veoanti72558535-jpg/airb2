import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Target, FileText, Timer, Settings2, Star, ChevronRight } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { sessionStore } from '@/lib/storage';
import { calculateTrajectory } from '@/lib/ballistics';
import { BallisticResult } from '@/lib/types';
import { AppCard } from '@/components/ui/AppCard';
import { BallisticValue } from '@/components/ui/BallisticValue';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { TrajectoryMiniChart } from '@/components/calc/TrajectoryMiniChart';

export default function Dashboard() {
  const { t } = useI18n();
  const sessions = sessionStore.getAll();
  const last = sessions.length > 0 ? sessions[sessions.length - 1] : null;

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
    <div className="space-y-5">
      {/* Header */}
      <div className="pt-2">
        <h1 className="text-xl font-heading font-semibold">
          {t('dashboard.greeting')}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t('dashboard.subtitle')}</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-3 gap-3">
        <AppCard className="p-3">
          <BallisticValue
            label={t('dashboard.dropAtZero')}
            value={dropAtZero}
            unit="mm"
            size="md"
          />
        </AppCard>
        <AppCard className="p-3">
          <BallisticValue
            label={t('dashboard.velocity')}
            value={velocityAtZero}
            unit="m/s"
            size="md"
          />
        </AppCard>
        <AppCard className="p-3">
          <BallisticValue
            label={t('dashboard.energy')}
            value={energyAtZero}
            unit="J"
            size="md"
          />
        </AppCard>
      </div>

      {/* Trajectory mini chart */}
      {lastResult && last && (
        <AppCard>
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">
            {t('dashboard.trajectory')} — {last.name}
          </h2>
          <div className="h-40">
            <TrajectoryMiniChart rows={lastResult} />
          </div>
        </AppCard>
      )}

      {/* Quick access */}
      <div>
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">
          {t('dashboard.quickAccess')}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <Link to="/calc">
            <AppCard className="flex items-center gap-3 p-3 hover:border-primary/30 transition-colors duration-150 cursor-pointer">
              <Target className="h-5 w-5 text-primary shrink-0" />
              <span className="text-sm font-medium">{t('dashboard.newCalc')}</span>
            </AppCard>
          </Link>
          <Link to="/chrono">
            <AppCard className="flex items-center gap-3 p-3 hover:border-primary/30 transition-colors duration-150 cursor-pointer">
              <Timer className="h-5 w-5 text-primary shrink-0" />
              <span className="text-sm font-medium">{t('chrono.title')}</span>
            </AppCard>
          </Link>
          <Link to="/sessions">
            <AppCard className="flex items-center gap-3 p-3 hover:border-primary/30 transition-colors duration-150 cursor-pointer">
              <FileText className="h-5 w-5 text-primary shrink-0" />
              <span className="text-sm font-medium">{t('dashboard.dopePdf')}</span>
            </AppCard>
          </Link>
          <Link to="/sessions">
            <AppCard className="flex items-center gap-3 p-3 hover:border-primary/30 transition-colors duration-150 cursor-pointer">
              <Settings2 className="h-5 w-5 text-primary shrink-0" />
              <span className="text-sm font-medium">{t('dashboard.calibrateBc')}</span>
            </AppCard>
          </Link>
        </div>
      </div>

      {/* Last session */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            {t('dashboard.lastSession')}
          </h2>
          {sessions.length > 0 && (
            <Link to="/sessions" className="text-xs text-primary font-medium hover:underline">
              {t('dashboard.viewAll')} →
            </Link>
          )}
        </div>

        {!last ? (
          <AppCard className="text-center py-8">
            <p className="text-muted-foreground text-sm mb-4">{t('dashboard.noSession')}</p>
            <Link
              to="/calc"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors duration-150"
            >
              <Target className="h-4 w-4" />
              {t('dashboard.createFirst')}
            </Link>
          </AppCard>
        ) : (
          <Link to="/sessions">
            <AppCard className="hover:border-primary/30 transition-colors duration-150 cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{last.name}</span>
                    {last.favorite && <Star className="h-3 w-3 text-primary fill-primary shrink-0" />}
                    {(last as any).truingFactor && (
                      <StatusBadge variant="success">BC calibré</StatusBadge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono mt-1">
                    {last.input.muzzleVelocity} m/s · BC {last.input.bc} · {last.input.zeroRange}m
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            </AppCard>
          </Link>
        )}
      </div>
    </div>
  );
}
