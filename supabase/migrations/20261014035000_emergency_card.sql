-- Feature 19: Offline-capable medication and emergency contact card.
-- Contents are client-sealed ciphertext: the server validates only the envelope
-- (type tag, version, size) and never sees medications, allergies, or contacts.
-- Plaintext equivalents exist only on the user's device.

create table if not exists public.emergency_cards (
  user_id uuid primary key references auth.users(id) on delete cascade,
  sealed jsonb not null,
  updated_at timestamptz not null default now(),
  constraint emergency_cards_envelope check (
    sealed ? 'type'
    and sealed ->> 'type' = 'emergency-card/v1'
    and sealed ? 'version'
    and (sealed ->> 'version')::integer > 0
    and sealed ? 'ciphertext'
    and pg_column_size(sealed) < 131072
  )
);

alter table public.emergency_cards enable row level security;

drop policy if exists emergency_cards_owner_select on public.emergency_cards;
create policy emergency_cards_owner_select on public.emergency_cards
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists emergency_cards_owner_insert on public.emergency_cards;
create policy emergency_cards_owner_insert on public.emergency_cards
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists emergency_cards_owner_update on public.emergency_cards;
create policy emergency_cards_owner_update on public.emergency_cards
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists emergency_cards_owner_delete on public.emergency_cards;
create policy emergency_cards_owner_delete on public.emergency_cards
  for delete to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.touch_emergency_card_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists emergency_cards_updated_at on public.emergency_cards;
create trigger emergency_cards_updated_at
  before update on public.emergency_cards
  for each row execute function public.touch_emergency_card_updated_at();
