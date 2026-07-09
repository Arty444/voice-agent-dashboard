-- Adds the 'answered' status to member_reply_drafts.
-- 'answered' = the conversation was handled directly in EFC (staff replied there),
-- so the bot cleared the draft — distinct from 'dismissed' (director chose to drop
-- it) so reports can attribute staff-handled threads correctly.
-- Run once in the Supabase SQL editor.

alter table public.member_reply_drafts
  drop constraint if exists member_reply_drafts_status_chk;

alter table public.member_reply_drafts
  add constraint member_reply_drafts_status_chk
  check (status in ('pending','approved','sent','dismissed','answered'));
