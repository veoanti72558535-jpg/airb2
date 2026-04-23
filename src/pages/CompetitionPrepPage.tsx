import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { CompetitionPrepAdvisorButton } from '@/components/ai/agents/CompetitionPrepAdvisorButton';

export default function CompetitionPrepPage() {
  const { t } = useI18n();
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-heading font-bold">
          {t('nav.competitionPrep' as any)}
        </h1>
      </div>
      <div className="surface-card p-4">
        <CompetitionPrepAdvisorButton />
      </div>
    </motion.div>
  );
}