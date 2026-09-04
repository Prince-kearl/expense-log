-- Expenses & receipts (Supabase replaces Google Sheets/Drive entirely)
-- Run this once in the Supabase SQL editor after 0001_teams_and_invitations.sql.

create table public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  category text not null,
  subcategory text not null,
  created_at timestamptz not null default now(),
  unique (team_id, category, subcategory)
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  expense_id text not null,
  expense_date date not null,
  description text not null,
  category text not null,
  subcategory text not null default '',
  amount numeric not null check (amount > 0),
  currency text not null default 'GHC',
  vendor text not null default '',
  payment_method text not null default '',
  account text not null default '',
  notes text not null default '',
  receipts jsonb not null default '[]'::jsonb,
  created_by_user_id uuid not null references public.users(id),
  created_by_name text not null,
  created_by_email text not null,
  created_at timestamptz not null default now(),
  updated_by_user_id uuid references public.users(id),
  updated_at timestamptz not null default now(),
  is_deleted boolean not null default false,
  unique (team_id, expense_id)
);

create index expense_categories_team_id_idx on public.expense_categories (team_id);
create index expenses_team_id_idx on public.expenses (team_id) where not is_deleted;
create index expenses_created_by_idx on public.expenses (team_id, created_by_user_id) where not is_deleted;

-- Private bucket for receipt files (JPG/PNG/PDF). Objects are addressed as
-- "<team_id>/<expense_id>/<n>_<filename>" and streamed to the client through
-- the /api/receipts server route after a team-membership check — never
-- exposed as public URLs.
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

-- RLS is intentionally left disabled on these tables (and no storage
-- policies are defined) for the same reason as 0001: all access goes
-- through server functions using the service-role key, which bypasses RLS
-- and object policies alike. Do not expose the service-role key to the
-- client.
