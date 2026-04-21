/**
 * Carte quota Google du jour — lecture seule.
 * Affiche used / max / remaining depuis la réponse `ai-providers-test`.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n';

export interface GoogleQuotaData {
  used: number;
  max: number;
  remaining: number;
  allowed: boolean;
}

export function AiQuotaCard({ quota }: { quota: GoogleQuotaData | null }) {
  const { t } = useI18n();
  if (!quota) return null;

  const pct = quota.max > 0 ? Math.round((quota.used / quota.max) * 100) : 0;
  const exhausted = quota.max > 0 && quota.remaining <= 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{t('admin.ai.quota.title')}</CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-2 text-xs">
        {!quota.allowed ? (
          <Badge variant="secondary">{t('admin.ai.agents.disabled')}</Badge>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('admin.ai.quota.used')}</span>
              <span className="font-mono">{quota.used}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('admin.ai.quota.max')}</span>
              <span className="font-mono">{quota.max > 0 ? quota.max : t('admin.ai.quota.unlimited')}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('admin.ai.quota.remaining')}</span>
              <Badge variant={exhausted ? 'destructive' : 'default'}>
                {quota.max > 0 ? quota.remaining : '∞'}
              </Badge>
            </div>
            {quota.max > 0 && (
              <div className="w-full bg-muted rounded-full h-2 mt-1">
                <div
                  className={`h-2 rounded-full transition-all ${exhausted ? 'bg-destructive' : 'bg-primary'}`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}