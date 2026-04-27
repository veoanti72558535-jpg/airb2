import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Target, BookOpen, Package, Timer,
  ArrowLeftRight, GitCompare, Cpu, MoreHorizontal,
  Sun, Moon, Globe, X, ChevronRight, FlaskConical,
  LogOut, FileText, Search, Settings, Shield,
  Camera, Trophy, Eye, Crosshair, MessageCircle, Calendar,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';

const sidebarNav = [
  { path: '/', icon: LayoutDashboard, labelKey: 'nav.home' as const },
  { path: '/calc', icon: Target, labelKey: 'nav.quickCalc' as const },
  { path: '/sessions', icon: BookOpen, labelKey: 'nav.sessions' as const },
  { path: '/library', icon: Package, labelKey: 'nav.library' as const },
  { path: '/chrono', icon: Timer, labelKey: 'chrono.title' as const },
  { path: '/conversions', icon: ArrowLeftRight, labelKey: 'nav.conversions' as const },
  { path: '/compare', icon: GitCompare, labelKey: 'nav.compare' as const },
];

const bottomNav = [
  { path: '/', icon: LayoutDashboard, labelKey: 'nav.home' as const },
  { path: '/calc', icon: Target, labelKey: 'nav.quickCalc' as const },
  { path: '/sessions', icon: BookOpen, labelKey: 'nav.sessions' as const },
];

const moreNav = [
  { path: '/field-mode', icon: Crosshair, labelKey: 'nav.fieldMode' as const },
  { path: '/range-simulator', icon: Target, labelKey: 'nav.rangeSimulator' as const },
  { path: '/chat', icon: MessageCircle, labelKey: 'nav.chat' as const },
  { path: '/diary', icon: Calendar, labelKey: 'nav.diary' as const },
  { path: '/ft-competition', icon: Trophy, labelKey: 'nav.ftCompetition' as const },
  { path: '/library', icon: Package, labelKey: 'nav.library' as const },
  { path: '/chrono', icon: Timer, labelKey: 'chrono.title' as const },
  { path: '/compare', icon: GitCompare, labelKey: 'nav.compare' as const },
  { path: '/conversions', icon: ArrowLeftRight, labelKey: 'nav.conversions' as const },
  { path: '/scope-view', icon: Eye, labelKey: 'nav.scopeView' as const },
  { path: '/target-analysis', icon: Camera, labelKey: 'nav.targetAnalysis' as const },
  { path: '/competition-prep', icon: Trophy, labelKey: 'nav.competitionPrep' as const },
  { path: '/cross-validation', icon: FlaskConical, labelKey: 'nav.crossValidation' as const },
  { path: '/docs', icon: FileText, labelKey: 'nav.docs' as const },
  { path: '/search', icon: Search, labelKey: 'nav.search' as const },
  { path: '/settings', icon: Settings, labelKey: 'nav.settings' as const },
  { path: '/admin', icon: Shield, labelKey: 'nav.admin' as const },
];

const adminNav = [
  { path: '/admin/ai', icon: Cpu, labelKey: 'nav.adminAi' as const },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { t, locale, setLocale } = useI18n();
  const { isDark } = useTheme();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const { user, signOut } = useAuth();

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-background flex">
      {/* ── Desktop Sidebar (64px icons + labels) ── */}
      <aside className="hidden md:flex flex-col w-16 border-r border-border bg-card sticky top-0 h-screen shrink-0">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center h-14 border-b border-border">
          <Target className="h-5 w-5 text-primary" />
        </Link>

        {/* Nav items */}
        <nav className="flex-1 flex flex-col items-center gap-1 py-3 overflow-y-auto">
          {sidebarNav.map(item => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                title={t(item.labelKey)}
                className={cn(
                  'flex flex-col items-center justify-center w-11 h-11 rounded-lg transition-colors duration-150',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <item.icon className="h-5 w-5" />
              </Link>
            );
          })}

          {/* Separator */}
          <div className="w-6 border-t border-border my-1" />

          {adminNav.map(item => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                title={t(item.labelKey)}
                className={cn(
                  'flex flex-col items-center justify-center w-11 h-11 rounded-lg transition-colors duration-150',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <item.icon className="h-5 w-5" />
              </Link>
            );
          })}
        </nav>

        {/* Bottom controls */}
        <div className="flex flex-col items-center gap-2 py-3 border-t border-border">
          <button
            onClick={() => setLocale(locale === 'fr' ? 'en' : 'fr')}
            title={locale === 'fr' ? 'English' : 'Français'}
            className="flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-150"
          >
            <Globe className="h-4 w-4" />
          </button>
          <Link
            to="/settings"
            title={t('settings.theme' as any)}
            className="flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-150"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Link>
          {user && (
            <button
              onClick={() => signOut()}
              title={user.email ?? 'Sign out'}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 text-primary text-xs font-bold"
            >
              {(user.email ?? '?')[0].toUpperCase()}
            </button>
          )}
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-h-screen">
        <main className="flex-1 px-4 py-4 pb-24 md:pb-4 max-w-4xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md safe-area-bottom">
        <div className="flex items-center justify-around h-14 px-1">
          {bottomNav.map(item => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex flex-col items-center gap-0.5 py-1 px-3 rounded-md transition-colors duration-150 touch-target relative',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-primary" />
                )}
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{t(item.labelKey)}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            className={cn(
              'flex flex-col items-center gap-0.5 py-1 px-3 rounded-md transition-colors duration-150 touch-target',
              moreNav.some(n => isActive(n.path)) ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] font-medium">{t('nav.more')}</span>
          </button>
        </div>
      </nav>

      {/* ── More bottom sheet (mobile) ── */}
      {moreOpen && (
        <>
          <div className="md:hidden fixed inset-0 z-[60] bg-background/60 backdrop-blur-sm" onClick={() => setMoreOpen(false)} />
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-[70] bg-card border-t border-border rounded-t-2xl safe-area-bottom animate-fade-in">
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <span className="font-heading font-semibold text-sm">{t('nav.more')}</span>
              <button onClick={() => setMoreOpen(false)} className="p-1 text-muted-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-3 pb-6 space-y-1">
              {moreNav.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-150 touch-target',
                    isActive(item.path)
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="flex-1">{t(item.labelKey)}</span>
                  <ChevronRight className="h-4 w-4 opacity-40" />
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
