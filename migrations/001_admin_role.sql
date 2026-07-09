-- 001: Admin role via JWT app_metadata + shared policy helpers.
-- Rewritten 2026-07-08 against the ACTUAL live state (000 output): RLS is
-- already enabled on every table; live has ad-hoc policies (admin_all_*,
-- client_own_*, service_insert_*, get_my_client_id()) created in the SQL
-- editor. This file only sets up the admin mechanism and rewrites the six
-- repo-tracked policies; 002/003/005 replace the ad-hoc ones per table.
--
-- What this does:
--   1. Marks the owner account as admin in auth.users app_metadata (only
--      writable server-side — a user can never self-grant it).
--   2. Creates is_admin() and can_access_client(uuid) helpers used by every
--      policy from now on — one source of truth instead of a hardcoded email
--      in a dozen places.
--   3. Recreates the six repo-file policies on the helpers.
--
-- AFTER APPLYING: SIGN OUT and SIGN BACK IN on the dashboard as the admin so
-- the new JWT carries the role claim. Do this BEFORE applying 002, or the
-- admin sees empty tables until re-login.

-- ── 1. Grant the admin role ──────────────────────────────────────────────────
update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
                           || '{"role": "admin"}'::jsonb
 where lower(email) = 'johnartmcevoy@gmail.com';

-- ── 2. Helpers ────────────────────────────────────────────────────────────────
create or replace function public.is_admin() returns boolean
language sql stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
$$;

-- True when the caller is the admin, or their login email owns this client row.
create or replace function public.can_access_client(cid uuid) returns boolean
language sql stable
as $$
  select public.is_admin()
      or exists (
           select 1 from public.clients
           where clients.id = cid
             and lower(clients.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
         )
$$;

-- ── 3. Recreate the six repo-tracked policies on the helpers ─────────────────
drop policy if exists client_or_admin_read_members on public.members;
create policy client_or_admin_read_members
  on public.members for select to authenticated
  using (public.can_access_client(members.client_id));

drop policy if exists client_or_admin_read_cancellation_jobs on public.cancellation_jobs;
create policy client_or_admin_read_cancellation_jobs
  on public.cancellation_jobs for select to authenticated
  using (public.can_access_client(cancellation_jobs.client_id));

drop policy if exists client_or_admin_insert_cancellation_jobs on public.cancellation_jobs;
create policy client_or_admin_insert_cancellation_jobs
  on public.cancellation_jobs for insert to authenticated
  with check (public.can_access_client(cancellation_jobs.client_id));

drop policy if exists client_or_admin_read_reply_drafts on public.member_reply_drafts;
create policy client_or_admin_read_reply_drafts
  on public.member_reply_drafts for select to authenticated
  using (public.can_access_client(member_reply_drafts.client_id));

drop policy if exists client_or_admin_update_reply_drafts on public.member_reply_drafts;
create policy client_or_admin_update_reply_drafts
  on public.member_reply_drafts for update to authenticated
  using (public.can_access_client(member_reply_drafts.client_id))
  with check (public.can_access_client(member_reply_drafts.client_id));

drop policy if exists client_or_admin_read_efc_status on public.efc_session_status;
create policy client_or_admin_read_efc_status
  on public.efc_session_status for select to authenticated
  using (public.can_access_client(efc_session_status.client_id));

-- ── VERIFY ────────────────────────────────────────────────────────────────────
-- 1. Sign out/in as the admin on the dashboard.
-- 2. Admin still sees Members tags + Cancellation Queue for both clients.
-- 3. McHugh + Team Bundy logins unaffected (their access is via the email
--    branch of can_access_client — same rule as before, new plumbing).
