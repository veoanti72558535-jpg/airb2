/**
 * Detail level (Simple / Advanced) — shared UI state for the
 * "Sécurité IA" admin page (and any sibling component that wants
 * to expose contextualized explanations).
 *
 * The choice is persisted in localStorage so an admin who prefers
 * the verbose Advanced view doesn't have to flip the switch on
 * every visit.
 *
 * Components consume the level via `useDetailLevel()` and render
 * either a short (simple) or detailed (advanced) explanation. The
 * UI itself is bilingual via `useI18n` (FR/EN) — this hook stays
 * locale-agnostic.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Eye, Wrench } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export type DetailLevel = 'simple' | 'advanced';

const STORAGE_KEY = 'airballistik:admin-ai:detail-level';

interface Ctx {
  level: DetailLevel;
  setLevel: (l: DetailLevel) => void;
  isAdvanced: boolean;
}

const DetailLevelCtx = createContext<Ctx | null>(null);

function readInitial(): DetailLevel {
  if (typeof window === 'undefined') return 'simple';
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === 'advanced' ? 'advanced' : 'simple';
  } catch {
    return 'simple';
  }
}

export function DetailLevelProvider({ children }: { children: React.ReactNode }) {
  const [level, setLevelState] = useState<DetailLevel>(() => readInitial());

  const setLevel = useCallback((l: DetailLevel) => {
    setLevelState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* storage may be disabled — silently ignore */
    }
  }, []);

  const value = useMemo<Ctx>(
    () => ({ level, setLevel, isAdvanced: level === 'advanced' }),
    [level, setLevel],
  );

  return <DetailLevelCtx.Provider value={value}>{children}</DetailLevelCtx.Provider>;
}

/**
 * Returns the current detail level. Safe to call outside the
 * provider — falls back to "simple" so individual cards keep
 * working even if mounted standalone.
 */
export function useDetailLevel(): Ctx {
  const ctx = useContext(DetailLevelCtx);
  if (ctx) return ctx;
  return { level: 'simple', setLevel: () => {}, isAdvanced: false };
}

/**
 * Compact segmented switch (Simple ↔ Advanced) intended for the
 * page header. Bilingual labels are pulled from i18n.
 */
export function DetailLevelToggle({ className }: { className?: string }) {
  const { t } = useI18n();
  const { level, setLevel } = useDetailLevel();

  const items: Array<{ key: DetailLevel; label: string; icon: typeof Eye; tip: string }> = [
    {
      key: 'simple',
      label: t('admin.ai.detail.simple' as any),
      icon: Eye,
      tip: t('admin.ai.detail.simpleHint' as any),
    },
    {
      key: 'advanced',
      label: t('admin.ai.detail.advanced' as any),
      icon: Wrench,
      tip: t('admin.ai.detail.advancedHint' as any),
    },
  ];

  return (
    <div
      role="radiogroup"
      aria-label={t('admin.ai.detail.label' as any)}
      className={cn(
        'inline-flex items-center rounded-md border border-border/60 bg-muted/30 p-0.5 text-xs',
        className,
      )}
      data-testid="admin-ai-detail-toggle"
    >
      {items.map((item) => {
        const active = level === item.key;
        const Icon = item.icon;
        return (
          <button
            key={item.key}
            type="button"
            role="radio"
            aria-checked={active}
            title={item.tip}
            onClick={() => setLevel(item.key)}
            data-testid={`admin-ai-detail-${item.key}`}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[5px] transition-colors',
              active
                ? 'bg-background text-foreground shadow-sm border border-border/60'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-3 w-3" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Inline helper text that adapts to the current detail level.
 * Pass two i18n keys: a short one (always visible) and a longer
 * one (only rendered in Advanced mode).
 *
 * Both keys must exist in `src/lib/translations.ts`.
 */
export function ContextualHint({
  simpleKey,
  advancedKey,
  className,
}: {
  simpleKey: string;
  advancedKey?: string;
  className?: string;
}) {
  const { t } = useI18n();
  const { isAdvanced } = useDetailLevel();
  return (
    <p className={cn('text-[11px] text-muted-foreground', className)}>
      {t(simpleKey as any)}
      {isAdvanced && advancedKey ? <> · <span className="opacity-90">{t(advancedKey as any)}</span></> : null}
    </p>
  );
}

/**
 * Wrapper that only renders its children when in Advanced mode.
 * Useful for SQL excerpts, internal IDs, source-file paths, etc.
 */
export function AdvancedOnly({ children }: { children: React.ReactNode }) {
  const { isAdvanced } = useDetailLevel();
  if (!isAdvanced) return null;
  return <>{children}</>;
}
