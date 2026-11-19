-- On-call readiness for enrolled Heroes.
-- Nearby Hero requests stay on their existing launch switch. This migration does not enable them.
-- A CHECK cannot call now() or current_date (those are not immutable, and a check would
-- not expire an existing row until the next write). The trigger enforces the rule on
-- every insert and update; the API also clears a stale On Call flag when it is read.

alter table public.hero_certifications
  add column if not exists naloxone_ready boolean not null default false,
  add column if not exists naloxone_expires_on date,
  add column if not exists on_call boolean not null default false,
  add column if not exists on_call_since timestamptz;

create index if not exists hero_certifications_on_call_idx
  on public.hero_certifications (on_call)
  where on_call = true;

create index if not exists hero_certifications_expires_idx
  on public.hero_certifications (expires_at);

create or replace function public.hero_force_off_call_when_not_ready()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.expires_at <= now()
     or new.naloxone_ready is not true
     or new.naloxone_expires_on is null
     or new.naloxone_expires_on < current_date
     or new.enrolled is not true then
    new.on_call := false;
    new.on_call_since := null;
  elsif new.on_call is true and (tg_op = 'INSERT' or old.on_call is distinct from true) then
    new.on_call_since := now();
  elsif new.on_call is not true then
    new.on_call_since := null;
  end if;
  return new;
end;
$$;

revoke all on function public.hero_force_off_call_when_not_ready() from public;

drop trigger if exists hero_readiness_guard on public.hero_certifications;
create trigger hero_readiness_guard
before insert or update on public.hero_certifications
for each row execute function public.hero_force_off_call_when_not_ready();
