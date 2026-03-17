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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    context.locals.user = user;
  } catch {
    // If auth fails (e.g. during prerendering), continue without user
  }

  return next();
});
