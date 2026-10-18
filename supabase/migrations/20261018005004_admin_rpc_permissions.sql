-- Supabase also grants function EXECUTE directly through default privileges.
revoke execute on function public.bm_is_admin(), public.bm_issue_vendor(text), public.bm_revoke_vendor(text), public.bm_admin_save(text,jsonb,integer), public.bm_admin_specials(jsonb) from anon;
