import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Crosshair, Target, Eye, History, ArrowLeftRight, Settings, Sun, Moon, Globe } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';

const navItems = [
  { path: '/', icon: Home, labelKey: 'nav.home' as const },
  { path: '/calc', icon: Crosshair, labelKey: 'nav.quickCalc' as const },
  { path: '/airguns', icon: Target, labelKey: 'nav.airguns' as const },
  { path: '/projectiles', icon: Target, labelKey: 'nav.projectiles' as const },
  { path: '/sessions', icon: History, labelKey: 'nav.sessions' as const },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { t, locale, setLocale } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container flex items-center justify-between h-14 px-4">
          <Link to="/" className="flex items-center gap-2">
            <Crosshair className="h-5 w-5 text-primary" />
            <span className="font-heading font-bold text-lg tracking-tight">
              Air<span className="text-primary">Ballistik</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLocale(locale === 'fr' ? 'en' : 'fr')}
              className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-sm font-mono"
              title={t('common.language')}
            >
              {locale.toUpperCase()}
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title={t('common.theme')}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {/* Desktop nav */}
        <nav className="hidden md:flex container px-4 gap-1 pb-2">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                location.pathname === item.path
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <item.icon className="h-4 w-4" />
              {t(item.labelKey)}
            </Link>
          ))}
          <Link
            to="/conversions"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              location.pathname === '/conversions'
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <ArrowLeftRight className="h-4 w-4" />
            {t('nav.conversions')}
          </Link>
          <Link
            to="/optics"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              location.pathname === '/optics'
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Eye className="h-4 w-4" />
            {t('nav.optics')}
          </Link>
        </nav>
      </header>

      {/* Main content */}
      <main className="flex-1 container px-4 py-4 pb-20 md:pb-4">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map(item => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-md transition-colors ${
                  active ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <item.icon className={`h-5 w-5 ${active ? 'text-primary' : ''}`} />
                <span className="text-[10px] font-medium">{t(item.labelKey)}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
