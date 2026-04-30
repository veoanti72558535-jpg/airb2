import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Ruler, Check, X, Info, ArrowLeftRight, AlertTriangle, BookOpen } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

/**
 * User-facing documentation page that explains AirBallistik's unit contract:
 *  - The ballistic engine is **deterministic** and only consumes SI internally.
 *  - DSP (Display Preferences) are a *presentation* layer applied at the edges.
 *
 * This page is intentionally self-contained: it does not depend on engine
 * code or backend state, only on translations and design tokens.
 */

type Sample = {
  field: string;
  si: string;
  acceptedDsp: string[];
  rejected: string[];
  note?: string;
};

const SAMPLES_FR: Sample[] = [
  {
    field: 'Vitesse initiale',
    si: 'm/s (mètres par seconde)',
    acceptedDsp: ['m/s', 'fps (affichage seulement)'],
    rejected: ['"950fps" envoyé au moteur', 'chaîne sans unité', 'valeur > 2000 m/s'],
    note: "Le moteur attend toujours un nombre en m/s. La conversion fps→m/s est faite côté UI avant l'appel.",
  },
  {
    field: 'Distance',
    si: 'm (mètres)',
    acceptedDsp: ['m', 'yd (affichage seulement)'],
    rejected: ['"55yd" en entrée moteur', 'valeurs négatives', 'NaN / Infinity'],
  },
  {
    field: 'Masse projectile',
    si: 'kg (kilogrammes)',
    acceptedDsp: ['g, gr (affichage seulement)'],
    rejected: ['"15.89gr" envoyé au moteur', 'masse ≤ 0'],
    note: "1 gr = 0.0000647989 kg. La conversion est centralisée dans `src/lib/units`.",
  },
  {
    field: 'Température',
    si: '°C (Celsius)',
    acceptedDsp: ['°C', '°F (affichage seulement)'],
    rejected: ['"72°F" en entrée moteur', 'température < −80 °C'],
  },
  {
    field: 'Pression',
    si: 'hPa (hectopascals)',
    acceptedDsp: ['hPa, bar', 'inHg, psi (affichage seulement)'],
    rejected: ['"29.92inHg" en entrée moteur', 'pression < 500 hPa'],
  },
  {
    field: 'Angles / corrections',
    si: 'rad (radians) ou MOA selon API',
    acceptedDsp: ['MOA, MIL, clics (affichage seulement)'],
    rejected: ['clics envoyés sans facteur de tourelle', '"3.2MIL" en string'],
  },
];

const SAMPLES_EN: Sample[] = [
  {
    field: 'Muzzle velocity',
    si: 'm/s (meters per second)',
    acceptedDsp: ['m/s', 'fps (display only)'],
    rejected: ['"950fps" sent to the engine', 'unit-less string', 'value > 2000 m/s'],
    note: 'The engine always expects a number in m/s. fps→m/s conversion happens in the UI before the call.',
  },
  {
    field: 'Distance',
    si: 'm (meters)',
    acceptedDsp: ['m', 'yd (display only)'],
    rejected: ['"55yd" as engine input', 'negative values', 'NaN / Infinity'],
  },
  {
    field: 'Projectile mass',
    si: 'kg (kilograms)',
    acceptedDsp: ['g, gr (display only)'],
    rejected: ['"15.89gr" sent to the engine', 'mass ≤ 0'],
    note: '1 gr = 0.0000647989 kg. Conversion is centralized in `src/lib/units`.',
  },
  {
    field: 'Temperature',
    si: '°C (Celsius)',
    acceptedDsp: ['°C', '°F (display only)'],
    rejected: ['"72°F" as engine input', 'temperature < −80 °C'],
  },
  {
    field: 'Pressure',
    si: 'hPa (hectopascals)',
    acceptedDsp: ['hPa, bar', 'inHg, psi (display only)'],
    rejected: ['"29.92inHg" as engine input', 'pressure < 500 hPa'],
  },
  {
    field: 'Angles / corrections',
    si: 'rad or MOA depending on API',
    acceptedDsp: ['MOA, MIL, clicks (display only)'],
    rejected: ['clicks sent without turret factor', '"3.2MIL" as string'],
  },
];

