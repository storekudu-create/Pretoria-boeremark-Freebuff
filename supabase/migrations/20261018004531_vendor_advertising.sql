-- Capability tokens are hashed, private, revocable, and scoped to one fixed stall.
create schema if not exists boeremark_private;
revoke all on schema boeremark_private from public, anon, authenticated;
create extension if not exists pgcrypto with schema extensions;
create table boeremark_private.admins (email text primary key);
insert into boeremark_private.admins values ('myeposb@gmail.com');
create table public.bm_listings (
  key text primary key, number text not null, data jsonb not null,
  revision integer not null default 1, updated_at timestamptz not null default now()
);
alter table public.bm_listings enable row level security;
grant select on public.bm_listings to anon, authenticated;
revoke insert, update, delete on public.bm_listings from anon, authenticated;
create policy public_read on public.bm_listings for select to anon, authenticated using (true);
create table boeremark_private.vendor_access (
  stall_key text primary key references public.bm_listings(key),
  token_hash text unique not null, created_at timestamptz not null default now()
);
alter table boeremark_private.vendor_access enable row level security;
alter table boeremark_private.admins enable row level security;
create table public.bm_settings (id integer primary key check(id=1), specials jsonb not null default '[]');
insert into public.bm_settings values (1, '[]');
alter table public.bm_settings enable row level security;
grant select on public.bm_settings to anon, authenticated;
revoke insert, update, delete on public.bm_settings from anon, authenticated;
create policy public_read on public.bm_settings for select to anon, authenticated using(true);

create function public.bm_is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users u join boeremark_private.admins a on lower(u.email)=a.email where u.id=auth.uid() and u.email_confirmed_at is not null)
$$;
revoke all on function public.bm_is_admin() from public;
grant execute on function public.bm_is_admin() to authenticated;

create function boeremark_private.vendor_key(p_token text) returns text language plpgsql stable security definer set search_path='' as $$
declare k text;
begin
 if p_token is null or p_token !~ '^[a-f0-9]{64}$' then raise exception 'Invalid or revoked vendor code' using errcode='28000'; end if;
 select stall_key into k from boeremark_private.vendor_access where token_hash=encode(extensions.digest(p_token,'sha256'),'hex');
 if k is null then raise exception 'Invalid or revoked vendor code' using errcode='28000'; end if;
 return k;
end $$;

create function public.bm_vendor_get(p_token text) returns jsonb language plpgsql security definer set search_path='' as $$
declare k text;
begin
 k:=boeremark_private.vendor_key(p_token);
 return (select data || jsonb_build_object('key',key,'number',number,'revision',revision) from public.bm_listings where key=k);
end $$;
revoke all on function public.bm_vendor_get(text) from public;
grant execute on function public.bm_vendor_get(text) to anon, authenticated;

