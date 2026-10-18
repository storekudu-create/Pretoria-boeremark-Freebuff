alter table public.bm_settings add column sponsors jsonb not null default '[]', add column sponsors_revision integer not null default 1;
create function public.bm_admin_sponsors(p_sponsors jsonb,p_revision integer) returns integer language plpgsql security definer set search_path='' as $$
declare s jsonb; f text; r integer;
begin
 if not public.bm_is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
 if jsonb_typeof(p_sponsors)<>'array' or jsonb_array_length(p_sponsors)>6 then raise exception 'Maximum six sponsors'; end if;
 for s in select value from jsonb_array_elements(p_sponsors) loop
  if jsonb_typeof(s)<>'object' then raise exception 'Invalid sponsor'; end if;
  foreach f in array array['id','name','website','image','sector','tagline'] loop
   if jsonb_typeof(s->f) is distinct from 'string' or length(s->>f)>500 then raise exception 'Invalid sponsor field: %',f; end if;
  end loop;
  if length(trim(s->>'name'))=0 or length(s->>'name')>100 then raise exception 'Enter a sponsor business name'; end if;
  if s->>'website' !~ '^https?://[^[:space:]/]+([/?#][^[:space:]]*)?$' then raise exception 'Enter a complete http or https website address'; end if;
  if jsonb_typeof(s->'active') is distinct from 'boolean' then raise exception 'Invalid sponsor status'; end if;
  if s->>'image'<>'' and s->>'image' not like 'https://sflktwotveoltsdlkhrm.supabase.co/storage/v1/object/public/market-media/sponsors/%' then raise exception 'Invalid sponsor image'; end if;
 end loop;
 if (select count(distinct value->>'id') from jsonb_array_elements(p_sponsors))<>jsonb_array_length(p_sponsors) then raise exception 'Duplicate sponsors'; end if;
 update public.bm_settings set sponsors=p_sponsors,sponsors_revision=sponsors_revision+1 where id=1 and sponsors_revision=p_revision returning sponsors_revision into r;
 if r is null then raise exception 'Sponsors changed. Reload before saving.' using errcode='40001'; end if;
 return r;
end $$;
revoke all on function public.bm_admin_sponsors(jsonb,integer) from public,anon;
grant execute on function public.bm_admin_sponsors(jsonb,integer) to authenticated;
