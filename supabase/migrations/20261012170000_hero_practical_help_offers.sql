-- Feature 11: separate time-limited practical-help offers from emergency Hero status.
-- Exact coordinates never persist; only the same coarse cell used by the Hero map is stored.

create table if not exists public.hero_practical_offers (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  cell text not null,
  resource_kinds text[] not null default '{}'::text[],
  available_until timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.hero_practical_offers
  drop constraint if exists hero_practical_offers_resource_kinds_check;
alter table public.hero_practical_offers
  add constraint hero_practical_offers_resource_kinds_check
  check (
    cardinality(resource_kinds) > 0
    and resource_kinds <@ array[
      'food','water','shower','clothing','hygiene','ride',
      'phone-charging','shelter-help','other'
    ]::text[]
  );

alter table public.hero_practical_offers
  drop constraint if exists hero_practical_offers_cell_check;
alter table public.hero_practical_offers
  add constraint hero_practical_offers_cell_check
  check (cell ~ '^-?[0-9]{1,5}:-?[0-9]{1,5}$');

create index if not exists hero_practical_offers_cell_until_idx
  on public.hero_practical_offers(cell, available_until);

alter table public.hero_practical_offers enable row level security;

revoke all on table public.hero_practical_offers from public, anon, authenticated;
grant select, insert, update, delete on table public.hero_practical_offers to service_role;
