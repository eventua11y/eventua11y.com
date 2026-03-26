import { createBrowserClient } from '@supabase/ssr';

/**
 * Creates a Supabase client for browser-side use.
 * Uses cookie-based session management via @supabase/ssr.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}
