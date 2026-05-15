grant insert on table public.calls to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'calls'
      and policyname = 'client_or_admin_insert_manual_calls'
  ) then
    create policy client_or_admin_insert_manual_calls
    on public.calls
    for insert
    to authenticated
    with check (
      lower(coalesce(auth.jwt() ->> 'email', '')) = 'johnartmcevoy@gmail.com'
      or exists (
        select 1
        from public.clients
        where clients.id = client_id
          and lower(clients.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
    );
  end if;
end $$;
