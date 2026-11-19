-- updated_at lets a stale On Call read clear only the row it actually saw.
-- A newer save changes the timestamp, so the cleanup filter no longer matches.

alter table public.hero_certifications
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.hero_force_off_call_when_not_ready()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
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
