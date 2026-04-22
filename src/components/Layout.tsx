import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Link, useLocation } from 'react-router-dom';
import {
  Home, Crosshair, History, BookOpen, MoreHorizontal,
  ArrowLeftRight, FileText, Search, Settings, Shield,
  Sun, Moon, Globe, X, ChevronRight, FlaskConical, LogOut,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';

const mainNav = [
  { path: '/', icon: Home, labelKey: 'nav.home' as const },
  { path: '/calc', icon: Crosshair, labelKey: 'nav.quickCalc' as const },
  { path: '/sessions', icon: History, labelKey: 'nav.sessions' as const },
  { path: '/library', icon: BookOpen, labelKey: 'nav.library' as const },
];

const moreNav = [
  { path: '/conversions', icon: ArrowLeftRight, labelKey: 'nav.conversions' as const },
  { path: '/docs', icon: FileText, labelKey: 'nav.docs' as const },
  { path: '/search', icon: Search, labelKey: 'nav.search' as const },
  { path: '/cross-validation', icon: FlaskConical, labelKey: 'nav.crossValidation' as const },
  { path: '/settings', icon: Settings, labelKey: 'nav.settings' as const },
  { path: '/admin', icon: Shield, labelKey: 'nav.admin' as const },
];

const allNav = [...mainNav, ...moreNav];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { t, locale, setLocale } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const { user, signOut } = useAuth();

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-60 border-r border-border bg-card/50 sticky top-0 h-screen shrink-0">
        <div className="p-4 border-b border-border">
          <Link to="/" className="flex items-center gap-2">
            <Crosshair className="h-5 w-5 text-primary" />
            <span className="font-heading font-bold text-lg tracking-tight">
              Air<span className="text-gradient">Ballistik</span>
            </span>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {allNav.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive(item.path)
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {t(item.labelKey)}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-border space-y-1">
          <button
            onClick={() => setLocale(locale === 'fr' ? 'en' : 'fr')}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors w-full"
          >
            <Globe className="h-4 w-4" />
            {locale === 'fr' ? 'Français' : 'English'}
          </button>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors w-full"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {theme === 'dark' ? t('common.light') : t('common.dark')}
          </button>
          {user && (
            <button
              onClick={() => signOut()}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors w-full"
            >
              <LogOut className="h-4 w-4" />
              <span className="truncate text-xs">{user.email}</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
          <div className="flex items-center justify-between h-12 px-4">
            <Link to="/" className="flex items-center gap-2">
              <Crosshair className="h-4 w-4 text-primary" />
              <span className="font-heading font-bold text-base tracking-tight">
                Air<span className="text-gradient">Ballistik</span>
              </span>
            </Link>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setLocale(locale === 'fr' ? 'en' : 'fr')}
                className="p-2 rounded-md text-muted-foreground hover:text-foreground text-xs font-mono"
              >
                {locale.toUpperCase()}
              </button>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-md text-muted-foreground hover:text-foreground"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              {user && (
                <button
                  onClick={() => signOut()}
                  className="p-2 rounded-md text-muted-foreground hover:text-foreground"
                  title={user.email ?? ''}
                >
                  <LogOut className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-4 py-4 pb-24 md:pb-4 max-w-5xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-1">
          {mainNav.map(item => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex flex-col items-center gap-0.5 py-1 px-2 rounded-md transition-colors min-w-0',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium truncate">{t(item.labelKey)}</span>
              </Link>
            );
          })}
          {/* More button */}
          <button
            onClick={() => setMoreOpen(true)}
            className={cn(
              'flex flex-col items-center gap-0.5 py-1 px-2 rounded-md transition-colors',
              moreNav.some(n => isActive(n.path)) ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] font-medium">{t('nav.more')}</span>
          </button>
        </div>
      </nav>

      {/* More sheet (mobile) */}
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
                    'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
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
