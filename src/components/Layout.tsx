import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Target, BookOpen, Package, Timer,
  ArrowLeftRight, GitCompare, Cpu, MoreHorizontal,
  Sun, Moon, Globe, X, ChevronRight, FlaskConical,
  FileText, Search, Settings, Shield,
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

/**
 * Grouped "More" navigation — used by both desktop side-panel and mobile
 * bottom-sheet. Sections improve discoverability vs the previous flat 16-row
 * list. Doublons sidebar (library/chrono/conversions/compare) removed.
 * /competition-prep merged into /ft-competition (handled via route redirect).
 */
type MoreItem = { path: string; icon: React.ComponentType<{ className?: string }>; labelKey: any };
type MoreSection = { titleKey: any; items: MoreItem[] };

const moreSections: MoreSection[] = [
  {
    titleKey: 'nav.section.fieldTools',
    items: [
      { path: '/field-mode', icon: Crosshair, labelKey: 'nav.fieldMode' as const },
      { path: '/range-simulator', icon: Target, labelKey: 'nav.rangeSimulator' as const },
      { path: '/scope-view', icon: Eye, labelKey: 'nav.scopeView' as const },
      { path: '/target-analysis', icon: Camera, labelKey: 'nav.targetAnalysis' as const },
    ],
  },
  {
    titleKey: 'nav.section.competition',
    items: [
      { path: '/ft-competition', icon: Trophy, labelKey: 'nav.ftCompetition' as const },
      { path: '/diary', icon: Calendar, labelKey: 'nav.diary' as const },
    ],
  },
  {
    titleKey: 'nav.section.aiAndDocs',
    items: [
      { path: '/chat', icon: MessageCircle, labelKey: 'nav.chat' as const },
      { path: '/cross-validation', icon: FlaskConical, labelKey: 'nav.crossValidation' as const },
      { path: '/docs', icon: FileText, labelKey: 'nav.docs' as const },
      { path: '/search', icon: Search, labelKey: 'nav.search' as const },
    ],
  },
  {
    titleKey: 'nav.section.system',
    items: [
      { path: '/settings', icon: Settings, labelKey: 'nav.settings' as const },
      { path: '/settings?tab=data', icon: Shield, labelKey: 'nav.admin' as const },
    ],
  },
];

const moreFlat: MoreItem[] = moreSections.flatMap((s) => s.items);

