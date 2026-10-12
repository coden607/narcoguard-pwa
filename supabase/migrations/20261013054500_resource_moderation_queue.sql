-- Feature 15: Resource moderation queue.
-- Reports, duplicates, stale listings, unsafe content, and provider corrections
-- move through an auditable moderation workflow. Every status change writes an
-- immutable event row so the full history of a report is reconstructable.

create table if not exists public.resource_reports (
  id uuid primary key default gen_random_uuid(),
  -- Source-scoped resource identifier (provider + external id), never raw coordinates.
  resource_ref text not null check (char_length(resource_ref) between 3 and 512),
  reporter_id uuid references auth.users(id) on delete set null,
  reason text not null check (reason in ('incorrect','duplicate','stale','unsafe','provider-correction','other')),
  details text not null check (char_length(details) between 1 and 2000),
  status text not null default 'open' check (status in ('open','triaged','resolved','dismissed')),
  resolution text check (resolution is null or char_length(resolution) between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists resource_reports_queue_idx
  on public.resource_reports(status, created_at desc);

create index if not exists resource_reports_ref_idx
  on public.resource_reports(resource_ref);

-- Immutable audit trail. No update or delete policy is granted anywhere.
create table if not exists public.resource_moderation_events (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.resource_reports(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('submitted','triaged','resolved','dismissed','reopened')),
  note text check (note is null or char_length(note) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists resource_moderation_events_report_idx
  on public.resource_moderation_events(report_id, created_at);

alter table public.resource_reports enable row level security;
alter table public.resource_moderation_events enable row level security;

-- Anyone signed in can file a report about their own account only.
create policy resource_reports_insert on public.resource_reports
  for insert to authenticated
  with check (reporter_id = auth.uid());

-- A reporter can see their own reports; the moderation queue is read
-- server-side with the service role after a moderator-role check.
create policy resource_reports_select_own on public.resource_reports
  for select to authenticated
  using (reporter_id = auth.uid());

-- Report authors can follow the audit trail on their own reports.
create policy resource_moderation_events_select_own on public.resource_moderation_events
  for select to authenticated
  using (
    exists (
      select 1 from public.resource_reports r
      where r.id = report_id and r.reporter_id = auth.uid()
    )
  );

-- Status changes and notes are written only by server-side moderation,
-- which uses the service role and records the actor in the event row.
create or replace function public.touch_resource_report_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists resource_reports_updated_at on public.resource_reports;
create trigger resource_reports_updated_at
  before update on public.resource_reports
  for each row execute function public.touch_resource_report_updated_at();
