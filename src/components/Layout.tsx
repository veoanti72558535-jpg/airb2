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
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(() => {
    // Try to restore from localStorage, default to true on large screens
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('airballistik_sidebar_expanded');
      if (saved !== null) return saved === 'true';
      return window.innerWidth >= 1280;
    }
    return true;
  });
  const { user, signOut } = useAuth();

  const toggleSidebar = () => {
    const newState = !isSidebarExpanded;
    setIsSidebarExpanded(newState);
    localStorage.setItem('airballistik_sidebar_expanded', String(newState));
  };

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-background flex selection:bg-primary/30">
      {/* ── Desktop Sidebar ── */}
      <aside 
        className={cn(
          "hidden md:flex flex-col border-r border-border/40 bg-card/50 backdrop-blur-xl sticky top-0 h-screen shrink-0 transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] z-40",
          isSidebarExpanded ? "w-64" : "w-16 items-center"
        )}
      >
        {/* Header / Logo */}
        <div className={cn(
          "flex items-center h-16 border-b border-border/40 px-3",
          isSidebarExpanded ? "justify-between" : "justify-center"
        )}>
          {isSidebarExpanded ? (
            <Link to="/" className="flex items-center gap-3 px-2 group outline-none">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 shadow-[0_0_15px_rgba(var(--primary),0.2)]">
                <Target className="h-5 w-5" />
              </div>
              <span className="font-heading font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                AirBallistiK
              </span>
            </Link>
          ) : (
            <Link to="/" className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 shadow-[0_0_15px_rgba(var(--primary),0.1)] outline-none">
              <Target className="h-5 w-5" />
            </Link>
          )}
        </div>

        {/* Nav items */}
        <nav className={cn(
          "flex-1 flex flex-col gap-1 py-4 overflow-y-auto px-2 scrollbar-none",
          !isSidebarExpanded && "items-center"
        )}>
          {sidebarNav.map(item => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                title={!isSidebarExpanded ? t(item.labelKey) : undefined}
                className={cn(
                  'flex items-center rounded-xl transition-all duration-200 group relative outline-none',
                  isSidebarExpanded ? 'px-3 py-2.5 gap-3' : 'justify-center w-11 h-11',
                  active
                    ? 'bg-primary/15 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                {active && isSidebarExpanded && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-primary rounded-r-full shadow-[0_0_8px_rgba(var(--primary),0.6)]" />
                )}
                <item.icon className={cn(
                  "shrink-0 transition-transform duration-200",
                  isSidebarExpanded ? "h-5 w-5" : "h-5 w-5",
                  active && !isSidebarExpanded ? "scale-110 drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]" : ""
                )} />
                {isSidebarExpanded && (
                  <span className="truncate">{t(item.labelKey)}</span>
                )}
              </Link>
            );
          })}

          {/* Separator */}
          <div className={cn(
            "border-t border-border/40 my-2",
            isSidebarExpanded ? "mx-4" : "w-8"
          )} />

          {adminNav.map(item => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                title={!isSidebarExpanded ? t(item.labelKey) : undefined}
                className={cn(
                  'flex items-center rounded-xl transition-all duration-200 group outline-none',
                  isSidebarExpanded ? 'px-3 py-2.5 gap-3' : 'justify-center w-11 h-11',
                  active
                    ? 'bg-primary/15 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                <item.icon className="shrink-0 h-5 w-5" />
                {isSidebarExpanded && <span className="truncate">{t(item.labelKey)}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom controls */}
        <div className={cn(
          "flex flex-col gap-2 py-4 border-t border-border/40 px-2",
          !isSidebarExpanded && "items-center"
        )}>
          {/* Toggle Sidebar Button */}
          <button
            onClick={toggleSidebar}
            title={isSidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
            className={cn(
              "flex items-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors duration-200 outline-none",
              isSidebarExpanded ? 'px-3 py-2.5 gap-3' : 'justify-center w-11 h-11'
            )}
          >
            <ChevronRight className={cn(
              "h-5 w-5 shrink-0 transition-transform duration-300",
              isSidebarExpanded ? "rotate-180" : ""
            )} />
            {isSidebarExpanded && <span className="truncate">Collapse</span>}
          </button>

          <div className={cn(
            "flex",
            isSidebarExpanded ? "items-center justify-between px-2 pt-2" : "flex-col items-center gap-2"
          )}>
            <div className={cn("flex items-center gap-1", !isSidebarExpanded && "flex-col")}>
              <button
                onClick={() => setLocale(locale === 'fr' ? 'en' : 'fr')}
                title={locale === 'fr' ? 'English' : 'Français'}
                className="flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors duration-150 outline-none"
              >
                <Globe className="h-4 w-4" />
              </button>
              <Link
                to="/settings"
                title={t('settings.theme' as any)}
                className="flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors duration-150 outline-none"
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Link>
            </div>
            {user && (
              <button
                onClick={() => signOut()}
                title={user.email ?? 'Sign out'}
                className="flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-tr from-primary/20 to-primary/5 text-primary text-xs font-bold border border-primary/20 hover:border-primary/50 transition-colors shadow-sm outline-none"
              >
                {(user.email ?? '?')[0].toUpperCase()}
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0 relative">
        {/* Subtle background glow effect (Glassmorphism ambient) */}
        <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none -z-10" />
        
        <main className="flex-1 px-4 sm:px-6 md:px-8 py-6 pb-24 md:pb-8 w-full mx-auto max-w-[1600px] animate-fade-in">
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
