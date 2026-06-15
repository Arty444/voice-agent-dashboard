-- Member-match + caller "address book" for the Call History dashboard.
-- Run this once in the Supabase SQL editor (project mhhcyiehibbtspcpryyb).
--
-- Design contract:
--   * Every tag reflects a real phone hit against a real EFC record, and shows
--     that record's actual status: Member (Enrolled), Inactive Member
--     (Inactive), or Lead (Prospective).
--   * A NON-match is NULL — no tag at all. A status is NEVER inferred from a
--     miss; "Lead" only ever comes from an actual Prospective record in EFC,
--     not from the absence of a member match.
--   * Everything is a live LEFT JOIN, so re-importing members (or new calls
--     arriving) retroactively re-evaluates the whole call history.

-- ── Phone normalization: one rule, used by SQL and the loader ────────────────
create or replace function public.norm_phone(raw text) returns text as $$
  -- strip non-digits, drop a leading US "1", keep the last 10 digits; '' if none
  select case
    when length(regexp_replace(coalesce(raw, ''), '\D', '', 'g')) = 0 then ''
    else right(
      case
        when length(regexp_replace(raw, '\D', '', 'g')) = 11
             and left(regexp_replace(raw, '\D', '', 'g'), 1) = '1'
          then substr(regexp_replace(raw, '\D', '', 'g'), 2)
        else regexp_replace(raw, '\D', '', 'g')
      end, 10)
  end;
$$ language sql immutable;

-- A real caller name, or NULL for placeholders the agent records when it never
-- got one ('N/A', 'Unknown', etc.) — mirrors the dashboard's isBlankValue().
create or replace function public.clean_name(raw text) returns text as $$
  select case
    when lower(btrim(coalesce(raw, ''))) in ('', 'n/a', 'na', 'none', 'null', 'unknown')
      then null
    else btrim(raw)
  end;
$$ language sql immutable;

-- ── members: loaded from the EFC "Enrolled" export ──────────────────────────
create table if not exists public.members (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null,
  phone_norm    text not null,
  contact_name  text,                       -- PARENT / account contact (who calls)
  member_name   text,                       -- enrolled person (often the child)
  efc_reference text,
  status        text,
  imported_at   timestamptz not null default now()
);
create index if not exists members_client_phone_idx
  on public.members (client_id, phone_norm);

alter table public.members enable row level security;

-- Read policy mirrors the calls table: the gym's own login (by email on the
-- clients table) or the admin can read that client's members.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'members'
      and policyname = 'client_or_admin_read_members'
  ) then
    create policy client_or_admin_read_members
      on public.members for select to authenticated
      using (
        lower(coalesce(auth.jwt() ->> 'email', '')) = 'johnartmcevoy@gmail.com'
        or exists (
          select 1 from public.clients
          where clients.id = members.client_id
            and lower(clients.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        )
      );
  end if;
end $$;

grant select on table public.members to authenticated;

-- ── member_by_phone: exactly ONE member row per (client, phone) ─────────────
-- Siblings share a parent's mobile; without this collapse the join would
-- duplicate call rows. The parent contact_name is identical across siblings,
-- so picking one is safe for display.
create or replace view public.member_by_phone
with (security_invoker = true) as
select distinct on (client_id, phone_norm)
  client_id, phone_norm, contact_name, member_name, efc_reference, status
from public.members
where phone_norm <> ''
-- If a number has several records, show the strongest relationship:
-- current member > former member > lead.
order by client_id, phone_norm,
  case lower(status)
    when 'enrolled'    then 0
    when 'inactive'    then 1
    when 'prospective' then 2
    else 3
  end,
  imported_at desc;

-- ── phone_names: the caller "address book" ──────────────────────────────────
-- The most recent non-blank name any call from a number has ever given. Lets a
-- later hangup from that number show the name instead of "Unknown".
create or replace view public.phone_names
with (security_invoker = true) as
select distinct on (client_id, public.norm_phone(caller_phone))
  client_id,
  public.norm_phone(caller_phone) as phone_norm,
  public.clean_name(caller_name) as known_name
from public.calls
where public.clean_name(caller_name) is not null
  and public.norm_phone(caller_phone) <> ''
order by client_id, public.norm_phone(caller_phone), call_date desc, created_at desc;

-- ── calls_with_member: what the dashboard reads instead of `calls` ──────────
-- Dropped + recreated (not CREATE OR REPLACE) because the column set changes
-- as we add/reorder fields. Nothing depends on this view, so the drop is safe.
drop view if exists public.calls_with_member;
create view public.calls_with_member
with (security_invoker = true) as
select
  c.*,
  m.contact_name  as member_contact_name,
  m.member_name   as member_account_name,
  m.efc_reference as member_efc_reference,
  m.status        as member_status,
  -- One positive tag per call, straight from the matched EFC record's status.
  -- A non-match leaves all of these false — we never infer a status from a miss.
  (lower(m.status) = 'enrolled')    as is_member,
  (lower(m.status) = 'inactive')    as is_former_member,
  (lower(m.status) = 'prospective') as is_lead,
  pn.known_name   as address_book_name,
  -- single field the UI renders; null -> UI shows "Unknown"
  coalesce(nullif(m.contact_name, ''), public.clean_name(c.caller_name), pn.known_name) as display_name,
  case
    when m.client_id is not null                    then 'member'
    when public.clean_name(c.caller_name) is not null then 'this_call'
    when pn.known_name is not null                  then 'address_book'
    else null
  end as name_source
from public.calls c
left join public.member_by_phone m
  on m.client_id = c.client_id
 and m.phone_norm = public.norm_phone(c.caller_phone)
left join public.phone_names pn
  on pn.client_id = c.client_id
 and pn.phone_norm = public.norm_phone(c.caller_phone);

grant select on public.member_by_phone, public.phone_names, public.calls_with_member to authenticated;
