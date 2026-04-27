/**
 * A2 — Onboarding Wizard component.
 * Shown on first login when the user has no sessions, no airguns, and no projectiles.
 * 4 steps: Welcome → Pick Airgun → Pick Projectile → First Calc.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, ChevronRight, Package, Crosshair, Sparkles, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';
import { airgunStore, projectileStore, sessionStore } from '@/lib/storage';

const ONBOARDING_KEY = 'airballistik-onboarding-done';

export function useOnboarding() {
  const done = localStorage.getItem(ONBOARDING_KEY) === 'true';
  const shouldShow =
    !done &&
    sessionStore.getAll().length === 0 &&
    airgunStore.getAll().length === 0;
  return {
    shouldShow,
    markDone: () => localStorage.setItem(ONBOARDING_KEY, 'true'),
  };
}

interface Props {
  onComplete: () => void;
}

const steps = [
  {
    icon: Sparkles,
    titleKey: 'onboarding.welcome',
    descKey: 'onboarding.welcomeDesc',
    fallbackTitle: 'Bienvenue sur AirBallistiK !',
    fallbackDesc: 'Configurez votre arme et votre projectile en quelques secondes pour commencer vos calculs balistiques.',
  },
  {
    icon: Package,
    titleKey: 'onboarding.addAirgun',
    descKey: 'onboarding.addAirgunDesc',
    fallbackTitle: 'Ajoutez votre arme',
    fallbackDesc: 'Allez dans la bibliothèque pour ajouter votre première carabine PCP avec ses caractéristiques.',
    action: '/library',
  },
  {
    icon: Target,
    titleKey: 'onboarding.addProjectile',
    descKey: 'onboarding.addProjectileDesc',
    fallbackTitle: 'Choisissez un projectile',
    fallbackDesc: 'Sélectionnez votre plomb ou slug favori dans le catalogue intégré de plus de 500 projectiles.',
    action: '/library',
  },
  {
    icon: Crosshair,
    titleKey: 'onboarding.firstCalc',
    descKey: 'onboarding.firstCalcDesc',
    fallbackTitle: 'Premier calcul !',
    fallbackDesc: 'Lancez QuickCalc et découvrez votre trajectoire, vos corrections, et votre Dope Card.',
    action: '/calc',
  },
];

export function OnboardingWizard({ onComplete }: Props) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const current = steps[step];
  const isLast = step === steps.length - 1;

  const handleNext = () => {
    if (isLast) {
      onComplete();
      navigate('/calc');
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl flex items-center justify-center p-6"
    >
      <button
        onClick={handleSkip}
        className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="h-5 w-5" />
      </button>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.25 }}
          className="max-w-sm w-full text-center space-y-6"
        >
          {/* Step indicator */}
          <div className="flex justify-center gap-2">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step
                    ? 'w-8 bg-primary'
                    : i < step
                    ? 'w-4 bg-primary/40'
                    : 'w-4 bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Icon */}
          <div className="flex justify-center">
            <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center">
              <current.icon className="h-10 w-10 text-primary" />
            </div>
          </div>

          {/* Text */}
          <div>
            <h2 className="text-xl font-heading font-bold mb-2">
              {t(current.titleKey as any) || current.fallbackTitle}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t(current.descKey as any) || current.fallbackDesc}
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <button
              onClick={handleNext}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity active:scale-[0.98]"
            >
              {isLast ? (t('onboarding.start' as any) || 'Commencer !') : (t('onboarding.next' as any) || 'Suivant')}
              <ChevronRight className="h-4 w-4" />
            </button>
            {!isLast && (
              <button
                onClick={handleSkip}
                className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('onboarding.skip' as any) || 'Passer l\'introduction'}
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
