-- Trigger-only functions should not be callable through the API (Supabase security advisor).
revoke execute on function public.handle_new_user(), public.protect_admin_flag() from authenticated, anon, public;
