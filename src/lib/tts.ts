/**
 * D4 — Text-to-Speech for ballistic results.
 * Uses the browser's native SpeechSynthesis API (no external provider).
 * Useful on the field with hands occupied.
 */

interface SpeakOptions {
  distance: number;
  drop: number;
  holdover: number;
  clickUnit: string;
  clicks: number;
  energy: number;
  locale: 'fr' | 'en';
}

const MESSAGES = {
  fr: (o: SpeakOptions) =>
    `À ${o.distance} mètres : chute ${Math.abs(o.drop).toFixed(1)} millimètres. Correction : ${o.clicks} clics ${o.clickUnit}. Énergie : ${o.energy.toFixed(1)} joules.`,
  en: (o: SpeakOptions) =>
    `At ${o.distance} meters: drop ${Math.abs(o.drop).toFixed(1)} millimeters. Correction: ${o.clicks} clicks ${o.clickUnit}. Energy: ${o.energy.toFixed(1)} joules.`,
};

/** Speak the ballistic result aloud. */
export function speakResult(options: SpeakOptions): void {
  if (!('speechSynthesis' in window)) return;

  window.speechSynthesis.cancel(); // stop any previous speech
  const text = MESSAGES[options.locale](options);
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = options.locale === 'fr' ? 'fr-FR' : 'en-US';
  utterance.rate = 0.9;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

/** Speak a custom text. */
export function speakText(text: string, locale: 'fr' | 'en' = 'fr'): void {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = locale === 'fr' ? 'fr-FR' : 'en-US';
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
}

/** Check if TTS is available. */
export function isTtsAvailable(): boolean {
  return 'speechSynthesis' in window;
}
