import { defineMiddleware } from 'astro:middleware';
import { createSupabaseServerClient } from './lib/supabase/server';

export const onRequest = defineMiddleware(async (context, next) => {
  // Default to no user/session
  context.locals.user = null;
  context.locals.session = null;

  // Skip Supabase auth for prerendered routes or when env vars are missing
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
    context.locals.session = user
      ? (await supabase.auth.getSession()).data.session
      : null;
  } catch {
    // If auth fails (e.g. during prerendering), continue without user
  }

  return next();
});
