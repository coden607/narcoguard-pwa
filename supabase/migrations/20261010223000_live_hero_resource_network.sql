-- Live Hero responder + community resource network.
-- Additive migration. Exact device coordinates are encrypted and only released to the accepted Hero after explicit consent.
-- Public map/listing data stays coarse; RLS and grants remain least-privilege.

alter table public.hero_availability
  add column if not exists emergency_ready boolean not null default false,
  add column if not exists naloxone_on_call boolean not null default false,
  add column if not exists resource_kinds text[] not null default '{}'::text[];

alter table public.hero_availability
  drop constraint if exists hero_availability_resource_kinds_check;
alter table public.hero_availability
  add constraint hero_availability_resource_kinds_check
  check (
    resource_kinds <@ array[
      'naloxone','food','water','clothing','hygiene','ride','phone-charging','shelter-help','other'
    ]::text[]
  );

alter table public.hero_requests
  add column if not exists kind text not null default 'emergency',
  add column if not exists resource_kind text,
  add column if not exists status text not null default 'open',
  add column if not exists accepted_by uuid references auth.users(id) on delete set null,
  add column if not exists accepted_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists request_token_hash text,
  add column if not exists location_ciphertext text,
  add column if not exists meeting_note text;

alter table public.hero_requests
  drop constraint if exists hero_requests_kind_check;
alter table public.hero_requests
  add constraint hero_requests_kind_check
  check (kind in ('emergency','resource'));

alter table public.hero_requests
  drop constraint if exists hero_requests_resource_kind_check;
alter table public.hero_requests
  add constraint hero_requests_resource_kind_check
  check (
    resource_kind is null or resource_kind in (
      'naloxone','food','water','clothing','hygiene','ride','phone-charging','shelter-help','other'
    )
  );

alter table public.hero_requests
  drop constraint if exists hero_requests_status_check;
alter table public.hero_requests
  add constraint hero_requests_status_check
  check (status in ('open','accepted','completed','cancelled'));

alter table public.hero_requests
  drop constraint if exists hero_requests_meeting_note_length_check;
alter table public.hero_requests
  add constraint hero_requests_meeting_note_length_check
  check (meeting_note is null or char_length(meeting_note) <= 240);

create index if not exists hero_requests_cell_status_idx
  on public.hero_requests(cell, status, expires_at);
create index if not exists hero_requests_accepted_by_idx
  on public.hero_requests(accepted_by, status);

alter table public.hero_availability enable row level security;
alter table public.hero_requests enable row level security;

revoke all on table public.hero_availability from public, anon, authenticated;
revoke all on table public.hero_requests from public, anon, authenticated;

grant select, delete on table public.hero_availability to authenticated;
grant select, insert, update, delete on table public.hero_availability to service_role;
grant select, insert, update, delete on table public.hero_requests to service_role;
