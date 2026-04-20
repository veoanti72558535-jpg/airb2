/**
 * CORS headers partagés pour toutes les Edge Functions IA-1.
 *
 * Inclut les headers Supabase standards. `*` côté origin est intentionnel :
 * la stack étant self-hosted et l'auth se faisant par JWT, restreindre
 * l'origine ici n'apporterait rien (un attaquant ne peut rien faire sans
 * un JWT admin valide).
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}