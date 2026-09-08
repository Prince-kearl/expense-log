-- Lets a team turn the budget feature off entirely. Defaults to on since
-- the feature already exists and should be visible out of the box.
alter table public.teams
  add column budget_feature_enabled boolean not null default true;
