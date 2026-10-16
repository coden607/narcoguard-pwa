-- Hero-only backend credential enforced by RLS.
-- Provision private.hero_server_keys.primary separately with the SHA-256 hash of HERO_DB_API_KEY.
create schema if not exists private;
revoke all on schema private from public;

create table if not exists private.hero_server_keys (
  name text primary key,
  key_hash text not null,
  updated_at timestamptz not null default now()
);
revoke all on table private.hero_server_keys from public, anon, authenticated;

create or replace function public.hero_server_authorized()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.hero_server_keys
    where name = 'primary'
      and key_hash = encode(
        extensions.digest(
          coalesce(current_setting('request.headers', true)::json->>'x-narcoguard-server-key', ''),
          'sha256'
        ),
        'hex'
      )
  );
$$;

revoke all on function public.hero_server_authorized() from public;
grant execute on function public.hero_server_authorized() to anon, authenticated;

drop policy if exists hero_certifications_server_all on public.hero_certifications;
create policy hero_certifications_server_all
on public.hero_certifications
for all
to anon, authenticated
using (public.hero_server_authorized())
with check (public.hero_server_authorized());

drop policy if exists hero_availability_server_all on public.hero_availability;
create policy hero_availability_server_all
on public.hero_availability
for all
to anon, authenticated
using (public.hero_server_authorized())
with check (public.hero_server_authorized());

drop policy if exists hero_requests_server_all on public.hero_requests;
create policy hero_requests_server_all
on public.hero_requests
for all
to anon, authenticated
using (public.hero_server_authorized())
with check (public.hero_server_authorized());

grant select, insert, update, delete on table public.hero_certifications to anon, authenticated;
grant select, insert, update, delete on table public.hero_availability to anon, authenticated;
grant select, insert, update, delete on table public.hero_requests to anon, authenticated;
