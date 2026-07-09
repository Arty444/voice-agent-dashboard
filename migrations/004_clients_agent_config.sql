-- 004: Per-client config columns — makes onboarding a new client a DATA change,
-- not a code deploy.
--
--   * clients.agent_id     — the Retell agent bound to this client. The webhook
--                            looks this up (service key) instead of its old
--                            hardcoded AGENT_CLIENT_MAP dict.
--   * clients.efc_enabled  — gates the dashboard's EFC features (Cancel button
--                            etc.) instead of a hardcoded McHugh client_id.
--
-- Onboarding a client after this = insert their clients row with agent_id set
-- (+ efc_enabled if they use EFC). No Railway/Vercel deploys.

alter table public.clients
  add column if not exists agent_id text,
  add column if not exists efc_enabled boolean not null default false;

-- One client per agent; NULLs allowed (clients being set up).
create unique index if not exists clients_agent_id_uidx
  on public.clients (agent_id)
  where agent_id is not null;

-- Backfill the two live clients (same IDs the webhook's dict holds today).
update public.clients
   set agent_id = 'agent_27efcd8d33e3d52313d74a74a2', efc_enabled = true
 where id = '6d047c8a-bedf-4feb-9223-803c57a8ce1a';   -- McHugh Jiu Jitsu

update public.clients
   set agent_id = 'agent_cee32b0da5944f68d555f62f36'
 where id = 'd094ef3f-0b1d-4054-b47e-16596855a51b';   -- Team Bundy

-- ── VERIFY ────────────────────────────────────────────────────────────────────
-- select id, business_name, email, agent_id, efc_enabled from public.clients;
-- → both rows show their agent_id; McHugh has efc_enabled = true.
