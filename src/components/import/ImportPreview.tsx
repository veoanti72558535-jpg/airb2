import React, { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  Wand2,
} from 'lucide-react';
import type {
  ImportPreview as ImportPreviewType,
  ImportSanitizationNote,
  ImportRejectionIssue,
} from '@/lib/import-pipeline';

/**
 * Tranche F.3 — Composant de preview d'import.
 *
 * Honnête par défaut : l'ordre d'affichage est `rejected → sanitized →
 * duplicate → ok` pour que l'utilisateur voie d'abord ce qui pose
 * problème. Les libellés sont sobres, sans marketing.
 *
 * Lit uniquement la sortie produite par `runImportPreview` (Tranche F.2).
 * AUCUNE re-validation, AUCUNE écriture, AUCUNE logique métier ici.
 */
export interface ImportPreviewProps {
  preview: ImportPreviewType;
}

function describeItem(
  data: unknown,
): string {
  if (!data || typeof data !== 'object') return '—';
  const d = data as Record<string, unknown>;
  // Projectile : brand model weight gr
  if (typeof d.brand === 'string' && typeof d.model === 'string' && typeof d.weight === 'number') {
    return `${d.brand} ${d.model} (${d.weight} gr)`;
  }
  // Optic : name
  if (typeof d.name === 'string') return d.name;
  // Reticle : brand model
  if (typeof d.brand === 'string' && typeof d.model === 'string') {
    return `${d.brand} ${d.model}`;
  }
  return '—';
}

function formatIssues(issues?: ImportRejectionIssue[]): string {
  if (!issues || issues.length === 0) return '';
  return issues
    .map(i => {
      const path = i.path.length > 0 ? i.path.join('.') : '·';
      return `${path}: ${i.message}`;
    })
    .join(' · ');
}

function formatNotes(notes?: ImportSanitizationNote[]): string {
  if (!notes || notes.length === 0) return '';
  return notes.map(n => n.message).join(' · ');
}

export function ImportPreview({ preview }: ImportPreviewProps) {
  const { t } = useI18n();

  if (preview.fatalError) {
    return (
      <div
        role="alert"
        data-testid="import-preview-fatal"
        className="surface-elevated p-3 border border-destructive/40 text-sm"
      >
        <div className="flex items-center gap-2 text-destructive font-medium">
          <AlertTriangle className="h-4 w-4" />
          {preview.fatalError.code === 'payload-too-large'
            ? t('import.fileTooLarge')
            : t('import.fileInvalid')}
        </div>
        <div className="text-xs text-muted-foreground mt-1 break-all">
          {preview.fatalError.message}
        </div>
      </div>
    );
  }

  const rejected = preview.items.filter(i => i.status === 'rejected');
  const sanitized = preview.items.filter(i => i.status === 'sanitized');
  const duplicates = preview.items.filter(i => i.status === 'duplicate');
  const ok = preview.items.filter(i => i.status === 'ok');

  // Garde-fou rendu : avec des imports massifs (bullets4 = 8732 items),
  // rendre toutes les <li> fait exploser React (call stack + DOM lourd).
  // On affiche au maximum MAX_RENDER items par section + un footer "+N autres".
  const MAX_RENDER = 50;
  const slice = <T,>(arr: T[]) => arr.slice(0, MAX_RENDER);
  const moreLabel = (total: number) =>
    total > MAX_RENDER ? `+${total - MAX_RENDER} ${t('import.moreItems')}` : null;

  return (
    <div className="space-y-3 text-sm" data-testid="import-preview">
      {/* Compteurs */}
      <div className="grid grid-cols-5 gap-2 text-center text-[11px]">
        <Counter label={t('import.summary.total')} value={preview.total} />
        <Counter label={t('import.summary.rejected')} value={preview.rejectedCount} tone="destructive" />
        <Counter label={t('import.summary.sanitized')} value={preview.sanitizedCount} tone="warning" />
        <Counter label={t('import.summary.duplicates')} value={preview.duplicateCount} tone="muted" />
        <Counter label={t('import.summary.ok')} value={preview.okCount} tone="success" />
      </div>

      {/* Sections — ordre obligatoire : rejected → sanitized → duplicate → ok */}
      <Section
        testId="section-rejected"
        title={t('import.section.rejected')}
        count={rejected.length}
        icon={<AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
        more={moreLabel(rejected.length)}
      >
        {slice(rejected).map(item => (
          <li key={`r-${item.index}`} className="text-xs">
            <span className="text-muted-foreground">#{item.index + 1}</span>{' '}
            <span className="text-destructive">{formatIssues(item.issues) || '—'}</span>
          </li>
        ))}
      </Section>

      <Section
        testId="section-sanitized"
        title={t('import.section.sanitized')}
        count={sanitized.length}
        icon={<Wand2 className="h-3.5 w-3.5 text-warning" />}
        more={moreLabel(sanitized.length)}
      >
        {slice(sanitized).map(item => (
          <li key={`s-${item.index}`} className="text-xs">
            <span className="font-medium">{describeItem(item.data)}</span>{' '}
            <span className="text-muted-foreground">— {formatNotes(item.notes)}</span>
          </li>
        ))}
      </Section>

      <Section
        testId="section-duplicates"
        title={t('import.section.duplicates')}
        count={duplicates.length}
        icon={<Copy className="h-3.5 w-3.5 text-muted-foreground" />}
        more={moreLabel(duplicates.length)}
      >
        {slice(duplicates).map(item => (
          <li key={`d-${item.index}`} className="text-xs text-muted-foreground">
            {describeItem(item.data)}
          </li>
        ))}
      </Section>

      <Section
        testId="section-ok"
        title={t('import.section.ok')}
        count={ok.length}
        icon={<CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
        more={moreLabel(ok.length)}
      >
        {slice(ok).map(item => (
          <li key={`o-${item.index}`} className="text-xs">
            {describeItem(item.data)}
          </li>
        ))}
      </Section>
    </div>
  );
}

function Counter({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'destructive' | 'warning' | 'muted' | 'success';
}) {
  const toneClass =
    tone === 'destructive'
      ? 'text-destructive'
      : tone === 'warning'
        ? 'text-warning'
        : tone === 'success'
          ? 'text-primary'
          : tone === 'muted'
            ? 'text-muted-foreground'
            : 'text-foreground';
  return (
    <div className="surface-elevated p-2">
      <div className={`font-mono font-bold text-base ${toneClass}`}>{value}</div>
      <div className="text-muted-foreground">{label}</div>
    </div>
  );
}

function Section({
  title,
  count,
  icon,
  testId,
  more,
  defaultOpen = false,
  children,
}: {
  title: string;
  count: number;
  icon: React.ReactNode;
  testId: string;
  more?: string | null;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (count === 0) return null;
  return (
    <div className="surface-elevated p-2.5" data-testid={testId}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs font-medium w-full hover:text-primary transition-colors"
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
        )}
        {icon}
        <span>{title}</span>
        <span className="ml-auto font-mono text-muted-foreground">{count}</span>
      </button>
      {open && (
        <>
          <ul className="space-y-1 pl-1 mt-1.5">{children}</ul>
          {more && (
            <div className="text-[11px] text-muted-foreground italic mt-1.5 pl-1">
              {more}
            </div>
          )}
        </>
      )}
    </div>
  );
}
