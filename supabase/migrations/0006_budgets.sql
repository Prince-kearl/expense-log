-- Monthly budgets, per category or overall (category = null means "all
-- categories combined"). One row per team/category/month, so setting a new
-- amount for a month you've already budgeted overwrites it rather than
-- creating a second row.
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  category text,
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  amount numeric not null check (amount >= 0),
  currency text not null default 'GHS',
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Postgres treats NULLs as distinct for uniqueness purposes, so a plain
-- UNIQUE(team_id, category, month) wouldn't stop two "overall" budgets
-- (category null) for the same month — these partial indexes cover both
-- cases explicitly.
create unique index budgets_category_month_unique
  on public.budgets (team_id, category, month)
  where category is not null;

create unique index budgets_overall_month_unique
  on public.budgets (team_id, month)
  where category is null;

create index budgets_team_id_month_idx on public.budgets (team_id, month);

-- RLS intentionally left disabled — same trust model as every other table
-- in this app: all access goes through server functions using the
-- service-role key.
