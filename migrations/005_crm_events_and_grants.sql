-- 005: crm_events cleanup + project-wide TRUNCATE revocation.
-- New file 2026-07-08 — the 000 check revealed a crm_events table (not in the
-- repo) with the same open-insert pattern as calls/leads.
--
-- Live state being replaced: admin_all_crm_events (hardcoded email),
-- client_own_crm_events (select), service_insert_crm_events (INSERT with
-- check TRUE → anon-key forgery hole; the webhook inserts with the service
-- key and bypasses RLS, so no authenticated insert policy is needed).

drop policy if exists admin_all_crm_events on public.crm_events;
drop policy if exists client_own_crm_events on public.crm_events;
drop policy if exists service_insert_crm_events on public.crm_events;

create policy client_or_admin_select_crm_events
  on public.crm_events for select to authenticated
  using (public.can_access_client(crm_events.client_id));

revoke all on table public.crm_events from anon;
revoke insert, update, delete, truncate, references, trigger
  on table public.crm_events from authenticated;
grant select on table public.crm_events to authenticated;

-- ── TRUNCATE everywhere ───────────────────────────────────────────────────────
-- TRUNCATE is NOT subject to row security — RLS on a table does nothing to
-- stop it. Supabase's default grants hand it to anon/authenticated, so strip
-- it (and the equally unneeded REFERENCES/TRIGGER) from every business table.
revoke truncate, references, trigger on table
  public.members, public.cancellation_jobs, public.member_reply_drafts,
  public.efc_session_status
from anon, authenticated;

-- These tables are backend-written (service key); anon needs nothing at all.
revoke all on table public.members from anon;
revoke all on table public.cancellation_jobs from anon;
revoke all on table public.member_reply_drafts from anon;
revoke all on table public.efc_session_status from anon;

-- ── VERIFY ────────────────────────────────────────────────────────────────────
-- 1. Dashboard still fully works for all three logins (Members tags,
--    Cancellation Queue, Replies tab, EFC status light).
-- 2. Re-run the grants query from 000 (query 3, with crm_events): anon should
--    have NO rows for calls/leads/clients/crm_events; authenticated should
--    show only select/insert/update where intended and NO TRUNCATE anywhere.
