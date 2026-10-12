-- Community, resource-watch notifications, and resource-kind extension.
-- Additive only. Social features are signed-in; exact location is not stored.

alter table public.hero_availability
  drop constraint if exists hero_availability_resource_kinds_check;
alter table public.hero_availability
  add constraint hero_availability_resource_kinds_check
  check (
    resource_kinds <@ array[
      'naloxone','food','water','shower','clothing','hygiene','ride','phone-charging','shelter-help','other'
    ]::text[]
  );

alter table public.hero_requests
  drop constraint if exists hero_requests_resource_kind_check;
alter table public.hero_requests
  add constraint hero_requests_resource_kind_check
  check (
    resource_kind is null or resource_kind in (
      'naloxone','food','water','shower','clothing','hygiene','ride','phone-charging','shelter-help','other'
    )
  );

create table if not exists public.user_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.resource_watch_subscriptions (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  cell text not null,
  resource_kind text not null check (resource_kind in (
    'naloxone','food','water','shower','clothing','hygiene','ride','phone-charging','shelter-help','other'
  )),
  expires_at timestamptz not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (auth_user_id, cell, resource_kind)
);

create index if not exists resource_watch_match_idx
  on public.resource_watch_subscriptions(cell, resource_kind, expires_at)
  where enabled = true;

create table if not exists public.community_profiles (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  handle text not null unique,
  display_name text not null,
  bio text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (handle ~ '^[a-z0-9_]{3,24}$'),
  check (char_length(display_name) between 1 and 60),
  check (char_length(bio) <= 500)
);

create table if not exists public.community_connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> addressee_id),
  unique (requester_id, addressee_id)
);

create table if not exists public.community_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  category text not null default 'general' check (category in ('general','resource','recovery','wins','question')),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (char_length(body) between 1 and 1000)
);

create index if not exists community_posts_created_idx
  on public.community_posts(created_at desc)
  where deleted_at is null;

create table if not exists public.community_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (sender_id <> recipient_id),
  check (char_length(body) between 1 and 2000)
);

create index if not exists community_messages_pair_idx
  on public.community_messages(sender_id, recipient_id, created_at desc);

alter table public.user_push_subscriptions enable row level security;
alter table public.resource_watch_subscriptions enable row level security;
alter table public.community_profiles enable row level security;
alter table public.community_connections enable row level security;
alter table public.community_blocks enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_messages enable row level security;

drop policy if exists user_push_own on public.user_push_subscriptions;
create policy user_push_own on public.user_push_subscriptions
for all to authenticated
using (auth_user_id = auth.uid())
with check (auth_user_id = auth.uid());

drop policy if exists resource_watch_own on public.resource_watch_subscriptions;
create policy resource_watch_own on public.resource_watch_subscriptions
for all to authenticated
using (auth_user_id = auth.uid())
with check (auth_user_id = auth.uid());

drop policy if exists community_profiles_read on public.community_profiles;
create policy community_profiles_read on public.community_profiles
for select to authenticated using (true);
drop policy if exists community_profiles_own_write on public.community_profiles;
create policy community_profiles_own_write on public.community_profiles
for all to authenticated
using (auth_user_id = auth.uid())
with check (auth_user_id = auth.uid());

drop policy if exists community_connections_participant on public.community_connections;
create policy community_connections_participant on public.community_connections
for select to authenticated
using (requester_id = auth.uid() or addressee_id = auth.uid());
drop policy if exists community_connections_create on public.community_connections;
create policy community_connections_create on public.community_connections
for insert to authenticated
with check (requester_id = auth.uid());
drop policy if exists community_connections_update on public.community_connections;
create policy community_connections_update on public.community_connections
for update to authenticated
using (requester_id = auth.uid() or addressee_id = auth.uid())
with check (requester_id = auth.uid() or addressee_id = auth.uid());
drop policy if exists community_connections_delete on public.community_connections;
create policy community_connections_delete on public.community_connections
for delete to authenticated
using (requester_id = auth.uid() or addressee_id = auth.uid());

drop policy if exists community_blocks_own on public.community_blocks;
create policy community_blocks_own on public.community_blocks
for all to authenticated
using (blocker_id = auth.uid())
with check (blocker_id = auth.uid());

drop policy if exists community_posts_read on public.community_posts;
create policy community_posts_read on public.community_posts
for select to authenticated
using (
  deleted_at is null
  and not exists (
    select 1 from public.community_blocks b
    where (b.blocker_id = auth.uid() and b.blocked_id = author_id)
       or (b.blocker_id = author_id and b.blocked_id = auth.uid())
  )
);
drop policy if exists community_posts_own_write on public.community_posts;
create policy community_posts_own_write on public.community_posts
for all to authenticated
using (author_id = auth.uid())
with check (author_id = auth.uid());

drop policy if exists community_messages_read on public.community_messages;
create policy community_messages_read on public.community_messages
for select to authenticated
using (sender_id = auth.uid() or recipient_id = auth.uid());
drop policy if exists community_messages_send on public.community_messages;
create policy community_messages_send on public.community_messages
for insert to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1 from public.community_connections c
    where c.status = 'accepted'
      and ((c.requester_id = auth.uid() and c.addressee_id = recipient_id)
        or (c.addressee_id = auth.uid() and c.requester_id = recipient_id))
  )
  and not exists (
    select 1 from public.community_blocks b
    where (b.blocker_id = auth.uid() and b.blocked_id = recipient_id)
       or (b.blocker_id = recipient_id and b.blocked_id = auth.uid())
  )
);
drop policy if exists community_messages_mark_read on public.community_messages;
create policy community_messages_mark_read on public.community_messages
for update to authenticated
using (recipient_id = auth.uid())
with check (recipient_id = auth.uid());

grant select, insert, update, delete on public.user_push_subscriptions to authenticated;
grant select, insert, update, delete on public.resource_watch_subscriptions to authenticated;
grant select, insert, update, delete on public.community_profiles to authenticated;
grant select, insert, update, delete on public.community_connections to authenticated;
grant select, insert, update, delete on public.community_blocks to authenticated;
grant select, insert, update, delete on public.community_posts to authenticated;
grant select, insert, update on public.community_messages to authenticated;

-- Server-side Hero matching uses the existing server-key RLS gate for these tables.
drop policy if exists resource_watch_server_all on public.resource_watch_subscriptions;
create policy resource_watch_server_all on public.resource_watch_subscriptions
for all to anon, authenticated
using (private.hero_server_authorized())
with check (private.hero_server_authorized());
drop policy if exists user_push_server_all on public.user_push_subscriptions;
create policy user_push_server_all on public.user_push_subscriptions
for all to anon, authenticated
using (private.hero_server_authorized())
with check (private.hero_server_authorized());

grant select, insert, update, delete on public.resource_watch_subscriptions to anon;
grant select, insert, update, delete on public.user_push_subscriptions to anon;
