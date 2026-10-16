-- Nearby Hero requests (built, switched off by HERO_ALERTS_ENABLED). Additive and safe to repeat.
-- Do not apply to production until the separate safety and privacy review approves the feature.
-- Only coarse ~5 km grid cells are stored; no exact location, name or health detail.

create table if not exists public.hero_availability (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  cell text not null check (cell ~ '^-?\d{1,5}:-?\d{1,5}$'),
  available_until timestamptz not null,
  paused boolean not null default false,
  updated_at timestamptz not null default now()
);

create index if not exists hero_availability_cell_idx on public.hero_availability(cell);
alter table public.hero_availability enable row level security;

-- Heroes can see and remove their own availability; writes go through the server.
drop policy if exists hero_availability_owner_select on public.hero_availability;
create policy hero_availability_owner_select on public.hero_availability for select to authenticated using (auth_user_id = (select auth.uid()));
drop policy if exists hero_availability_owner_delete on public.hero_availability;
create policy hero_availability_owner_delete on public.hero_availability for delete to authenticated using (auth_user_id = (select auth.uid()));

-- Requests carry no requester identity. Server-only; no client policies.
create table if not exists public.hero_requests (
  id uuid primary key default gen_random_uuid(),
  cell text not null check (cell ~ '^-?\d{1,5}:-?\d{1,5}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists hero_requests_open_idx on public.hero_requests(expires_at);
alter table public.hero_requests enable row level security;
