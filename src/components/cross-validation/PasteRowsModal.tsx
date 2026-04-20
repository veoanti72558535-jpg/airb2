/**
 * BUILD — Modale "Coller des lignes" pour l'éditeur de référence
 * externe (onglet Validation externe).
 *
 * Logique pure déléguée à `paste-import.ts`. Ce composant ne fait
 * QUE :
 *   - capturer un texte tabulaire collé,
 *   - afficher un aperçu honnête (rows reconnues + warnings),
 *   - laisser l'utilisateur choisir append / replace,
 *   - renvoyer les rows finales au parent via `onConfirm`.
 *
 * Aucune fabrication de valeurs. Aucune conversion d'unités cachée.
 */

import { useMemo, useState } from 'react';
import { ClipboardPaste, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useI18n } from '@/lib/i18n';
import {
  mergeRows,
  parsePastedRows,
  type PasteImportResult,
} from '@/lib/cross-validation/paste-import';
import type { ExternalReferenceRow } from '@/lib/cross-validation/types';

export interface PasteRowsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingRows: ExternalReferenceRow[];
  onConfirm: (mergedRows: ExternalReferenceRow[]) => void;
}

type Mode = 'append' | 'replace';

const PLACEHOLDER = `range\tdrop\tvelocity\ttof
10\t3.2\t265.1\t0.0374
50\t-19.7\t245.2\t0.1957
100\t-122.1\t222.5\t0.4099`;

export function PasteRowsModal({
  open,
  onOpenChange,
  existingRows,
  onConfirm,
}: PasteRowsModalProps) {
  const { t } = useI18n();
  const [text, setText] = useState('');
  const [mode, setMode] = useState<Mode>('append');

  const result: PasteImportResult | null = useMemo(() => {
    if (text.trim() === '') return null;
    return parsePastedRows(text);
  }, [text]);

  const handleConfirm = () => {
    if (!result || !result.ok || result.rows.length === 0) return;
    const next = mergeRows(existingRows, result.rows, mode);
    onConfirm(next);
    setText('');
    onOpenChange(false);
  };

  const handleCancel = () => {
    setText('');
    onOpenChange(false);
  };

  const unknownCols = result?.warnings.filter((w) => w.kind === 'unknown-column') ?? [];
  const incompleteRows = result?.warnings.filter((w) => w.kind === 'incomplete-row') ?? [];
  const nonNumeric = result?.warnings.filter((w) => w.kind === 'non-numeric-value') ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
        data-testid="paste-rows-modal"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardPaste className="h-4 w-4" />
            {t('crossValidation.paste.title')}
          </DialogTitle>
          <DialogDescription>{t('crossValidation.paste.subtitle')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="paste-input" className="text-xs">
              {t('crossValidation.paste.inputLabel')}
            </Label>
            <Textarea
              id="paste-input"
              data-testid="paste-rows-textarea"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={PLACEHOLDER}
              rows={8}
              className="font-mono text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              {t('crossValidation.paste.formats')}
            </p>
          </div>

          {result && (
            <div className="space-y-3" data-testid="paste-rows-preview">
              {result.ok === false && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    {result.error === 'empty-input'
                      ? t('crossValidation.paste.errorEmpty')
                      : t('crossValidation.paste.errorPrefix') + ' ' + result.error}
                  </AlertDescription>
                </Alert>
              )}

              {result.ok && (
                <>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="default" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {t('crossValidation.paste.recognised', { n: result.rows.length })}
                    </Badge>
                    {result.separator && (
                      <Badge variant="outline">
                        {t('crossValidation.paste.separator')}: {result.separator}
                      </Badge>
                    )}
                    {incompleteRows.length > 0 && (
                      <Badge variant="destructive">
                        {t('crossValidation.paste.rejected', { n: incompleteRows.length })}
                      </Badge>
                    )}
                    {unknownCols.length > 0 && (
                      <Badge variant="secondary">
                        {t('crossValidation.paste.unknownCols', { n: unknownCols.length })}
                      </Badge>
                    )}
                  </div>

                  {(unknownCols.length > 0 ||
                    incompleteRows.length > 0 ||
                    nonNumeric.length > 0) && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <ul className="text-[11px] space-y-0.5 list-disc pl-4">
                          {[...unknownCols, ...incompleteRows, ...nonNumeric]
                            .slice(0, 8)
                            .map((w, i) => (
                              <li key={i}>
                                <span className="opacity-70">L{w.line}:</span> {w.detail}
                              </li>
                            ))}
                          {unknownCols.length + incompleteRows.length + nonNumeric.length >
                            8 && (
                            <li className="opacity-70">
                              …+
                              {unknownCols.length +
                                incompleteRows.length +
                                nonNumeric.length -
                                8}
                            </li>
                          )}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  {result.rows.length > 0 && (
                    <div className="border rounded-md overflow-x-auto">
                      <table className="w-full text-xs" data-testid="paste-rows-table">
                        <thead className="bg-muted/40 text-muted-foreground">
                          <tr>
                            <th className="text-left font-normal py-1.5 px-2">range</th>
                            <th className="text-left font-normal py-1.5 px-2">drop</th>
                            <th className="text-left font-normal py-1.5 px-2">velocity</th>
                            <th className="text-left font-normal py-1.5 px-2">tof</th>
                            <th className="text-left font-normal py-1.5 px-2">windDrift</th>
                            <th className="text-left font-normal py-1.5 px-2">energy</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.rows.slice(0, 20).map((r, i) => (
                            <tr key={i} className="border-t">
                              <td className="py-1 px-2 font-mono">{r.range}</td>
                              <td className="py-1 px-2 font-mono">
                                {r.drop ?? <span className="opacity-30">—</span>}
                              </td>
                              <td className="py-1 px-2 font-mono">
                                {r.velocity ?? <span className="opacity-30">—</span>}
                              </td>
                              <td className="py-1 px-2 font-mono">
                                {r.tof ?? <span className="opacity-30">—</span>}
                              </td>
                              <td className="py-1 px-2 font-mono">
                                {r.windDrift ?? <span className="opacity-30">—</span>}
                              </td>
                              <td className="py-1 px-2 font-mono">
                                {r.energy ?? <span className="opacity-30">—</span>}
                              </td>
                            </tr>
                          ))}
                          {result.rows.length > 20 && (
                            <tr>
                              <td
                                colSpan={6}
                                className="py-1.5 px-2 text-center text-muted-foreground italic"
                              >
                                …+{result.rows.length - 20}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="space-y-2 pt-1">
                    <Label className="text-xs">{t('crossValidation.paste.modeLabel')}</Label>
                    <RadioGroup
                      value={mode}
                      onValueChange={(v) => setMode(v as Mode)}
                      className="flex gap-4"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="append" id="mode-append" data-testid="mode-append" />
                        <Label htmlFor="mode-append" className="text-xs cursor-pointer">
                          {t('crossValidation.paste.modeAppend')}
                          <span className="opacity-60 ml-1">({existingRows.length})</span>
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem
                          value="replace"
                          id="mode-replace"
                          data-testid="mode-replace"
                        />
                        <Label htmlFor="mode-replace" className="text-xs cursor-pointer">
                          {t('crossValidation.paste.modeReplace')}
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={handleCancel}>
            <X className="h-4 w-4 mr-1" />
            {t('crossValidation.paste.cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!result || !result.ok || result.rows.length === 0}
            data-testid="paste-rows-confirm"
          >
            {t('crossValidation.paste.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}