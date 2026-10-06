create table if not exists public.hero_certifications (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  test_version integer not null,
  passed_at timestamptz not null,
  expires_at timestamptz not null,
  enrolled boolean not null default false,
  naloxone_ready boolean not null default false,
  naloxone_expires_on date,
  on_call boolean not null default false,
  on_call_since timestamptz,
  updated_at timestamptz not null default now(),
  constraint hero_on_call_requires_readiness check (
    on_call = false or (
      enrolled = true
      and naloxone_ready = true
      and naloxone_expires_on is not null
      and naloxone_expires_on >= current_date
      and expires_at > now()
    )
  )
);

alter table public.hero_certifications enable row level security;

grant select, update on public.hero_certifications to authenticated;

create policy "heroes can read own certification"
on public.hero_certifications
for select
to authenticated
using ((select auth.uid()) = auth_user_id);

create policy "heroes can update own readiness"
on public.hero_certifications
for update
to authenticated
using ((select auth.uid()) = auth_user_id)
with check ((select auth.uid()) = auth_user_id);

create index if not exists hero_certifications_on_call_idx
on public.hero_certifications (on_call)
where on_call = true;

create index if not exists hero_certifications_expires_idx
on public.hero_certifications (expires_at);

create or replace function public.hero_force_off_call_when_not_ready()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.expires_at <= now()
     or new.naloxone_ready is not true
     or new.naloxone_expires_on is null
     or new.naloxone_expires_on < current_date
     or new.enrolled is not true then
    new.on_call := false;
    new.on_call_since := null;
  elsif new.on_call is true and old.on_call is distinct from true then
    new.on_call_since := now();
  elsif new.on_call is false then
    new.on_call_since := null;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists hero_readiness_guard on public.hero_certifications;
create trigger hero_readiness_guard
before update on public.hero_certifications
for each row execute function public.hero_force_off_call_when_not_ready();
