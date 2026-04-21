/**
 * Normalisation des URLs Quatarly.
 *
 * L'URL stockée en base (`ai.quatarly_api_url`) peut prendre des formes
 * variées :
 *   - https://api.quatarly.ai
 *   - https://api.quatarly.ai/v1
 *   - https://api.quatarly.ai/v1/chat/completions
 *   - https://proxy.local:8443/
 *
 * Ces helpers garantissent qu'on obtient toujours l'URL complète de
 * l'endpoint visé, sans double `/v1/v1` ni slash manquant.
 */

/**
 * Nettoie une URL brute en retirant les suffixes connus pour ne garder
 * que la base (ex. `https://api.quatarly.ai`).
 */
export function normalizeQuatarlyBaseUrl(raw: string): string {
  let url = raw.trim().replace(/\/+$/, '');
  // Retirer les suffixes connus en partant du plus long
  for (const suffix of ['/v1/chat/completions', '/v1/models', '/v1']) {
    if (url.toLowerCase().endsWith(suffix)) {
      url = url.slice(0, -suffix.length);
      break;
    }
  }
  return url.replace(/\/+$/, '');
}

/** URL complète pour `POST /v1/chat/completions`. */
export function quatarlyChatUrl(raw: string): string {
  return `${normalizeQuatarlyBaseUrl(raw)}/v1/chat/completions`;
}

/** URL complète pour `GET /v1/models`. */
export function quatarlyModelsUrl(raw: string): string {
  return `${normalizeQuatarlyBaseUrl(raw)}/v1/models`;
}