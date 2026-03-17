import { defineMiddleware } from 'astro:middleware';
import { createSupabaseServerClient } from './lib/supabase/server';

export const onRequest = defineMiddleware(async (context, next) => {
  // Default to no user
  context.locals.user = null;

  // Skip Supabase auth when env vars are missing (e.g. local dev without Supabase)
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  const supabaseKey = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return next();
  }

  try {
    const supabase = createSupabaseServerClient(
      context.request,
      context.cookies
    );

    // Use getSession() instead of getUser() to avoid a network request to
    // Supabase on every SSR page load. getSession() reads the JWT from
    // cookies locally, which is sufficient for UI display (e.g. showing a
    // login vs account link in the header). Pages that need *verified* auth
    // (like /account and /api/delete-account) call getUser() themselves.
    const {
      data: { session },
    } = await supabase.auth.getSession();

    context.locals.user = session?.user ?? null;
  } catch {
    // If auth fails (e.g. during prerendering), continue without user
  }

  return next();
});
