-- Set search_path on functions to prevent search_path injection attacks.
-- The handle_new_user function already had this set (SECURITY DEFINER),
-- but handle_updated_at was missing it.

alter function public.handle_new_user() set search_path = '';
alter function public.handle_updated_at() set search_path = '';