-- Validate advertising content on the server, not only in the form.
create function boeremark_private.validate_content(d jsonb, k text) returns void language plpgsql set search_path='' as $$
declare f text; item jsonb; image_url text;
begin
 if jsonb_typeof(d) <> 'object' then raise exception 'Invalid listing'; end if;
 foreach f in array array['businessName','description','whatsapp','website','special','promotionalOffer'] loop
  if d ? f and (jsonb_typeof(d->f) <> 'string' or length(d->>f)>2000) then raise exception 'Invalid field: %',f; end if;
 end loop;
 if length(coalesce(d->>'businessName',''))>160 then raise exception 'Business name is too long'; end if;
 if coalesce(d->>'website','')<>'' and (d->>'website' !~ '^https?://[^[:space:]/]+([/?#][^[:space:]]*)?$' or length(d->>'website')>500) then raise exception 'Use a complete http or https website address'; end if;
 if coalesce(d->>'whatsapp','') !~ '^[+0-9 ()-]{0,30}$' then raise exception 'Invalid WhatsApp number'; end if;
 if d ? 'availabilityStatus' and d->>'availabilityStatus' not in ('open-today','coming-soon','closed','available-to-rent') then raise exception 'Invalid availability'; end if;
 if d ? 'specialToday' and jsonb_typeof(d->'specialToday')<>'boolean' then raise exception 'Invalid special status'; end if;
 if d ? 'products' then
  if jsonb_typeof(d->'products')<>'array' then raise exception 'Invalid products'; end if;
  if jsonb_array_length(d->'products')>50 then raise exception 'Maximum 50 products'; end if;
  for item in select value from jsonb_array_elements(d->'products') loop
   if jsonb_typeof(item)<>'string' or length(item#>>'{}')>160 then raise exception 'Invalid product'; end if;
  end loop;
 end if;
 if d ? 'productPhotos' and jsonb_typeof(d->'productPhotos')<>'array' then raise exception 'Invalid photos'; end if;
 if jsonb_array_length(coalesce(d->'productPhotos','[]'))>6 then raise exception 'Maximum six product photos'; end if;
 for image_url in select value from jsonb_array_elements_text(coalesce(d->'productPhotos','[]') || jsonb_build_array(coalesce(d->>'logoImage',''),coalesce(d->>'specialImage',''))) loop
  if image_url<>'' and image_url not like 'https://sflktwotveoltsdlkhrm.supabase.co/storage/v1/object/public/market-media/'||k||'/%' then raise exception 'Invalid image URL'; end if;
 end loop;
end $$;

create function public.bm_vendor_save(p_token text,p_data jsonb,p_revision integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare k text; result jsonb; field text;
begin
 k:=boeremark_private.vendor_key(p_token);
 for field in select jsonb_object_keys(p_data) loop
  if field <> all(array['businessName','description','logoImage','whatsapp','products','productPhotos','special','specialImage','specialToday','availabilityStatus','promotionalOffer','website']) then raise exception 'Vendors cannot change field: %',field using errcode='42501'; end if;
 end loop;
 perform boeremark_private.validate_content(p_data,k);
 update public.bm_listings set data=data||p_data,revision=revision+1,updated_at=now()
 where key=k and revision=p_revision
 returning data || jsonb_build_object('key',key,'number',number,'revision',revision) into result;
 if result is null then raise exception 'This listing changed. Reload before saving.' using errcode='40001'; end if;
 return result;
end $$;
revoke all on function public.bm_vendor_save(text,jsonb,integer) from public;
grant execute on function public.bm_vendor_save(text,jsonb,integer) to anon, authenticated;

create function public.bm_issue_vendor(p_key text) returns text language plpgsql security definer set search_path='' as $$
declare token text;
begin
 if not public.bm_is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
 token:=encode(extensions.gen_random_bytes(32),'hex');
 insert into boeremark_private.vendor_access(stall_key,token_hash) values(p_key,encode(extensions.digest(token,'sha256'),'hex')) on conflict(stall_key) do update set token_hash=excluded.token_hash,created_at=now();
 return token;
end $$;
create function public.bm_revoke_vendor(p_key text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.bm_is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
 delete from boeremark_private.vendor_access where stall_key=p_key;
end $$;
create function public.bm_admin_save(p_key text,p_data jsonb,p_revision integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; field text;
begin
 if not public.bm_is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
 for field in select jsonb_object_keys(p_data) loop
  if field <> all(array['businessName','description','logoImage','whatsapp','products','productPhotos','special','specialImage','specialToday','availabilityStatus','promotionalOffer','website','category','freeListing','featured','saturdaySpecial','premium','featuredUntil']) then raise exception 'Unknown or fixed field: %',field; end if;
 end loop;
 perform boeremark_private.validate_content(p_data,p_key);
 if p_data ? 'category' and p_data->>'category' not in ('meat','biltong','vegetables','fruit','plants','bakery','coffee','pancakes','crafts','clothing','other') then raise exception 'Invalid category'; end if;
 foreach field in array array['freeListing','featured','saturdaySpecial','premium'] loop
  if p_data ? field and jsonb_typeof(p_data->field)<>'boolean' then raise exception 'Invalid advertising option'; end if;
 end loop;
 update public.bm_listings set data=data||p_data,revision=revision+1,updated_at=now() where key=p_key and revision=p_revision
 returning data || jsonb_build_object('key',key,'number',number,'revision',revision) into result;
 if result is null then raise exception 'This listing changed. Reload before saving.' using errcode='40001'; end if;
 return result;
end $$;
create function public.bm_admin_specials(p_specials jsonb) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.bm_is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
 if jsonb_typeof(p_specials)<>'array' or octet_length(p_specials::text)>1000000 then raise exception 'Invalid specials'; end if;
 update public.bm_settings set specials=p_specials where id=1;
end $$;
revoke all on function public.bm_issue_vendor(text), public.bm_revoke_vendor(text), public.bm_admin_save(text,jsonb,integer), public.bm_admin_specials(jsonb) from public;
grant execute on function public.bm_issue_vendor(text), public.bm_revoke_vendor(text), public.bm_admin_save(text,jsonb,integer), public.bm_admin_specials(jsonb) to authenticated;
revoke all on all functions in schema boeremark_private from public, anon, authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values ('market-media','market-media',true,1048576,array['image/jpeg','image/png','image/webp']);
-- No client write policies: the upload function validates vendor ownership first.
