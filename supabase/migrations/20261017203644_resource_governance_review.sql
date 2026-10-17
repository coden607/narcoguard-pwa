-- Review operations are service-only RPCs. No client profile role grants authority.
create table public.resource_reviewers (
  user_id uuid primary key references auth.users(id),
  appointed_at timestamptz not null default now()
);
alter table public.resource_reviewers enable row level security;
revoke all on public.resource_reviewers from anon, authenticated;

create table public.resource_reviews (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('correction','duplicate','appeal')),
  reporter_id uuid not null references auth.users(id),
  resource_ref text,
  target_ref text,
  parent_id uuid references public.resource_reports(id),
  appeal_decision_version uuid,
  appeal_decided_by uuid references auth.users(id),
  proposed_text text not null check (length(proposed_text) between 1 and 2000),
  source_url text,
  status text not null default 'pending' check (status in ('pending','verified','published','rejected','undone','upheld','overturned','superseded')),
  verified_by uuid references auth.users(id),
  verification_note text,
  decided_by uuid references auth.users(id),
  decision_reason text,
  created_at timestamptz not null default now(),
  check ((kind = 'appeal' and parent_id is not null) or (kind <> 'appeal' and resource_ref is not null and source_url ~ '^https?://')),
  check (kind <> 'duplicate' or (target_ref is not null and target_ref <> resource_ref))
);
create unique index resource_one_active_alias on public.resource_reviews(resource_ref) where kind = 'duplicate' and status = 'published';
create unique index resource_one_pending_appeal on public.resource_reviews(parent_id) where kind = 'appeal' and status = 'pending';
create index resource_reviews_owner on public.resource_reviews(reporter_id, created_at desc);
alter table public.resource_reviews enable row level security;
revoke all on public.resource_reviews from anon, authenticated;

create table public.resource_review_events (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.resource_reviews(id),
  actor_id uuid not null references auth.users(id),
  action text not null,
  reason text,
  created_at timestamptz not null default now()
);
alter table public.resource_review_events enable row level security;
revoke all on public.resource_review_events from anon, authenticated;
grant all on public.resource_reviewers, public.resource_reviews, public.resource_review_events to service_role;

alter table public.resource_reports add column observed_at timestamptz,
  add column observed_timezone text,
  add column observed_hours text,
  add column decided_by uuid references auth.users(id),
  add column decision_version uuid not null default gen_random_uuid();
