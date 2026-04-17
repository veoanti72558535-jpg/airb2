import { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Crosshair, LucideIcon, Pencil } from 'lucide-react';
import { motion } from 'framer-motion';
import { useI18n } from '@/lib/i18n';

interface Props {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  badges?: ReactNode;
  /** Path to navigate back to (defaults to /library). */
  backHref?: string;
  /** Path to navigate when "Use in calc" is clicked. */
  useInCalcHref: string;
  /** Path to navigate when "Edit" is clicked (back to library tab with edit state). */
  editHref?: string;
  children: ReactNode;
}

/**
 * Shared layout for library item detail pages.
 * Header with back, title, badges and primary "Use in calc" CTA.
 */
export function DetailLayout({
  icon: Icon,
  title,
  subtitle,
  badges,
  backHref = '/library',
  useInCalcHref,
  editHref,
  children,
}: Props) {
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4 pb-8"
    >
      <Link
        to={backHref}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t('detail.back')}
      </Link>

      <header className="surface-elevated p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 shrink-0">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-heading font-bold leading-tight truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
                {subtitle}
              </p>
            )}
            {badges && (
              <div className="flex flex-wrap gap-1.5 mt-2">{badges}</div>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => navigate(useInCalcHref)}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Crosshair className="h-4 w-4" />
            {t('detail.useInCalc')}
          </button>
          {editHref && (
            <button
              onClick={() => navigate(editHref)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-muted text-foreground text-sm font-medium hover:bg-muted/70 transition-colors"
            >
              <Pencil className="h-4 w-4" />
              {t('common.edit')}
            </button>
          )}
        </div>
      </header>

      {children}
    </motion.div>
  );
}

/** Simple definition list row used inside detail panels. */
export function DetailRow({
  label,
  value,
  mono = true,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 border-b border-border/50 last:border-b-0">
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className={`text-sm text-right ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  );
}

/** Section card with title for grouping detail rows. */
export function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="surface-card p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        {title}
      </h2>
      <dl className="space-y-0">{children}</dl>
    </section>
  );
}
