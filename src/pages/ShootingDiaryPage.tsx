/**
 * G2 — Shooting Diary with calendar view and statistics.
 * Displays sessions by date, hit rate progression, and personal goals.
 */
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, TrendingUp, Target, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';
import { sessionStore } from '@/lib/storage';
import type { Session } from '@/lib/types';

export default function ShootingDiaryPage() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const allSessions = useMemo(() => sessionStore.getAll(), []);
  const [currentMonth, setCurrentMonth] = useState(() => new Date());

  // Group sessions by date
  const sessionsByDate = useMemo(() => {
    const map = new Map<string, Session[]>();
    allSessions.forEach((s) => {
      const date = new Date(s.createdAt).toISOString().slice(0, 10);
      if (!map.has(date)) map.set(date, []);
      map.get(date)!.push(s);
    });
    return map;
  }, [allSessions]);

  // Calendar grid
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = (firstDay.getDay() + 6) % 7; // Monday start
    const days: (Date | null)[] = [];
    for (let i = 0; i < startPad; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  }, [currentMonth]);

  // Statistics
  const stats = useMemo(() => {
    const last30 = allSessions.filter(
      (s) => Date.now() - new Date(s.createdAt).getTime() < 30 * 24 * 60 * 60 * 1000,
    );
    const last90 = allSessions.filter(
      (s) => Date.now() - new Date(s.createdAt).getTime() < 90 * 24 * 60 * 60 * 1000,
    );
    const favs = allSessions.filter((s) => s.favorite);
    const uniqueDays = new Set(allSessions.map((s) => new Date(s.createdAt).toISOString().slice(0, 10)));
    return { total: allSessions.length, last30: last30.length, last90: last90.length, favs: favs.length, days: uniqueDays.size };
  }, [allSessions]);

  const monthStr = currentMonth.toLocaleDateString(locale, { month: 'long', year: 'numeric' });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 max-w-lg mx-auto">
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-heading font-bold">{t('nav.diary' as any) || 'Carnet de Tir'}</h1>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Total', value: stats.total, color: 'text-primary' },
          { label: '30 jours', value: stats.last30, color: 'text-amber-500' },
          { label: 'Jours actifs', value: stats.days, color: 'text-blue-500' },
          { label: 'Favoris', value: stats.favs, color: 'text-purple-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="surface-card rounded-xl px-2 py-2 text-center">
            <div className={`text-xl font-mono font-bold ${color}`}>{value}</div>
            <div className="text-[8px] text-muted-foreground uppercase">{label}</div>
          </div>
        ))}
      </div>

      {/* Calendar */}
      <div className="surface-elevated rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className="p-1 rounded hover:bg-muted transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold capitalize">{monthStr}</span>
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className="p-1 rounded hover:bg-muted transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'].map((d) => (
            <div key={d} className="text-[9px] text-center text-muted-foreground font-medium">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, i) => {
            if (!day) return <div key={`pad-${i}`} />;
            const dateStr = day.toISOString().slice(0, 10);
            const daySessions = sessionsByDate.get(dateStr) ?? [];
            const isToday = dateStr === new Date().toISOString().slice(0, 10);
            const hasSession = daySessions.length > 0;

            return (
              <button
                key={dateStr}
                onClick={() => {
                  if (daySessions.length === 1) navigate(`/sessions/${daySessions[0].id}`);
                  else if (daySessions.length > 1) navigate('/sessions');
                }}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center text-[11px] transition-colors ${
                  isToday ? 'ring-1 ring-primary' : ''
                } ${
                  hasSession
                    ? 'bg-primary/10 text-primary font-semibold hover:bg-primary/20'
                    : 'text-muted-foreground hover:bg-muted/50'
                }`}
              >
                {day.getDate()}
                {hasSession && (
                  <div className="flex gap-0.5 mt-0.5">
                    {daySessions.slice(0, 3).map((_, j) => (
                      <div key={j} className="h-1 w-1 rounded-full bg-primary" />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent sessions list */}
      <div className="surface-elevated rounded-xl p-4 space-y-2">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Sessions récentes</div>
        {allSessions.slice(-10).reverse().map((s) => (
          <button
            key={s.id}
            onClick={() => navigate(`/sessions/${s.id}`)}
            className="w-full text-left flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Target className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{s.name}</div>
              <div className="text-[10px] text-muted-foreground font-mono">
                {new Date(s.createdAt).toLocaleDateString(locale)} — BC {s.input.bc} | {s.input.muzzleVelocity} m/s
              </div>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          </button>
        ))}
      </div>
    </motion.div>
  );
}
