-- 000: PRE-FLIGHT STATE CHECK — READ-ONLY, run this FIRST and report the output
-- before applying any of the numbered migrations that follow.
--
-- Why: the repo's SQL files and the live database have drifted (e.g.
-- supabase_member_match.sql refers to a calls read policy that exists in prod
-- but in no file here). This tells us exactly what the live state is so the
-- later migrations don't fight it.
--
-- HOW TO READ THE RESULTS
--
-- Query 1 (rowsecurity):
--   * calls = f  → the calls table is OPEN: any logged-in dashboard user could
--     read every client's calls. Migration 002 is the fix. Expect zero visible
--     change for legitimate users.
--   * calls = t AND Query 2 shows a SELECT policy on calls → prod has an
--     ad-hoc policy created in the SQL editor that was never saved to the repo.
--     Copy that policy row's text into FOUNDATION_AUDIT.md; migration 002
--     replaces it with the versioned one.
--   * calls = t AND NO select policy on calls → should be impossible (the
--     dashboard reads calls via the anon key and works today, which requires
--     either RLS off or a select policy). If you see this, STOP and report.
--   * Apply the same logic to leads and clients. NOTE: login itself reads the
--     clients table, so its state matters for migration 003.
--
-- Query 2 (policies): the full live policy list. Anything here that is not in
--   a repo SQL file is drift — record it.
--
-- Query 3 (grants): confirms which tables the anon/authenticated roles can
--   even touch. Supabase grants broadly by default; RLS is the real gate.

-- 1. Is RLS enabled per table?
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('calls', 'leads', 'clients', 'members', 'cancellation_jobs',
                    'member_reply_drafts', 'efc_session_status')
order by tablename;

-- 2. Every live policy on those tables.
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 3. What anon / authenticated are granted.
select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
  and table_name in ('calls', 'leads', 'clients')
order by table_name, grantee, privilege_type;
