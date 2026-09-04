-- Notification unread tracking
-- Run this once in the Supabase SQL editor after 0002_expenses.sql.

-- The notification feed itself is computed live from expenses/time_entries/
-- team_members at request time (no new table for the events themselves) —
-- this single per-user timestamp is all that's needed to know what's unread.
-- Defaulting to now() means existing users don't see a flood of "unread"
-- historical activity the moment this ships.
alter table public.users
  add column if not exists last_notifications_read_at timestamptz not null default now();
