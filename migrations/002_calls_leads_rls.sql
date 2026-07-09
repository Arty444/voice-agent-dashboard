-- 002: Replace the ad-hoc calls/leads policies and close the open-insert +
-- TRUNCATE holes. Rewritten 2026-07-08 against the live state.
--
-- Live state being replaced (from the 000 check):
--   calls:  admin_all_calls (hardcoded email), client_own_calls (select),
--           client_update_own_calls (update), service_insert_calls
--           (INSERT with check TRUE — the hole: anyone with the anon key can
--           insert rows into ANY tenant; the real backend uses the service
--           key, which bypasses RLS and never needed this policy)
--   leads:  same four (admin_all_leads / client_own_leads /
--           client_update_own_leads / service_insert_leads)
--   grants: anon + authenticated hold ALL privileges incl. TRUNCATE, and
--           TRUNCATE IGNORES row security — revoked below.
--
-- Run AFTER 001 is applied AND the admin has signed out/in once.

-- ── calls ─────────────────────────────────────────────────────────────────────
drop policy if exists admin_all_calls on public.calls;
drop policy if exists client_own_calls on public.calls;
drop policy if exists client_update_own_calls on public.calls;
drop policy if exists service_insert_calls on public.calls;
drop policy if exists client_or_admin_insert_manual_calls on public.calls;

create policy client_or_admin_select_calls
  on public.calls for select to authenticated
  using (public.can_access_client(calls.client_id));

create policy client_or_admin_update_calls
  on public.calls for update to authenticated
  using (public.can_access_client(calls.client_id))
  with check (public.can_access_client(calls.client_id));

-- Manual front-desk messages: a gym may insert calls ONLY into its own tenant.
create policy client_or_admin_insert_calls
  on public.calls for insert to authenticated
  with check (public.can_access_client(calls.client_id));

-- ── leads ─────────────────────────────────────────────────────────────────────
drop policy if exists admin_all_leads on public.leads;
drop policy if exists client_own_leads on public.leads;
drop policy if exists client_update_own_leads on public.leads;
drop policy if exists service_insert_leads on public.leads;

create policy client_or_admin_select_leads
  on public.leads for select to authenticated
  using (public.can_access_client(leads.client_id));

create policy client_or_admin_update_leads
  on public.leads for update to authenticated
  using (public.can_access_client(leads.client_id))
  with check (public.can_access_client(leads.client_id));

-- No authenticated INSERT on leads: only the webhook creates leads (service
-- key, bypasses RLS). No DELETE anywhere: dashboard soft-deletes via UPDATE.

-- ── grants: least privilege ───────────────────────────────────────────────────
-- anon (the key shipped in the public dashboard JS) needs NOTHING here.
revoke all on table public.calls from anon;
revoke all on table public.leads from anon;
-- authenticated keeps only the verbs the dashboard uses. TRUNCATE especially
-- must go — it is NOT stopped by row security, only by lacking the privilege.
revoke delete, truncate, references, trigger on table public.calls from authenticated;
revoke delete, truncate, references, trigger on table public.leads from authenticated;
revoke insert on table public.leads from authenticated;
grant select, insert, update on table public.calls to authenticated;
grant select, update on table public.leads to authenticated;

-- ── VERIFY (all of it) ────────────────────────────────────────────────────────
-- 1. McHugh login: Calls / Messages / Leads / Analytics load; Mark Handled,
--    Pin, staff note, soft-delete, manual message, lead-status change all work.
-- 2. Team Bundy login: same checks, only Bundy rows visible.
-- 3. Admin login (after the 001 re-login): both tenants visible.
-- 4. The anon-forgery hole is closed — from a terminal, this must return an
--    error/denied, NOT a created row (use your project URL + anon key):
--      curl -X POST 'https://mhhcyiehibbtspcpryyb.supabase.co/rest/v1/calls' \
--        -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>" \
--        -H "Content-Type: application/json" \
--        -d '{"client_id":"6d047c8a-bedf-4feb-9223-803c57a8ce1a","caller_name":"forgery-test"}'
--
-- ROLLBACK (emergency only — restores the previous live policies):
--   recreate admin_all_calls/client_own_calls/client_update_own_calls/
--   service_insert_calls from the 000 output you saved, and re-grant.
