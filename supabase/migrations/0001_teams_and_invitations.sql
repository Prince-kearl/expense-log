-- Team-based authentication & invitations
-- Run this once in the Supabase SQL editor (or via `supabase db push`) for
-- a fresh project. Requires Supabase Auth (email/password) to be enabled.

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

-- Keep public.users in sync whenever a new auth user is created.
create function public.handle_new_auth_user() returns trigger as $$
begin
  insert into public.users (id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email), new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  standard_hourly_rate numeric,
  currency text not null default 'GHS',
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now()
);

create type team_role as enum ('owner', 'member');
create type membership_status as enum ('active', 'removed');

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role team_role not null default 'member',
  status membership_status not null default 'active',
  joined_at timestamptz not null default now(),
  unique (team_id, user_id)
);

create type invitation_status as enum ('pending', 'accepted', 'declined', 'expired', 'revoked');

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  email text not null,
  invited_by uuid not null references public.users(id),
  token text not null unique,
  status invitation_status not null default 'pending',
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  entry_date date not null,
  hours numeric not null check (hours > 0),
  note text not null,
  created_at timestamptz not null default now()
);

create index team_members_team_id_idx on public.team_members (team_id);
create index team_members_user_id_idx on public.team_members (user_id);
create index invitations_team_id_idx on public.invitations (team_id);
create index invitations_token_idx on public.invitations (token);
create index time_entries_team_id_idx on public.time_entries (team_id);
create index time_entries_user_id_idx on public.time_entries (user_id);

-- RLS is intentionally left disabled: all access goes through server
-- functions using the service-role key, matching the trust model already
-- used for the Google Sheets service account in this app. Do not expose
-- the service-role key to the client.
