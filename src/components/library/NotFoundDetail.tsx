import { Link } from 'react-router-dom';
import { ArrowLeft, FileQuestion } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

/** Friendly fallback when a library detail id doesn't match any record. */
export function NotFoundDetail() {
  const { t } = useI18n();
  return (
    <div className="space-y-4 pb-8">
      <Link
        to="/library"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t('detail.back')}
      </Link>
      <div className="surface-elevated p-8 text-center space-y-3">
        <div className="inline-flex items-center justify-center rounded-full bg-muted p-3">
          <FileQuestion className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-base font-semibold">{t('detail.notFound')}</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {t('detail.notFoundHint')}
          </p>
        </div>
      </div>
    </div>
  );
}
