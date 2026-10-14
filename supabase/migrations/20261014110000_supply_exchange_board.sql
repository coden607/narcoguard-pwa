-- Feature 23: Supply exchange board.
-- Local, moderated listings for naloxone kits, chargers, hygiene packs, and
-- transit help between users and organizations. Listings carry explicit
-- provenance (individual vs organization) and are reported through the
-- existing resource moderation queue (Feature 15) using a source-scoped
-- `supply:<id>` reference, so takedowns keep the same auditable trail.

create table if not exists public.supply_listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('naloxone-kit','charger','hygiene-pack','transit-help')),
  title text not null check (char_length(title) between 3 and 120),
  description text not null check (char_length(description) between 1 and 2000),
  condition text check (condition is null or condition in ('new','like-new','used','unknown')),
  quantity integer not null default 1 check (quantity between 1 and 20),
  -- City/neighborhood label only. A check constraint rejects raw coordinates
  -- so the board cannot become a precise-location history.
  location_label text not null check (
    char_length(location_label) between 3 and 120
    and location_label !~ '^[+-]?\d+(\.\d+)?\s*,\s*[+-]?\d+(\.\d+)?$'
  ),
  provenance text not null default 'individual' check (provenance in ('individual','organization')),
  status text not null default 'open' check (status in ('open','claimed','closed')),
  claimed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists supply_listings_board_idx
  on public.supply_listings(status, created_at desc);

create index if not exists supply_listings_kind_idx
  on public.supply_listings(kind, status);

alter table public.supply_listings enable row level security;

-- Anyone signed in can post a listing bound to their own account.
create policy supply_listings_insert on public.supply_listings
  for insert to authenticated
  with check (owner_id = auth.uid());

-- The board is visible to signed-in users: open listings from everyone,
-- plus your own claimed/closed history.
create policy supply_listings_select on public.supply_listings
  for select to authenticated
  using (status = 'open' or owner_id = auth.uid() or claimed_by = auth.uid());

-- Owners manage their own open listings (edit text, close). Claims and
-- releases go through the claim policies below so ownership rules are
-- enforced by the database, not by client code.
create policy supply_listings_update_owner on public.supply_listings
  for update to authenticated
  using (owner_id = auth.uid() and status = 'open')
  with check (owner_id = auth.uid());

-- A claimant marks an open listing claimed; the owner cannot claim their
-- own listing. One open row can only be claimed once (status guard above).
create policy supply_listings_claim on public.supply_listings
  for update to authenticated
  using (status = 'open')
  with check (claimed_by = auth.uid() and owner_id <> auth.uid() and status = 'claimed');

-- A claimant releases a claim back to open, clearing the claim column.
create policy supply_listings_release on public.supply_listings
  for update to authenticated
  using (claimed_by = auth.uid() and status = 'claimed')
  with check (status = 'open' and claimed_by is null);

-- Moderator takedowns run server-side with the service role after a
-- moderator-role check (same pattern as the resource moderation queue),
-- so no RLS policy grants that path here.

create or replace function public.touch_supply_listing_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists supply_listings_updated_at on public.supply_listings;
create trigger supply_listings_updated_at
  before update on public.supply_listings
  for each row execute function public.touch_supply_listing_updated_at();
