-- 003: Replace the ad-hoc clients policies. Rewritten 2026-07-08 vs live state.
--
-- Live state being replaced: admin_all_clients (hardcoded email, ALL),
-- clients_own_read (email self-read). Grants: anon+authenticated hold ALL
-- privileges — meaning today any logged-in user (any grantee of INSERT/UPDATE
-- via... none: no insert/update policy besides admin_all_clients, so writes
-- were admin-only already; this file keeps that but on the role claim).
--
-- This touches the LOGIN PATH (the dashboard resolves the login email to a
-- clients row right after sign-in) — apply when a briefly broken login is
-- tolerable and run VERIFY immediately.

drop policy if exists admin_all_clients on public.clients;
drop policy if exists clients_own_read on public.clients;

create policy self_or_admin_select_clients
  on public.clients for select to authenticated
  using (
    public.is_admin()
    or lower(clients.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

create policy admin_insert_clients
  on public.clients for insert to authenticated
  with check (public.is_admin());

create policy admin_update_clients
  on public.clients for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Least privilege
revoke all on table public.clients from anon;
revoke delete, truncate, references, trigger on table public.clients from authenticated;
grant select, insert, update on table public.clients to authenticated;

-- ── VERIFY IMMEDIATELY ───────────────────────────────────────────────────────
-- 1. McHugh login works and lands on their dashboard.
-- 2. Team Bundy login works.
-- 3. Admin login works; Admin page lists BOTH clients.
--
-- ROLLBACK: recreate admin_all_clients + clients_own_read from the 000 output.
