import { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import type { Session } from '@/lib/types';
import { toast } from 'sonner';

interface Props {
  session: Session;
}

export function DopePdfExporter({ session }: Props) {
  const { t, lang } = useI18n();
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const { exportDopePdf } = await import('@/lib/dope-pdf-export');
      await exportDopePdf(session, { lang: lang as 'fr' | 'en' });
    } catch (err) {
      console.error('[DOPE PDF]', err);
      toast.error(t('dope.export.error' as any) || 'PDF generation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={loading || session.results.length === 0}
    >
      {loading
        ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
        : <FileDown className="h-4 w-4 mr-1" />
      }
      {loading
        ? (t('dope.export.loading' as any) || 'Generating...')
        : (t('dope.export.button' as any) || 'Export DOPE Card (PDF)')
      }
    </Button>
  );
}