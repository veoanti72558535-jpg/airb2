import React from 'react';
import { Link } from 'react-router-dom';
import { History, ExternalLink } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import type { CalibrationHistoryEntry } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

interface Props {
  history: CalibrationHistoryEntry[];
}

export function CalibrationHistoryBlock({ history }: Props) {
  const { t } = useI18n();
  if (!history || history.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <History className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-semibold">{t('truing.history')}</span>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          {history.length}
        </Badge>
      </div>
      <div className="space-y-1.5">
        {history.map((entry, i) => {
          const pctChange = ((entry.factor - 1) * 100).toFixed(1);
          const sign = entry.factor >= 1 ? '+' : '';
          return (
            <div
              key={`${entry.date}-${i}`}
              className="bg-muted rounded-md px-3 py-2 text-xs space-y-1"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">
                  {new Date(entry.date).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                <Badge
                  variant="outline"
                  className={`text-[10px] ${
                    Math.abs(entry.factor - 1) <= 0.05
                      ? 'border-green-500/30 text-green-500'
                      : 'border-amber-500/30 text-amber-500'
                  }`}
                >
                  ×{entry.factor.toFixed(3)} ({sign}{pctChange}%)
                </Badge>
              </div>
              <div className="flex items-center gap-3 font-mono text-muted-foreground">
                <span>BC {entry.originalBc.toFixed(4)} → {entry.correctedBc.toFixed(4)}</span>
                <span className="text-[10px]">@ {entry.measuredDistance}m / {entry.measuredDropMm.toFixed(1)}mm</span>
              </div>
              {entry.derivedProjectileId && (
                <Link
                  to={`/library/projectiles/${entry.derivedProjectileId}`}
                  className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                >
                  <ExternalLink className="h-2.5 w-2.5" />
                  {t('truing.viewProjectile')}
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}