alter table public.bm_settings add column public_administration boolean not null default false;
update public.bm_settings set public_administration=true where id=1;
create or replace function public.bm_is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((select public_administration from public.bm_settings where id=1),false)
 or exists(select 1 from auth.users u join boeremark_private.admins a on lower(u.email)=a.email where u.id=auth.uid() and u.email_confirmed_at is not null)
$$;
-- Explicit temporary public management mode requested by the market owner.
-- Turn off with UPDATE public.bm_settings SET public_administration=false WHERE id=1.
-- Direct table writes remain blocked; all editing still uses validated RPCs.
grant execute on function public.bm_is_admin(), public.bm_issue_vendor(text), public.bm_revoke_vendor(text), public.bm_admin_save(text,jsonb,integer), public.bm_admin_specials(jsonb), public.bm_admin_sponsors(jsonb,integer) to anon;
