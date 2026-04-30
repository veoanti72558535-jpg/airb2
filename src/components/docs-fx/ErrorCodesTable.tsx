/**
 * Renders the canonical SI error catalog and per-field range table.
 *
 * Mounted by /docs/fx as a fixed pseudo-section "errors-codes". The
 * data comes from src/lib/docs-fx/error-codes.ts which is itself driven
 * by the guardrail SI_BOUNDS — so the tables stay in sync automatically.
 *
 * Why a hard-coded React component (instead of a Markdown override)?
 *   - The catalog must NEVER be edited away by mistake. Even an admin
 *     hiding it via the editor would only hide the wrapper section, not
 *     the underlying generated tables.
 *   - Locale switches re-render instantly without re-parsing Markdown.
 */
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n';
import { ERROR_ROWS, RANGE_ROWS } from '@/lib/docs-fx/error-codes';

function severityVariant(sev: 'hard' | 'soft' | 'range'): 'destructive' | 'secondary' | 'outline' {
  if (sev === 'hard') return 'destructive';
  if (sev === 'soft') return 'secondary';
  return 'outline';
}

export function ErrorCodesTable() {
  const { t, locale } = useI18n();
  const lang: 'fr' | 'en' = locale === 'en' ? 'en' : 'fr';

  return (
    <div className="space-y-6">
      <section aria-labelledby="errors-codes-heading">
        <h3
          id="errors-codes-heading"
          className="font-heading font-semibold text-base mb-2"
        >
          {t('docsFx.errors.codesTitle')}
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          {t('docsFx.errors.codesSubtitle')}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left p-2 font-medium">{t('docsFx.errors.colCode')}</th>
                <th className="text-left p-2 font-medium">{t('docsFx.errors.colSeverity')}</th>
                <th className="text-left p-2 font-medium">{t('docsFx.errors.colCause')}</th>
                <th className="text-left p-2 font-medium">{t('docsFx.errors.colMessage')}</th>
                <th className="text-left p-2 font-medium">{t('docsFx.errors.colFix')}</th>
              </tr>
            </thead>
            <tbody>
              {ERROR_ROWS.map((row) => (
                <tr key={row.code} className="border-b border-border/50 align-top">
                  <td className="p-2 font-mono text-[11px] whitespace-nowrap">{row.code}</td>
                  <td className="p-2 whitespace-nowrap">
                    <Badge variant={severityVariant(row.severity)} className="text-[10px]">
                      {t(`docsFx.errors.severity.${row.severity}`)}
                    </Badge>
                  </td>
                  <td className="p-2">{row.cause[lang]}</td>
                  <td className="p-2 italic">{row.userMessage[lang]}</td>
                  <td className="p-2 text-muted-foreground">{row.fix[lang]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="errors-ranges-heading">
        <h3
          id="errors-ranges-heading"
          className="font-heading font-semibold text-base mb-2"
        >
          {t('docsFx.errors.rangesTitle')}
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          {t('docsFx.errors.rangesSubtitle')}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left p-2 font-medium">{t('docsFx.errors.colField')}</th>
                <th className="text-right p-2 font-medium">{t('docsFx.errors.colMin')}</th>
                <th className="text-right p-2 font-medium">{t('docsFx.errors.colMax')}</th>
                <th className="text-left p-2 font-medium">{t('docsFx.errors.colUnit')}</th>
                <th className="text-left p-2 font-medium">{t('docsFx.errors.colHint')}</th>
              </tr>
            </thead>
            <tbody>
              {RANGE_ROWS.map((row) => (
                <tr key={row.field} className="border-b border-border/50 align-top">
                  <td className="p-2 font-medium">
                    {row.label[lang]}{' '}
                    <span className="text-[10px] text-muted-foreground font-mono">
                      ({row.field})
                    </span>
                  </td>
                  <td className="p-2 text-right font-mono">{row.min}</td>
                  <td className="p-2 text-right font-mono">{row.max}</td>
                  <td className="p-2 font-mono text-[11px]">{row.unit}</td>
                  <td className="p-2 text-muted-foreground">{row.hint[lang]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default ErrorCodesTable;