const adminNav = [
  { path: '/admin/ai', icon: Cpu, labelKey: 'nav.adminAi' as const },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { t, locale, setLocale } = useI18n();
  const { isDark } = useTheme();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const { user, signOut } = useAuth();
  const moreCloseBtnRef = useRef<HTMLButtonElement | null>(null);
  const morePanelRef = useRef<HTMLDivElement | null>(null);
  const moreTriggerRef = useRef<HTMLElement | null>(null);
  const bottomNavRef = useRef<HTMLElement | null>(null);
  const [bottomNavHeight, setBottomNavHeight] = useState(56);

  // Track the actual rendered height of the mobile bottom nav so the "More"
  // bottom sheet can sit flush above it regardless of theme/font/safe-area.
  useEffect(() => {
    const el = bottomNavRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const measure = () => {
      const h = el.getBoundingClientRect().height;
      if (h > 0) setBottomNavHeight(Math.round(h));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  const isActive = (path: string) => {
    const base = path.split('?')[0];
    return base === '/' ? location.pathname === '/' : location.pathname.startsWith(base);
  };

  const moreActive = moreFlat.some((n) => isActive(n.path));

  // Close "More" on Escape, lock body scroll while open, auto-close on route change.
  // Also implements a focus trap so keyboard users stay within the dialog.
  useEffect(() => {
    if (!moreOpen) return;
    // Remember the element that opened the panel so we can restore focus on close.
    moreTriggerRef.current = (document.activeElement as HTMLElement) ?? null;

    const getFocusable = (): HTMLElement[] => {
      const root = morePanelRef.current;
      if (!root) return [];
      const selector =
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
      return Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(
        (el) => !el.hasAttribute('aria-hidden') && el.offsetParent !== null
      );
    };

    // Defer initial focus until the panel has mounted.
    const focusTimer = window.setTimeout(() => {
      moreCloseBtnRef.current?.focus();
    }, 0);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setMoreOpen(false);
        return;
      }
      if (e.key !== 'Tab') return;
      const focusables = getFocusable();
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      // If focus escaped the panel entirely, pull it back in.
      if (!morePanelRef.current?.contains(active)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
        return;
      }
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      // Restore focus to the trigger that opened the panel.
      moreTriggerRef.current?.focus?.();
    };
  }, [moreOpen]);

  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname, location.search]);

  const railItemClass = (active: boolean) =>
    cn(
      // Cheap transitions: only color/background interpolated; no layout/shadow churn.
      'group/rail relative flex flex-col items-center justify-center gap-1 w-[68px] py-2 rounded-xl',
      'transition-[color,background-color] duration-100 ease-out motion-reduce:transition-none',
      active
        ? 'text-primary bg-primary/[0.08] ring-1 ring-inset ring-primary/15'
        : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
    );

  const railLabelClass = (active: boolean) =>
    cn(
      'text-[10px] leading-tight text-center truncate max-w-full px-1 tracking-wide',
      active ? 'font-semibold' : 'font-medium'
    );

  return (
    <div className="min-h-screen bg-background flex">
      {/* ── Desktop Sidebar (premium icon-rail with labels) ── */}
      <aside className="hidden md:flex flex-col w-20 border-r border-border bg-card/95 backdrop-blur-sm sticky top-0 h-screen shrink-0 shadow-[inset_-1px_0_0_0_hsl(var(--border)/0.4)]">
        <Link
          to="/"
          className="flex items-center justify-center h-14 border-b border-border/70"
          title="AirBallistik"
        >
          <Target className="h-5 w-5 text-primary" />
        </Link>

        <nav className="flex-1 flex flex-col items-center gap-1 py-3 overflow-y-auto scrollbar-thin">
          {sidebarNav.map(item => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                title={t(item.labelKey)}
                className={railItemClass(active)}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[2px] rounded-r-full bg-primary" />
                )}
                <item.icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.1 : 1.85} />
                <span className={railLabelClass(active)}>{t(item.labelKey)}</span>
              </Link>
            );
          })}

          <div className="w-8 border-t border-border/60 my-2" />

          {adminNav.map(item => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                title={t(item.labelKey)}
                className={railItemClass(active)}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[2px] rounded-r-full bg-primary" />
                )}
                <item.icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.1 : 1.85} />
                <span className={railLabelClass(active)}>{t(item.labelKey)}</span>
              </Link>
            );
          })}

          {/* Desktop "More" trigger — opens grouped side panel */}
          <button
            onClick={() => setMoreOpen(true)}
            title={t('nav.more')}
            aria-label={t('nav.more')}
            className={railItemClass(moreActive)}
          >
            {moreActive && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[2px] rounded-r-full bg-primary" />
            )}
            <MoreHorizontal className="h-[18px] w-[18px]" strokeWidth={moreActive ? 2.1 : 1.85} />
            <span className={railLabelClass(moreActive)}>{t('nav.more')}</span>
          </button>
        </nav>

        <div className="flex flex-col items-center gap-1.5 py-3 border-t border-border/70 bg-card/60">
          <button
            onClick={() => setLocale(locale === 'fr' ? 'en' : 'fr')}
            title={locale === 'fr' ? 'English' : 'Français'}
            className="flex items-center justify-center gap-1.5 w-[68px] py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors duration-100 ease-out motion-reduce:transition-none"
          >
            <Globe className="h-3.5 w-3.5" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">{locale}</span>
          </button>
          <Link
            to="/settings"
            title={t('settings.theme' as any)}
            className="flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors duration-100 ease-out motion-reduce:transition-none"
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
      <nav
        ref={bottomNavRef}
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md safe-area-bottom"
      >
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
              moreActive ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] font-medium">{t('nav.more')}</span>
          </button>
        </div>
      </nav>

      {/* ── More panel — bottom sheet (mobile) / left side panel (desktop) ── */}
      {moreOpen && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-background/60 backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
          />
          <div
            ref={morePanelRef}
            className={cn(
              'fixed z-[70] bg-card border-border animate-fade-in',
              // Mobile: bottom sheet sitting flush above the actual bottom-nav height (measured at runtime).
              'left-0 right-0 border-t rounded-t-2xl safe-area-bottom max-h-[75vh] overflow-y-auto shadow-2xl',
              // Desktop: docked side panel flush against the 5rem (w-20) sidebar
              'md:bottom-0 md:right-auto md:left-20 md:top-0 md:h-screen md:w-80 md:max-h-none md:rounded-none md:border-l md:border-t-0'
            )}
            style={{ bottom: `var(--more-sheet-bottom, ${bottomNavHeight}px)` }}
            role="dialog"
            aria-modal="true"
            aria-label={t('nav.more')}
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-2 sticky top-0 bg-card z-10 border-b border-border/40">
              <span className="font-heading font-semibold text-sm">{t('nav.more')}</span>
              <button
                ref={moreCloseBtnRef}
                onClick={() => setMoreOpen(false)}
                className="p-1 text-muted-foreground rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-3 pb-6 pt-2 space-y-4">
              {moreSections.map((section) => (
                <div key={section.titleKey} className="space-y-0.5">
                  <div className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {t(section.titleKey)}
                  </div>
                  {section.items.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMoreOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 touch-target',
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
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
