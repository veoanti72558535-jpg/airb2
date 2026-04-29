/**
 * ThemeFlagsAdminCard — admin-only card to configure runtime theme behaviour.
 *
 * Renders inside `/admin/ai` (already gated by `RequireAdmin`). RLS on
 * `app_settings` is the actual security boundary — this UI is just a
 * convenience layer for admins. Non-admins reaching this code (shouldn't
 * happen via routing, but defence in depth) get a clear "denied" surface
 * because the upsert call will fail with a row-level security error and
 * we surface that message verbatim.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Palette, Loader2, Check, AlertTriangle, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { THEMES, type ThemeId } from '@/lib/theme-constants';
import {
  DEFAULT_THEME_FLAGS,
  readThemeFlags,
  writeThemeFlags,
  type ThemeFlags,
} from '@/lib/admin/theme-flags';
import { broadcastThemeFlagsUpdated } from '@/lib/admin/useThemeFlags';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function ThemeFlagsAdminCard() {
  const { t } = useI18n();
  const [flags, setFlags] = useState<ThemeFlags>(DEFAULT_THEME_FLAGS);
  const [loading, setLoading] = useState(true);
  const [save, setSave] = useState<SaveState>('idle');
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const next = await readThemeFlags().catch(() => DEFAULT_THEME_FLAGS);
      if (alive) {
        setFlags(next);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const allowedSet = useMemo(() => new Set(flags.allowedVariants), [flags.allowedVariants]);

  function update<K extends keyof ThemeFlags>(key: K, value: ThemeFlags[K]) {
    setFlags((f) => ({ ...f, [key]: value }));
    setSave('idle');
  }

  function toggleVariant(id: ThemeId) {
    setFlags((f) => {
      const has = f.allowedVariants.includes(id);
      const next = has
        ? f.allowedVariants.filter((x) => x !== id)
        : [...f.allowedVariants, id];
      return { ...f, allowedVariants: next };
    });
    setSave('idle');
  }

  async function onSave() {
    setSave('saving');
    setErrMsg(null);
    try {
      await writeThemeFlags(flags);
      broadcastThemeFlagsUpdated();
      setSave('saved');
      setTimeout(() => setSave('idle'), 2000);
    } catch (e) {
      setErrMsg((e as Error)?.message ?? String(e));
      setSave('error');
    }
  }

  function onReset() {
    setFlags({ ...DEFAULT_THEME_FLAGS });
    setSave('idle');
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Palette className="h-4 w-4 text-primary" />
          {t('admin.themeFlags.title' as any)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-[11px] text-muted-foreground">
          {t('admin.themeFlags.subtitle' as any)}
        </p>

        {loading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t('admin.themeFlags.loading' as any)}
          </div>
        ) : (
          <>
            {/* Modes */}
            <div className="space-y-3">
              <ToggleRow
                id="simple"
                label={t('admin.themeFlags.simpleMode' as any)}
                desc={t('admin.themeFlags.simpleModeDesc' as any)}
                checked={flags.simpleModeEnabled}
                onChange={(v) => update('simpleModeEnabled', v)}
              />
              <ToggleRow
                id="advanced"
                label={t('admin.themeFlags.advancedMode' as any)}
                desc={t('admin.themeFlags.advancedModeDesc' as any)}
                checked={flags.advancedModeEnabled}
                onChange={(v) => update('advancedModeEnabled', v)}
              />
              <ToggleRow
                id="studio"
                label={t('admin.themeFlags.studioRoute' as any)}
                desc={t('admin.themeFlags.studioRouteDesc' as any)}
                checked={flags.studioRouteEnabled}
                onChange={(v) => update('studioRouteEnabled', v)}
              />
              <ToggleRow
                id="darklight"
                label={t('admin.themeFlags.darkLightToggle' as any)}
                desc={t('admin.themeFlags.darkLightToggleDesc' as any)}
                checked={flags.darkLightToggleEnabled}
                onChange={(v) => update('darkLightToggleEnabled', v)}
              />
            </div>

            {/* Default theme */}
            <div className="space-y-2">
              <Label className="text-xs">{t('admin.themeFlags.defaultTheme' as any)}</Label>
              <select
                value={flags.defaultTheme}
                onChange={(e) => update('defaultTheme', e.target.value as ThemeId)}
                className={cn(
                  'w-full rounded-md border border-border bg-background px-2.5 py-2 text-xs',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                )}
              >
                {THEMES.map((th) => (
                  <option key={th.id} value={th.id}>
                    {th.labelEN} — {th.mode}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-muted-foreground">
                {t('admin.themeFlags.defaultThemeDesc' as any)}
              </p>
            </div>

            {/* Allowed variants */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">{t('admin.themeFlags.allowedVariants' as any)}</Label>
                <span className="text-[10px] text-muted-foreground">
                  {flags.allowedVariants.length === 0
                    ? t('admin.themeFlags.allAllowed' as any)
                    : `${flags.allowedVariants.length} / ${THEMES.length}`}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {THEMES.map((th) => {
                  const checked = allowedSet.has(th.id);
                  const isDefault = th.id === flags.defaultTheme;
                  return (
                    <button
                      key={th.id}
                      type="button"
                      onClick={() => toggleVariant(th.id)}
                      disabled={isDefault}
                      className={cn(
                        'flex items-center gap-2 rounded-md border px-2 py-1.5 text-left text-[11px] transition-colors',
                        checked || isDefault
                          ? 'border-primary/40 bg-primary/5'
                          : 'border-border/60 hover:bg-muted/40',
                        isDefault && 'opacity-80 cursor-not-allowed',
                      )}
                      aria-pressed={checked || isDefault}
                      title={isDefault ? t('admin.themeFlags.defaultPinned' as any) : undefined}
                    >
                      <span
                        className="h-3 w-3 rounded-full border border-border/60 shrink-0"
                        style={{ backgroundColor: th.accentColor }}
                      />
                      <span className="truncate flex-1">
                        {th.labelEN}
                      </span>
                      <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                        {th.mode}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground">
                {t('admin.themeFlags.allowedVariantsDesc' as any)}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={onReset} className="text-xs h-8">
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                {t('admin.themeFlags.reset' as any)}
              </Button>
              <Button onClick={onSave} disabled={save === 'saving'} size="sm" className="text-xs h-8">
                {save === 'saving' && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                {save === 'saved' && <Check className="h-3.5 w-3.5 mr-1.5" />}
                {save === 'error' && <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />}
                {save === 'saved'
                  ? t('admin.themeFlags.saved' as any)
                  : t('admin.themeFlags.save' as any)}
              </Button>
            </div>
            {save === 'error' && errMsg && (
              <div className="text-[11px] text-destructive border border-destructive/30 bg-destructive/5 rounded px-2 py-1.5">
                {errMsg}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ToggleRow({
  id,
  label,
  desc,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <Label htmlFor={`tf-${id}`} className="text-xs font-medium cursor-pointer">
          {label}
        </Label>
        <p className="text-[10px] text-muted-foreground leading-snug">{desc}</p>
      </div>
      <Switch id={`tf-${id}`} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
