-- Remembers which team a user last had active, so multi-team users land back
-- where they left off on their next login instead of an arbitrary team.
alter table public.users
  add column last_active_team_id uuid references public.teams(id) on delete set null;