-- Every source of report inserts, including direct Data API requests, shares an atomic per-account cap.
create function public.resource_report_limit() returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if new.reporter_id is null then raise insufficient_privilege; end if;
  perform pg_advisory_xact_lock(hashtext(new.reporter_id::text));
  if (select count(*) from public.resource_reports where reporter_id = new.reporter_id and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Report rate limit' using errcode = 'P0001';
  end if;
  if new.observed_at is not null and (new.observed_at > now() + interval '5 minutes' or new.observed_timezone is null or new.observed_hours is null or length(new.observed_hours) not between 1 and 500) then
    raise exception 'Invalid observation' using errcode = '22023';
  end if;
  if new.observed_at is null and (new.observed_timezone is not null or new.observed_hours is not null) then raise exception 'Observation time required' using errcode = '22023'; end if;
  return new;
end $$;
create trigger resource_report_submission_limit before insert on public.resource_reports for each row execute function public.resource_report_limit();
revoke all on function public.resource_report_limit() from public;

-- Server verifies the session, then supplies actor. This invoker RPC is never callable by a browser role.
create function public.resource_governance(operation text, payload jsonb) returns jsonb
language plpgsql security invoker set search_path = public as $$
declare
  actor uuid := nullif(payload->>'actor','')::uuid;
  kind_value text := payload->>'kind';
  reviewer boolean;
  row_value public.resource_reviews%rowtype;
  report public.resource_reports%rowtype;
  action_value text := payload->>'action';
  reason_value text := payload->>'reason';
  result jsonb;
  ref text := payload->>'resourceRef';
  canonical text;
begin
  if operation = 'public' then
    canonical := coalesce((select target_ref from public.resource_reviews where kind = 'duplicate' and status = 'published' and resource_ref = ref), ref);
    select jsonb_build_object('resourceRef',ref,'canonicalRef',canonical,
      'corrections',coalesce((select jsonb_agg(jsonb_build_object('id',id,'resource_ref',resource_ref,'proposed_text',proposed_text,'source_url',source_url,'created_at',created_at,'decision_reason',decision_reason)) from public.resource_reviews where kind='correction' and status='published' and resource_ref in (ref,canonical)), '[]'::jsonb),
      'aliases',coalesce((select jsonb_agg(jsonb_build_object('source_ref',resource_ref,'target_ref',target_ref,'source_urls',jsonb_build_array(source_url))) from public.resource_reviews where kind='duplicate' and status='published' and (resource_ref=ref or target_ref=canonical)), '[]'::jsonb)) into result;
    return result;
  end if;
  if actor is null then raise insufficient_privilege; end if;
  reviewer := exists(select 1 from public.resource_reviewers where user_id=actor);
  if operation = 'list' then
    if coalesce((payload->>'queue')::boolean,false) and not reviewer then raise insufficient_privilege; end if;
    select coalesce(jsonb_agg((to_jsonb(r) - 'reporter_id' - 'verified_by' - 'decided_by' - 'appeal_decided_by' - 'appeal_decision_version') - case when reviewer and coalesce((payload->>'queue')::boolean,false) then '__no_field__' else 'verification_note' end), '[]'::jsonb) into result
      from (select * from public.resource_reviews where kind=kind_value and (reporter_id=actor or (reviewer and coalesce((payload->>'queue')::boolean,false))) order by created_at desc limit 100) r;
    return jsonb_build_object('items',result,'reviewer',reviewer);
  end if;
  if operation = 'submit' then
    perform pg_advisory_xact_lock(hashtext(actor::text));
    if (select count(*) from public.resource_reviews where reporter_id=actor and created_at > now()-interval '1 hour') >= 5 then raise exception 'Review rate limit' using errcode='P0001'; end if;
    if kind_value = 'appeal' then
      select * into report from public.resource_reports where id=(payload->>'parentId')::uuid and reporter_id=actor for update;
      if not found or report.status not in ('resolved','dismissed') or report.resolution is null or report.decided_by is null then raise insufficient_privilege; end if;
    end if;
    insert into public.resource_reviews(kind,reporter_id,resource_ref,target_ref,parent_id,proposed_text,source_url,appeal_decision_version,appeal_decided_by)
      values(kind_value,actor,ref,payload->>'targetRef',(payload->>'parentId')::uuid,payload->>'text',payload->>'sourceUrl',report.decision_version,report.decided_by) returning * into row_value;
    insert into public.resource_review_events(review_id,actor_id,action) values(row_value.id,actor,'submitted');
    return jsonb_build_object('id',row_value.id,'status',row_value.status);
  end if;
  if operation <> 'decide' or not reviewer or length(coalesce(reason_value,'')) not between 1 and 1000 then raise insufficient_privilege; end if;
  -- Serialize merge/undo to prevent cycles and conflicting aliases, including concurrent reviews.
  perform pg_advisory_xact_lock(hashtext('resource-governance-decisions'));
  select * into row_value from public.resource_reviews where id=(payload->>'id')::uuid and kind=kind_value for update;
  if not found or row_value.reporter_id=actor then raise insufficient_privilege; end if;
  if action_value='verify' and kind_value='correction' and row_value.status='pending' then
    update public.resource_reviews set status='verified',verified_by=actor,verification_note=reason_value where id=row_value.id;
  elsif action_value='publish' and ((kind_value='correction' and row_value.status='verified' and row_value.verified_by is not null) or (kind_value='duplicate' and row_value.status='pending')) then
    if kind_value='duplicate' and exists(select 1 from public.resource_reviews where kind='duplicate' and status='published' and (resource_ref in (row_value.resource_ref,row_value.target_ref) or target_ref=row_value.resource_ref)) then
      raise unique_violation using message='Resolve existing aliases before merging';
    end if;
    update public.resource_reviews set status='published',decided_by=actor,decision_reason=reason_value where id=row_value.id;
  elsif action_value='reject' and row_value.status in ('pending','verified') then
    update public.resource_reviews set status='rejected',decided_by=actor,decision_reason=reason_value where id=row_value.id;
  elsif action_value='undo' and kind_value in ('duplicate','correction') and row_value.status='published' then
    update public.resource_reviews set status='undone',decided_by=actor,decision_reason=reason_value where id=row_value.id;
  elsif action_value in ('uphold','overturn') and kind_value='appeal' and row_value.status='pending' then
    select * into report from public.resource_reports where id=row_value.parent_id for update;
    if row_value.appeal_decided_by=actor or report.decided_by=actor or report.reporter_id=actor or row_value.appeal_decision_version is distinct from report.decision_version then raise insufficient_privilege; end if;
    if action_value='overturn' then
      update public.resource_reports set status='open', resolution=null, decided_by=null, decision_version=gen_random_uuid() where id=report.id;
      insert into public.resource_moderation_events(report_id,actor_id,action,note) values(report.id,actor,'reopened',reason_value);
    end if;
    update public.resource_reviews set status=case when action_value='uphold' then 'upheld' else 'overturned' end,decided_by=actor,decision_reason=reason_value where id=row_value.id;
  else raise unique_violation using message='Invalid review transition'; end if;
  insert into public.resource_review_events(review_id,actor_id,action,reason) values(row_value.id,actor,action_value,reason_value);
  return (select jsonb_build_object('id',id,'status',status) from public.resource_reviews where id=row_value.id);
end $$;
revoke all on function public.resource_governance(text,jsonb) from public, anon, authenticated;
grant execute on function public.resource_governance(text,jsonb) to service_role;

-- Report decision and audit commit together; appeals rely on this recorded reviewer.
create function public.resource_report_decide(actor uuid, report_id uuid, target_status text, reason_value text) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare current_status text;
begin
  if not exists(select 1 from public.resource_reviewers where user_id=actor) then raise insufficient_privilege; end if;
  select status into current_status from public.resource_reports where id=report_id and reporter_id is distinct from actor for update;
  if not found then raise insufficient_privilege; end if;
  if not ((current_status='open' and target_status in ('triaged','dismissed')) or (current_status='triaged' and target_status in ('resolved','dismissed','open')) or (current_status='dismissed' and target_status='open')) then raise unique_violation; end if;
  if target_status in ('resolved','dismissed') and length(coalesce(reason_value,'')) not between 1 and 1000 then raise exception 'Reason required' using errcode='22023'; end if;
  update public.resource_reports set status=target_status,resolution=case when target_status in ('resolved','dismissed') then reason_value else null end,decided_by=actor,decision_version=gen_random_uuid() where id=report_id;
  insert into public.resource_review_events(review_id,actor_id,action,reason) select id,actor,'superseded','Report decision changed; submit a new appeal for the current decision.' from public.resource_reviews where kind='appeal' and parent_id=report_id and status='pending';
  update public.resource_reviews set status='superseded',decision_reason='Report decision changed; submit a new appeal for the current decision.' where kind='appeal' and parent_id=report_id and status='pending';
  insert into public.resource_moderation_events(report_id,actor_id,action,note) values(report_id,actor,case when target_status='open' then 'reopened' else target_status end,reason_value);
  return jsonb_build_object('id',report_id,'status',target_status);
end $$;
revoke all on function public.resource_report_decide(uuid,uuid,text,text) from public, anon, authenticated;
grant execute on function public.resource_report_decide(uuid,uuid,text,text) to service_role;

-- Only the server can populate decision/observation metadata; identity is taken from its validated session.
drop policy if exists resource_reports_insert on public.resource_reports;
create function public.resource_report_submit(actor uuid, resource_ref_value text, reason_value text, details_value text, observation jsonb default null) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare report_id uuid;
begin
  if actor is null then raise insufficient_privilege; end if;
  insert into public.resource_reports(resource_ref,reporter_id,reason,details,observed_at,observed_timezone,observed_hours)
    values(resource_ref_value,actor,reason_value,details_value,(observation->>'observed_at')::timestamptz,observation->>'observed_timezone',observation->>'observed_hours') returning id into report_id;
  insert into public.resource_moderation_events(report_id,actor_id,action) values(report_id,actor,'submitted');
  return jsonb_build_object('id',report_id,'status','open');
end $$;
revoke all on function public.resource_report_submit(uuid,text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.resource_report_submit(uuid,text,text,text,jsonb) to service_role;
grant select, insert, update on public.resource_reports to service_role;
grant select, insert on public.resource_moderation_events to service_role;
grant select on public.resource_reports to authenticated;
