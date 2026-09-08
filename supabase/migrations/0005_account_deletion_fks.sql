-- Lets a user's account be deleted (Google Play requires an in-app way to
-- delete an account and its data) without destroying the team's financial
-- records. created_by_name/created_by_email are already denormalized onto
-- each expense row, so nulling the FK loses no information that's actually
-- displayed — the expense still shows who created it, it just no longer
-- points at a live user row.
alter table public.expenses
  alter column created_by_user_id drop not null;

alter table public.expenses
  drop constraint if exists expenses_created_by_user_id_fkey;

alter table public.expenses
  add constraint expenses_created_by_user_id_fkey
  foreign key (created_by_user_id) references public.users(id) on delete set null;

alter table public.expenses
  drop constraint if exists expenses_updated_by_user_id_fkey;

alter table public.expenses
  add constraint expenses_updated_by_user_id_fkey
  foreign key (updated_by_user_id) references public.users(id) on delete set null;

-- Same reasoning for teams.created_by (write-only audit column, never
-- displayed) and invitations.invited_by (listPendingInvitations already
-- falls back to an empty string when the inviter's name can't be joined).
alter table public.teams
  alter column created_by drop not null;

alter table public.teams
  drop constraint if exists teams_created_by_fkey;

alter table public.teams
  add constraint teams_created_by_fkey
  foreign key (created_by) references public.users(id) on delete set null;

alter table public.invitations
  alter column invited_by drop not null;

alter table public.invitations
  drop constraint if exists invitations_invited_by_fkey;

alter table public.invitations
  add constraint invitations_invited_by_fkey
  foreign key (invited_by) references public.users(id) on delete set null;