export default function UnitsContractPage() {
  const { locale } = useI18n();
  const fr = locale === 'fr';
  const samples = fr ? SAMPLES_FR : SAMPLES_EN;

  const tr = {
    title: fr ? 'Contrat des unités — SI vs DSP' : 'Unit contract — SI vs DSP',
    subtitle: fr
      ? "Comprendre comment AirBallistik sépare le calcul (SI) de l'affichage (DSP)."
      : 'Understand how AirBallistik separates computation (SI) from display (DSP).',
    why: fr ? 'Pourquoi cette séparation ?' : 'Why this separation?',
    whyP1: fr
      ? "Le moteur balistique est **déterministe** : pour des entrées SI identiques, il produit toujours le même résultat. C'est la garantie qui rend les sessions reproductibles, comparables et vérifiables."
      : 'The ballistic engine is **deterministic**: identical SI inputs always yield the same result. This is what makes sessions reproducible, comparable, and verifiable.',
    whyP2: fr
      ? "Vos préférences (fps, yards, °F, inHg…) ne servent qu'à **afficher** les nombres. Elles n'entrent jamais dans le calcul. Quand vous tapez `950 fps`, l'app convertit en `289.56 m/s` *avant* d'appeler le moteur."
      : 'Your preferences (fps, yards, °F, inHg…) are **display-only**. They never enter the computation. When you type `950 fps`, the app converts to `289.56 m/s` *before* calling the engine.',
    siCol: 'SI (engine)',
    dspCol: fr ? 'DSP (affichage accepté)' : 'DSP (display accepted)',
    rejCol: fr ? 'Refusé' : 'Rejected',
    fieldCol: fr ? 'Grandeur' : 'Field',
    examples: fr ? 'Exemples par grandeur' : 'Examples by field',
    recos: fr ? 'Recommandations de saisie' : 'Input recommendations',
    reco1: fr
      ? "Saisissez toujours la valeur **dans l'unité affichée à côté du champ** — l'app fait la conversion."
      : 'Always enter values **in the unit shown next to the field** — the app handles conversion.',
    reco2: fr
      ? 'Ne collez jamais une chaîne avec son unité (ex. "950fps"). Saisissez seulement le **nombre**.'
      : 'Never paste a string with its unit (e.g. "950fps"). Enter the **number only**.',
    reco3: fr
      ? "Vérifiez votre système d'unités dans Réglages → Préférences avant chaque session."
      : 'Verify your unit system in Settings → Preferences before each session.',
    reco4: fr
      ? 'En cas de doute, ouvrez le mode debug : chaque valeur affiche un badge SI ou DSP.'
      : 'When in doubt, enable debug mode: every value shows an SI or DSP badge.',
    seeConv: fr ? 'Ouvrir les outils de conversion' : 'Open conversion tools',
    seeSettings: fr ? 'Modifier mes préférences' : 'Edit my preferences',
    note: fr ? 'Note' : 'Note',
    keyTakeaway: fr ? 'À retenir' : 'Key takeaway',
    takeawayBody: fr
      ? "Un seul invariant : **le moteur ne voit que le SI**. Tout le reste — fps, yd, °F, MOA — est de l'habillage."
      : 'One invariant: **the engine only sees SI**. Everything else — fps, yd, °F, MOA — is presentation.',
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-8">
      {/* Header */}
      <header>
        <div className="flex items-center gap-2 mb-1">
          <Ruler className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-heading font-bold">{tr.title}</h1>
        </div>
        <p className="text-xs text-muted-foreground">{tr.subtitle}</p>
      </header>

      {/* Why */}
      <section className="surface-elevated p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" />
          <h2 className="font-heading font-semibold text-sm">{tr.why}</h2>
        </div>
        <p className="text-sm text-foreground/90 leading-relaxed">{tr.whyP1}</p>
        <p className="text-sm text-foreground/90 leading-relaxed">{tr.whyP2}</p>
      </section>

      {/* Key takeaway callout */}
      <aside className="rounded-lg border border-primary/30 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <BookOpen className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div>
            <div className="text-xs font-mono uppercase tracking-wide text-primary mb-1">
              {tr.keyTakeaway}
            </div>
            <p className="text-sm text-foreground">{tr.takeawayBody}</p>
          </div>
        </div>
      </aside>

      {/* Examples per field */}
      <section className="space-y-3">
        <h2 className="font-heading font-semibold text-sm flex items-center gap-2">
          <ArrowLeftRight className="h-4 w-4 text-primary" />
          {tr.examples}
        </h2>

        <div className="space-y-3">
          {samples.map((s) => (
            <article
              key={s.field}
              className="surface-elevated p-4 space-y-3"
              data-testid={`unit-sample-${s.field}`}
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="font-heading font-semibold text-sm">{s.field}</h3>
                <span className="text-[10px] font-mono uppercase tracking-wide rounded bg-primary/10 text-primary px-2 py-0.5">
                  SI: {s.si}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 p-3">
                  <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wide text-emerald-500 mb-2">
                    <Check className="h-3.5 w-3.5" /> {tr.dspCol}
                  </div>
                  <ul className="space-y-1">
                    {s.acceptedDsp.map((v) => (
                      <li key={v} className="text-xs font-mono text-foreground/90">
                        • {v}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                  <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wide text-destructive mb-2">
                    <X className="h-3.5 w-3.5" /> {tr.rejCol}
                  </div>
                  <ul className="space-y-1">
                    {s.rejected.map((v) => (
                      <li key={v} className="text-xs font-mono text-foreground/90">
                        • {v}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {s.note && (
                <div className="flex items-start gap-2 text-[11px] text-muted-foreground border-t border-border/50 pt-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-foreground/80">{tr.note} :</strong> {s.note}
                  </span>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      {/* Recommendations */}
      <section className="surface-elevated p-4 space-y-2">
        <h2 className="font-heading font-semibold text-sm">{tr.recos}</h2>
        <ol className="text-sm space-y-2 list-decimal list-inside text-foreground/90">
          <li>{tr.reco1}</li>
          <li>{tr.reco2}</li>
          <li>{tr.reco3}</li>
          <li>{tr.reco4}</li>
        </ol>
      </section>

      {/* Quick links */}
      <nav className="flex flex-wrap gap-2">
        <Link
          to="/conversions"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary/10 text-primary text-xs font-medium hover:bg-primary/15 transition-colors"
        >
          <ArrowLeftRight className="h-3.5 w-3.5" />
          {tr.seeConv}
        </Link>
        <Link
          to="/settings?tab=preferences"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-muted text-foreground text-xs font-medium hover:bg-muted/70 transition-colors"
        >
          <Ruler className="h-3.5 w-3.5" />
          {tr.seeSettings}
        </Link>
      </nav>
    </motion.div>
  );
}
