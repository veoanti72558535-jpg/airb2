/**
 * Supabase configuration check utility.
 * Re-exports isSupabaseConfigured from client and adds console warnings.
 */
import { isSupabaseConfigured } from '@/integrations/supabase/client';

export { isSupabaseConfigured };

/** Log a warning once if Supabase env vars are missing */
let warned = false;
export function warnIfNotConfigured(): void {
  if (!warned && !isSupabaseConfigured()) {
    warned = true;
    console.error(
      '[AirBallistik] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing. Auth will not work.',
    );
  }
}