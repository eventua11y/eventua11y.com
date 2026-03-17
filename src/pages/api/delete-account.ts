import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

export const prerender = false;

/**
 * DELETE /api/delete-account
 *
 * Permanently deletes the authenticated user's account using the
 * Supabase Admin API (requires service role key). The regular server
 * client is used first to verify the caller is authenticated.
 */
export const DELETE: APIRoute = async ({ request, cookies }) => {
  // 1. Verify the user is authenticated
  const supabase = createSupabaseServerClient(request, cookies);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 2. Create an admin client with the service role key
  //    Use process.env for the service role key because non-PUBLIC_ vars are
  //    only statically replaced from .env files at build time — they won't be
  //    available via import.meta.env when set as Netlify runtime env vars.
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is not configured');
    return new Response(
      JSON.stringify({
        error: 'Account deletion is not available at this time.',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 3. Delete the user via the Admin API
  const { error } = await adminClient.auth.admin.deleteUser(user.id);

  if (error) {
    console.error('Failed to delete user:', error.message);
    return new Response(
      JSON.stringify({
        error: 'There was a problem deleting your account. Please try again.',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // 4. Sign out to clear cookies
  await supabase.auth.signOut();

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
