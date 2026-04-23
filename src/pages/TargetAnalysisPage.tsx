/**
 * Standalone page wrapping <TargetPhotoAnalyzer/> with no session pre-fill.
 * Linked from the navigation under "Plus" (route /target-analysis).
 */
import { motion } from 'framer-motion';
import { Camera } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { TargetPhotoAnalyzer } from '@/components/sessions/TargetPhotoAnalyzer';

export default function TargetAnalysisPage() {
  const { t } = useI18n();
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="container max-w-2xl mx-auto p-4 space-y-4"
    >
      <header className="flex items-center gap-2">
        <Camera className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-heading font-bold">{t('target.title' as any)}</h1>
      </header>
      <p className="text-sm text-muted-foreground">{t('target.pageHint' as any)}</p>
      <div className="surface-elevated p-4">
        <TargetPhotoAnalyzer />
      </div>
    </motion.div>
  );
}
