import { useRef, useState } from 'react';
import { Upload, X, Check, AlertTriangle, FileText, Trash2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { DragTablePoint } from '@/lib/types';
import { parseDragTable, dragTableToCsv, DragTableParseError } from '@/lib/drag-table';
import { toast } from '@/hooks/use-toast';

interface Props {
  value: DragTablePoint[] | undefined;
  onChange: (table: DragTablePoint[] | undefined) => void;
}

/**
 * Drop-zone + textarea editor for a custom Cd/Mach drag table.
 * Accepts CSV (mach,cd) or JSON. Parses, validates, and previews
 * the first few points before committing.
 */
export function DragTableEditor({ value, onChange }: Props) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<string>(() => (value ? dragTableToCsv(value) : ''));
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tryApply = (text: string) => {
    setDraft(text);
    if (!text.trim()) {
      setError(null);
      setWarnings([]);
      return null;
    }
    try {
      const { table, warnings } = parseDragTable(text);
      setError(null);
      setWarnings(warnings);
      return table;
    } catch (e) {
      const msg = e instanceof DragTableParseError ? e.message : (e as Error).message;
      setError(msg);
      setWarnings([]);
      return null;
    }
  };

  const handleApply = () => {
    const table = tryApply(draft);
    if (table) {
      onChange(table);
      toast({ title: t('projectiles.dragTableApplied', { count: table.length }) });
    }
  };

  const handleClear = () => {
    setDraft('');
    setError(null);
    setWarnings([]);
    onChange(undefined);
  };

  const handleFile = async (file: File) => {
    const text = await file.text();
    tryApply(text);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-medium text-foreground">
          {t('projectiles.dragTableTitle')}
        </label>
        <div className="flex items-center gap-1">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.json,.txt,text/csv,application/json,text/plain"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded border border-border hover:bg-muted/40"
          >
            <Upload className="h-3 w-3" /> {t('projectiles.dragTableFile')}
          </button>
          {value && value.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded border border-border text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3 w-3" /> {t('common.clear')}
            </button>
          )}
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground">
        {t('projectiles.dragTableHint')}
      </p>

      <textarea
        value={draft}
        onChange={e => tryApply(e.target.value)}
        onDragOver={e => e.preventDefault()}
        onDrop={onDrop}
        placeholder={'mach,cd\n0.5,0.235\n0.7,0.235\n0.9,0.45\n1.0,0.59\n1.2,0.55'}
        rows={6}
        className="w-full bg-muted border border-border rounded-md px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
      />

      {error && (
        <div className="flex items-start gap-2 text-[11px] text-destructive bg-destructive/10 border border-destructive/30 rounded-md p-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="flex items-start gap-2 text-[11px] text-warning bg-warning/10 border border-warning/30 rounded-md p-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <ul className="space-y-0.5">
            {warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      {value && value.length > 0 && (
        <div className="surface-card p-2 space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] text-tactical font-medium">
            <Check className="h-3 w-3" />
            {t('projectiles.dragTableActive', { count: value.length })}
          </div>
          <div className="text-[10px] text-muted-foreground font-mono">
            Mach {value[0].mach}–{value[value.length - 1].mach} ·
            Cd {Math.min(...value.map(p => p.cd)).toFixed(3)}–{Math.max(...value.map(p => p.cd)).toFixed(3)}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleApply}
          disabled={!draft.trim() || !!error}
          className="px-3 py-1.5 text-xs font-medium rounded bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 inline-flex items-center gap-1"
        >
          <FileText className="h-3.5 w-3.5" />
          {t('projectiles.dragTableApply')}
        </button>
      </div>
    </div>
  );
}
