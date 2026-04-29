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
import type { LucideIcon } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { RailItem, railItemClass } from '@/components/sidebar/RailItem';
import { useRovingFocus } from '@/lib/hooks/useRovingFocus';
import { useA11y } from '@/lib/a11y';

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
type MoreItem = { path: string; icon: LucideIcon; labelKey: any };
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
  const { sidebarFocusBehavior } = useA11y();
  const moreCloseBtnRef = useRef<HTMLButtonElement | null>(null);
  const morePanelRef = useRef<HTMLDivElement | null>(null);
  const moreTriggerRef = useRef<HTMLElement | null>(null);
  const bottomNavRef = useRef<HTMLElement | null>(null);
  const [bottomNavHeight, setBottomNavHeight] = useState(56);

  // Refs powering the sidebar focus-handoff after toggle.
  // ── sidebarNavRef:    container we query for the first/last rail item.
  // ── sidebarToggleRef: the collapse/expand button itself, always visible
  //                     so it is a safe focus target when collapsing.
  // ── pendingFocusRef:  set by `toggleSidebar` so the post-render effect
  //                     knows WHICH side of the handoff to perform without
  //                     reacting to the initial mount (preventing the page
  //                     from auto-focusing the sidebar on first paint).
  const sidebarNavRef = useRef<HTMLElement | null>(null);
  const sidebarToggleRef = useRef<HTMLButtonElement | null>(null);
  const pendingFocusRef = useRef<'expand' | 'collapse' | null>(null);

  // Arrow-key navigation inside the sidebar nav and the mobile bottom nav.
  // Tab order is preserved; this only adds APG-style affordances on top.
  const onSidebarKeyDown = useRovingFocus('vertical');
  const onBottomNavKeyDown = useRovingFocus('horizontal');

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

  // Localised labels reused across rail items + announcer. Memoised against
  // locale changes only so we don't rebuild every render.
  const a11yActive = t('a11y.current' as any) || (locale === 'fr' ? 'page actuelle' : 'current page');

  // Live-region announcement: route changes + sidebar expansion. We keep a
  // single string and bump it on either change so AT users hear a concise
  // status when they collapse/expand the rail or land on a new page.
  const [a11yStatus, setA11yStatus] = useState('');

  const [isSidebarExpanded, setIsSidebarExpanded] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('airballistik_sidebar_expanded');
      if (saved !== null) return saved === 'true';
      return window.innerWidth >= 1280;
    }
    return true;
  });

  const toggleSidebar = () => {
    const newState = !isSidebarExpanded;
    setIsSidebarExpanded(newState);
    localStorage.setItem('airballistik_sidebar_expanded', String(newState));
    // Mark which handoff the post-render effect should perform. We cannot
    // move focus synchronously here because the new layout (revealed labels
    // / new geometry) hasn't painted yet — so the target rail item may not
    // be focusable until React commits.
    pendingFocusRef.current = newState ? 'expand' : 'collapse';
    // Announce the new sidebar state on the polite live region. Using a
    // freshly-formatted string (with timestamp suffix when identical) is
    // unnecessary here: collapsed → expanded always alternates, so the
    // announcement string differs and AT picks up every change.
    setA11yStatus(
      newState
        ? (t('a11y.sidebarExpanded' as any) || (locale === 'fr' ? 'Barre latérale développée' : 'Sidebar expanded'))
        : (t('a11y.sidebarCollapsed' as any) || (locale === 'fr' ? 'Barre latérale réduite' : 'Sidebar collapsed'))
    );
  };

  // Post-toggle focus handoff. Runs after the sidebar has re-rendered with
  // the new width / labels, so query selectors hit the freshly-mounted DOM.
  // Only fires when `pendingFocusRef` was set by `toggleSidebar` — meaning
  // first mount, hot-reload state restore, or external setState calls do NOT
  // steal focus from wherever the user currently is.
  useEffect(() => {
    const intent = pendingFocusRef.current;
    if (!intent) return;
    pendingFocusRef.current = null;

    if (intent === 'expand') {
      // Honour the user's focus-behavior preference:
      //  • 'active' → focus the rail item matching the current route
      //               (`aria-current="page"`), so AT users immediately hear
      //               where they are within the now-expanded sidebar.
      //  • 'first'  → focus the first interactive rail item so the user
      //               can start navigating freshly-revealed labels with
      //               arrow keys (default; matches APG menubar guidance).
      const root = sidebarNavRef.current;
      if (root) {
        const target =
          sidebarFocusBehavior === 'active'
            ? (root.querySelector<HTMLElement>('[aria-current="page"]') ??
               root.querySelector<HTMLElement>('a[href], button:not([disabled])'))
            : root.querySelector<HTMLElement>('a[href], button:not([disabled])');
        if (target) {
          target.focus();
          return;
        }
      }
      // Fallback: if the nav lost its children for some reason, anchor on
      // the toggle so focus never falls back to <body>.
      sidebarToggleRef.current?.focus();
      return;
    }

    // Collapsing: park focus on the toggle. The previously-focused rail
    // item may have shrunk / become visually ambiguous, and the toggle is
    // the only element guaranteed to remain in the same on-screen position.
    sidebarToggleRef.current?.focus();
  }, [isSidebarExpanded]);

  // Hint appended to icon-only rail items so screen readers convey both the
  // destination AND the visual state ("collapsed sidebar"). On the expanded
  // variant the visible label already carries the meaning.
  const collapsedRailHint = !isSidebarExpanded
    ? (t('a11y.collapsedRail' as any) || (locale === 'fr' ? 'barre réduite' : 'collapsed rail'))
    : undefined;

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

      const navKeys = ['Tab', 'ArrowDown', 'ArrowUp', 'Home', 'End'];
      if (!navKeys.includes(e.key)) return;

      const focusables = getFocusable();
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      const idx = active ? focusables.indexOf(active) : -1;

      // If focus escaped the panel entirely, pull it back in.
      if (!morePanelRef.current?.contains(active)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
        return;
      }

      if (e.key === 'Tab') {
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
        return;
      }

      // Arrow / Home / End — circular navigation between menu items.
      e.preventDefault();
      if (e.key === 'Home') {
        first.focus();
      } else if (e.key === 'End') {
        last.focus();
      } else if (e.key === 'ArrowDown') {
        const next = idx < 0 ? 0 : (idx + 1) % focusables.length;
        focusables[next].focus();
      } else if (e.key === 'ArrowUp') {
        const prev = idx <= 0 ? focusables.length - 1 : idx - 1;
        focusables[prev].focus();
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

  // Announce route changes on the polite live region. We look up the
  // currently-active nav entry by path so the message is meaningful
  // ("Sessions, current page") rather than the raw URL.
  useEffect(() => {
    const all = [...sidebarNav, ...adminNav, ...moreFlat];
    const match = all.find((n) => isActive(n.path));
    if (!match) return;
    const labelText = t(match.labelKey as any) || match.path;
    setA11yStatus(`${labelText} — ${a11yActive}`);
    // Intentionally not depending on `t`/`a11yActive` to avoid a re-announce
    // storm on locale toggles; the locale-change effect would handle that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex selection:bg-primary/30">
      {/* Skip link — first focusable element, jumps past the nav rails. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
      >
        {t('a11y.skipToContent' as any) || 'Aller au contenu'}
      </a>

      {/* ── Desktop Sidebar (premium collapsible sidebar) ── */}
      <aside 
        id="app-sidebar"
        aria-label={t('nav.primary' as any) || 'Navigation principale'}
        aria-expanded={isSidebarExpanded}
        data-state={isSidebarExpanded ? 'expanded' : 'collapsed'}
        className={cn(
          "hidden md:flex flex-col border-r border-border/40 bg-card/50 backdrop-blur-xl sticky top-0 h-screen shrink-0 transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] z-40",
          isSidebarExpanded ? "w-64" : "w-20 items-center"
        )}
      >
        <div className={cn(
          "flex items-center h-14 border-b border-border/40 px-3",
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
            <Link to="/" className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 shadow-[0_0_15px_rgba(var(--primary),0.1)]">
              <Target className="h-6 w-6" />
            </Link>
          )}
        </div>

        <nav
          ref={sidebarNavRef as React.RefObject<HTMLElement>}
          aria-label={t('nav.primary' as any) || 'Navigation principale'}
          onKeyDown={onSidebarKeyDown}
          className="flex-1 flex flex-col gap-1 py-4 overflow-y-auto scrollbar-thin px-3"
        >
          {sidebarNav.map(item => (
            <RailItem
              key={item.path}
              to={item.path}
              icon={item.icon}
              label={isSidebarExpanded ? t(item.labelKey) : undefined}
              title={!isSidebarExpanded ? t(item.labelKey) : undefined}
              active={isActive(item.path)}
              activeLabelSuffix={a11yActive}
              collapsedHint={collapsedRailHint}
              className={cn(
                "transition-all duration-200",
                isSidebarExpanded ? "px-3 py-2.5 justify-start gap-3 w-full" : "w-12 h-12 justify-center"
              )}
            />
          ))}

          <div className={cn("border-t border-border/60 my-2", isSidebarExpanded ? "mx-3" : "w-8")} />

          {adminNav.map(item => (
            <RailItem
              key={item.path}
              to={item.path}
              icon={item.icon}
              label={isSidebarExpanded ? t(item.labelKey) : undefined}
              title={!isSidebarExpanded ? t(item.labelKey) : undefined}
              active={isActive(item.path)}
              activeLabelSuffix={a11yActive}
              collapsedHint={collapsedRailHint}
              className={cn(
                "transition-all duration-200 text-amber-500/80",
                isSidebarExpanded ? "px-3 py-2.5 justify-start gap-3 w-full" : "w-12 h-12 justify-center"
              )}
            />
          ))}

          <RailItem
            onClick={() => setMoreOpen(true)}
            icon={MoreHorizontal}
            label={isSidebarExpanded ? t('nav.more') : undefined}
            title={!isSidebarExpanded ? t('nav.more') : undefined}
            ariaLabel={t('nav.more')}
            ariaExpanded={moreOpen}
            ariaControls="more-panel"
            isDisclosure
            collapsedHint={collapsedRailHint}
            active={moreActive}
            className={cn(
              "transition-all duration-200 mt-auto",
              isSidebarExpanded ? "px-3 py-2.5 justify-start gap-3 w-full" : "w-12 h-12 justify-center"
            )}
          />
        </nav>

        <div className="p-3 border-t border-border/40 space-y-2">
          <button
            ref={sidebarToggleRef}
            onClick={toggleSidebar}
            type="button"
            aria-expanded={isSidebarExpanded}
            aria-controls="app-sidebar"
            aria-label={isSidebarExpanded ? (t('a11y.collapseSidebar' as any) || 'Réduire la barre latérale') : (t('a11y.expandSidebar' as any) || 'Développer la barre latérale')}
            className={cn(
              "hidden md:flex items-center justify-center w-full h-10 rounded-lg hover:bg-muted transition-colors text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
              !isSidebarExpanded && "rotate-180"
            )}
            title={isSidebarExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
          >
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </button>
          
          <div className={cn("flex flex-col gap-2", isSidebarExpanded ? "items-stretch" : "items-center")}>
            <button
              onClick={() => setLocale(locale === 'fr' ? 'en' : 'fr')}
              type="button"
              aria-label={`${t('a11y.switchLocale' as any) || 'Changer la langue'} (${locale.toUpperCase()})`}
              className={cn(
                "flex items-center gap-3 h-10 rounded-lg hover:bg-muted transition-all px-3 text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                !isSidebarExpanded && "justify-center px-0 w-10"
              )}
            >
              <Globe aria-hidden="true" className="h-4 w-4 shrink-0" />
              {isSidebarExpanded && <span className="text-xs font-semibold uppercase tracking-wider">{locale}</span>}
            </button>
            <Link
              to="/settings"
              aria-label={t('settings.theme' as any) || 'Thème'}
              className={cn(
                "flex items-center gap-3 h-10 rounded-lg hover:bg-muted transition-all px-3 text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                !isSidebarExpanded && "justify-center px-0 w-10"
              )}
            >
              {isDark
                ? <Sun aria-hidden="true" className="h-4 w-4 shrink-0" />
                : <Moon aria-hidden="true" className="h-4 w-4 shrink-0" />}
              {isSidebarExpanded && <span className="text-xs font-medium">{t('settings.theme' as any)}</span>}
            </Link>
            {user && (
              <button
                onClick={() => signOut()}
                type="button"
                aria-label={`${t('a11y.signOut' as any) || 'Se déconnecter'} (${user.email ?? ''})`}
                className={cn(
                  "flex items-center gap-3 h-10 rounded-lg hover:bg-muted transition-all px-3 text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                  !isSidebarExpanded && "justify-center px-0 w-10"
                )}
              >
                <div aria-hidden="true" className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                  {(user.email ?? '?')[0].toUpperCase()}
                </div>
                {isSidebarExpanded && <span className="text-xs truncate max-w-[120px]">{user.email}</span>}
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0 relative">
        <main id="main-content" tabIndex={-1} className="flex-1 px-4 sm:px-6 md:px-8 py-6 pb-24 md:pb-8 w-full mx-auto max-w-[1600px] animate-fade-in outline-none">
          {children}
        </main>
      </div>

      {/* Polite live region — announces sidebar collapse/expand and route
          changes without stealing focus. Visually hidden via .sr-only. */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {a11yStatus}
      </div>

      {/* ── Mobile Bottom Nav ── */}
      <nav
        ref={bottomNavRef}
        aria-label={t('nav.primary' as any) || 'Navigation principale'}
        onKeyDown={onBottomNavKeyDown}
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md safe-area-bottom"
      >
        {/*
          Tightened mobile bottom-nav:
          - h-12 (48px) instead of h-14 (56px) → less visual weight
          - gap-0 between icon and label, fixed leading-none to lock vertical rhythm
          - min-w-0 + truncate on label so a longer FR string never reflows the row
        */}
        <div className="flex items-stretch justify-around h-12 px-1">
          {bottomNav.map(item => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                aria-current={active ? 'page' : undefined}
                aria-label={`${t(item.labelKey)}${active ? ` (${a11yActive})` : ''}`}
                data-state={active ? 'active' : 'inactive'}
                className={cn(
                  'flex-1 min-w-0 flex flex-col items-center justify-center gap-[3px] px-2 rounded-md',
                  'transition-colors duration-150 touch-target relative',
                  // Inset ring: bottom-nav items are edge-flush against the
                  // card's top border and against neighbouring siblings, so
                  // an offset ring would always be clipped on at least one
                  // side. Inset keeps the 2px halo perfectly contained.
                  'outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-[2px] rounded-full bg-primary" />
                )}
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                <span className="text-[9px] leading-none font-medium tracking-wide truncate max-w-full">
                  {t(item.labelKey)}
                </span>
              </Link>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            type="button"
            aria-label={t('nav.more')}
            aria-expanded={moreOpen}
            aria-controls="more-panel"
            aria-haspopup="dialog"
            data-state={moreActive ? 'active' : 'inactive'}
            className={cn(
              'flex-1 min-w-0 flex flex-col items-center justify-center gap-[3px] px-2 rounded-md',
              'transition-colors duration-150 touch-target',
              'outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
              moreActive ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <MoreHorizontal className="h-[18px] w-[18px] shrink-0" />
            <span className="text-[9px] leading-none font-medium tracking-wide truncate max-w-full">
              {t('nav.more')}
            </span>
          </button>
        </div>
      </nav>

      {/* ── More panel — bottom sheet (mobile) / left side panel (desktop) ── */}
      {moreOpen && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-background/60 backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={morePanelRef}
            id="more-panel"
            className={cn(
              'fixed z-[70] bg-card border-border animate-fade-in',
              // Mobile: bottom sheet sitting flush above the actual bottom-nav height
              // (measured at runtime via --bottom-nav-h, falling back to 56px).
              'left-0 right-0 bottom-[var(--bottom-nav-h,56px)] border-t rounded-t-2xl safe-area-bottom max-h-[75vh] overflow-y-auto shadow-2xl',
              // Desktop: docked side panel flush against the 5rem (w-20) sidebar
              'md:bottom-0 md:right-auto md:left-20 md:top-0 md:h-screen md:w-80 md:max-h-none md:rounded-none md:border-l md:border-t-0'
            )}
            style={{ ['--bottom-nav-h' as any]: `${bottomNavHeight}px` }}
            role="dialog"
            aria-modal="true"
            aria-label={t('nav.more')}
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-2 sticky top-0 bg-card z-10 border-b border-border/40">
              <span className="font-heading font-semibold text-sm">{t('nav.more')}</span>
              <button
                ref={moreCloseBtnRef}
                onClick={() => setMoreOpen(false)}
                className="p-1 text-muted-foreground rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card transition-shadow"
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
                    (() => { const active = isActive(item.path); return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMoreOpen(false)}
                      aria-current={active ? 'page' : undefined}
                      aria-label={`${t(item.labelKey)}${active ? ` (${a11yActive})` : ''}`}
                      data-state={active ? 'active' : 'inactive'}
                      className={cn(
                        'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 touch-target',
                        // Items live inside a padded panel — keep an offset
                        // ring (so the halo reads as separate from the row
                        // background) but reduce the offset to 1px so it
                        // never touches the panel's inner edge.
                        'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card focus-visible:bg-muted/60',
                        active
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="flex-1">{t(item.labelKey)}</span>
                      <ChevronRight className="h-4 w-4 opacity-40" />
                    </Link>
                    ); })()
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
