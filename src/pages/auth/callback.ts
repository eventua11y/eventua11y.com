import { createSupabaseServerClient } from '../../lib/supabase/server';
import type { APIRoute } from 'astro';

export const prerender = false;

/**
 * Validate that a redirect target is a safe, same-origin path.
 * Rejects absolute URLs, protocol-relative URLs, and other schemes
 * to prevent open redirect attacks.
 */
function getSafeRedirectPath(value: string | null): string {
  if (!value) return '/';
  // Must start with a single slash and not be protocol-relative (//)
  if (!value.startsWith('/') || value.startsWith('//')) return '/';
  return value;
}

/**
 * OAuth callback handler.
 * Exchanges the authorization code for a session, then redirects.
 */
export const GET: APIRoute = async ({ request, cookies, redirect }) => {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = getSafeRedirectPath(requestUrl.searchParams.get('next'));

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
