-- Complete Hero request lifecycle and browser push subscriptions.

alter table public.hero_requests
  add column if not exists en_route_at timestamptz,
  add column if not exists arrived_at timestamptz;

alter table public.hero_requests
  drop constraint if exists hero_requests_status_check;
alter table public.hero_requests
  add constraint hero_requests_status_check
  check (status in ('open','accepted','en_route','arrived','completed','cancelled'));

create table if not exists public.hero_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  enabled boolean not null default true
);

create index if not exists hero_push_subscriptions_user_idx
  on public.hero_push_subscriptions(auth_user_id)
  where enabled = true;

alter table public.hero_push_subscriptions enable row level security;

drop policy if exists hero_push_subscriptions_server_all on public.hero_push_subscriptions;
create policy hero_push_subscriptions_server_all
on public.hero_push_subscriptions
for all
to anon, authenticated
using (private.hero_server_authorized())
with check (private.hero_server_authorized());

grant select, insert, update, delete on table public.hero_push_subscriptions to anon, authenticated;
