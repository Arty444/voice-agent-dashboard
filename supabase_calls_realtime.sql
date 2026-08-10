-- Live Command Center feed: stream INSERTs on calls to the dashboard.
-- Run once in the Supabase SQL editor (project mhhcyiehibbtspcpryyb).
-- Realtime enforces the calls RLS policies, so each client only receives
-- its own rows.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'calls'
  ) then
    alter publication supabase_realtime add table public.calls;
  end if;
end $$;
