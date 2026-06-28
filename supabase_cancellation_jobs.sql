-- Cancellation action-queue for the dashboard "Cancellation Queue" tab + EFC bot.
-- Run this once in the Supabase SQL editor (project mhhcyiehibbtspcpryyb).
--
-- Design contract:
--   * One row per cancellation the staff approved from a call. The dashboard
--     INSERTs rows (status='queued'); the local Playwright bot picks them up,
--     drives EFC, and UPDATEs them (running -> done/failed) with the service key
--     (which bypasses RLS).
--   * Multi-tenant: every row carries client_id; reads are gated to the gym's
--     own login or the admin, exactly like the members/calls tables.
--   * dry_run rows do everything up to (but not including) the final EFC confirm
--     and still resolve to 'done' — the screenshot is the proof.

create table if not exists public.cancellation_jobs (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null,
  call_id        uuid,                       -- source call (FK to calls.id; nullable for manual jobs)
  efc_reference  text,                       -- the EFC account id the bot navigates to
  member_name    text,                       -- expected name; bot verifies it on-page before acting
  caller_phone   text,
  requested_by   text,                       -- staff email that approved (auth.jwt email)
  status         text not null default 'queued',  -- queued | running | done | failed | skipped
  dry_run        boolean not null default true,
  result_note    text,
  screenshot_url text,
  error          text,
  created_at     timestamptz not null default now(),
  started_at     timestamptz,
  finished_at    timestamptz,
  constraint cancellation_jobs_status_chk
    check (status in ('queued','running','done','failed','skipped'))
);

create index if not exists cancellation_jobs_client_status_idx
  on public.cancellation_jobs (client_id, status);
-- The bot claims work by polling the oldest queued rows.
create index if not exists cancellation_jobs_queue_idx
  on public.cancellation_jobs (status, created_at)
  where status = 'queued';
-- Lets the dashboard hide calls that already have a job (see view below).
create index if not exists cancellation_jobs_call_idx
  on public.cancellation_jobs (call_id);

alter table public.cancellation_jobs enable row level security;

-- ── Read: the gym's own login (email on clients) or the admin ────────────────
-- Mirrors client_or_admin_read_members in supabase_member_match.sql.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'cancellation_jobs'
      and policyname = 'client_or_admin_read_cancellation_jobs'
  ) then
    create policy client_or_admin_read_cancellation_jobs
      on public.cancellation_jobs for select to authenticated
      using (
        lower(coalesce(auth.jwt() ->> 'email', '')) = 'johnartmcevoy@gmail.com'
        or exists (
          select 1 from public.clients
          where clients.id = cancellation_jobs.client_id
            and lower(clients.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        )
      );
  end if;
end $$;

-- ── Insert: staff may only queue jobs for THEIR OWN client ───────────────────
-- The bot never inserts; it only updates with the service key (RLS-exempt), so
-- there is intentionally no UPDATE policy for authenticated users.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'cancellation_jobs'
      and policyname = 'client_or_admin_insert_cancellation_jobs'
  ) then
    create policy client_or_admin_insert_cancellation_jobs
      on public.cancellation_jobs for insert to authenticated
      with check (
        lower(coalesce(auth.jwt() ->> 'email', '')) = 'johnartmcevoy@gmail.com'
        or exists (
          select 1 from public.clients
          where clients.id = cancellation_jobs.client_id
            and lower(clients.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        )
      );
  end if;
end $$;

grant select, insert on table public.cancellation_jobs to authenticated;

-- ── cancellation_queue: what the dashboard reads to build the queue ─────────
-- Cancel-intent calls (from the member-aware view) LEFT JOINed to any existing
-- job, so the UI can show "already queued / done" and avoid double-submitting.
-- security_invoker = true so the underlying RLS on calls/members/jobs applies
-- to the calling user.
create or replace view public.cancellation_queue
with (security_invoker = true) as
select
  c.id            as call_id,
  c.client_id,
  c.call_date,
  c.caller_phone,
  c.display_name,
  c.member_efc_reference,
  c.member_status,
  c.is_member,
  c.is_former_member,
  c.call_type,
  c.final_outcome,
  c.summary,
  j.id            as job_id,
  j.status        as job_status,
  j.dry_run       as job_dry_run,
  j.result_note   as job_result_note,
  j.screenshot_url as job_screenshot_url,
  j.error         as job_error,
  j.finished_at   as job_finished_at
from public.calls_with_member c
left join lateral (
  -- the most recent job for this call, if any
  select * from public.cancellation_jobs jj
  where jj.call_id = c.id
  order by jj.created_at desc
  limit 1
) j on true
where lower(coalesce(c.final_outcome, '')) = 'cancelled'
   or c.call_type ilike '%cancel%';

grant select on public.cancellation_queue to authenticated;

-- ── Realtime: let the dashboard get live status pushes as the bot works ──────
-- (No-op if the table is already in the publication.)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'cancellation_jobs'
  ) then
    alter publication supabase_realtime add table public.cancellation_jobs;
  end if;
end $$;
