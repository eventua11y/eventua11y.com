import { createSupabaseServerClient } from '../../lib/supabase/server';
import type { APIRoute } from 'astro';

export const prerender = false;

/**
 * OAuth callback handler.
 * Exchanges the authorization code for a session, then redirects.
 */
export const GET: APIRoute = async ({ request, cookies, redirect }) => {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/';

  if (code) {
    const supabase = createSupabaseServerClient(request, cookies);
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return redirect(next);
    }
  }

  // If there's no code or the exchange failed, redirect to login with error
  return redirect('/login?error=auth-code-error');
};
