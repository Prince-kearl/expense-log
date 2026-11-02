CREATE TABLE public.profiles (id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE);
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.users (
 id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
 name text NOT NULL, email text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 last_notifications_read_at timestamptz NOT NULL DEFAULT now(), last_active_team_id uuid
);
GRANT ALL ON public.users TO service_role;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.handle_new_auth_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 INSERT INTO public.profiles(id) VALUES(new.id);
 INSERT INTO public.users(id,name,email) VALUES(new.id,coalesce(new.raw_user_meta_data->>'name',new.email),new.email);
 RETURN new;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
CREATE TABLE public.teams (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, standard_hourly_rate numeric,
 currency text NOT NULL DEFAULT 'GHS', created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(), budget_feature_enabled boolean NOT NULL DEFAULT true
);
GRANT ALL ON public.teams TO service_role;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ADD CONSTRAINT users_last_active_team_id_fkey FOREIGN KEY(last_active_team_id) REFERENCES public.teams(id) ON DELETE SET NULL;
CREATE TYPE public.team_role AS ENUM ('owner','member');
CREATE TYPE public.membership_status AS ENUM ('active','removed');
CREATE TABLE public.team_members (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE, role public.team_role NOT NULL DEFAULT 'member',
 status public.membership_status NOT NULL DEFAULT 'active', joined_at timestamptz NOT NULL DEFAULT now(), UNIQUE(team_id,user_id)
);
GRANT ALL ON public.team_members TO service_role;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
CREATE TYPE public.invitation_status AS ENUM ('pending','accepted','declined','expired','revoked');
CREATE TABLE public.invitations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
 email text NOT NULL, invited_by uuid REFERENCES public.users(id) ON DELETE SET NULL, token text NOT NULL UNIQUE,
 status public.invitation_status NOT NULL DEFAULT 'pending', expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), accepted_at timestamptz
);
GRANT ALL ON public.invitations TO service_role;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.time_entries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE, entry_date date NOT NULL,
 hours numeric NOT NULL CHECK(hours>0), note text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.time_entries TO service_role;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.expense_categories (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
 category text NOT NULL, subcategory text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(team_id,category,subcategory)
);
GRANT ALL ON public.expense_categories TO service_role;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.expenses (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
 expense_id text NOT NULL, expense_date date NOT NULL, description text NOT NULL, category text NOT NULL,
 subcategory text NOT NULL DEFAULT '', amount numeric NOT NULL CHECK(amount>0), currency text NOT NULL DEFAULT 'GHC',
 vendor text NOT NULL DEFAULT '', payment_method text NOT NULL DEFAULT '', account text NOT NULL DEFAULT '', notes text NOT NULL DEFAULT '',
 receipts jsonb NOT NULL DEFAULT '[]'::jsonb, created_by_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
 created_by_name text NOT NULL, created_by_email text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 updated_by_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL, updated_at timestamptz NOT NULL DEFAULT now(),
 is_deleted boolean NOT NULL DEFAULT false, UNIQUE(team_id,expense_id)
);
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.budgets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
 category text, month text NOT NULL CHECK(month ~ '^\d{4}-\d{2}$'), amount numeric NOT NULL CHECK(amount>=0),
 currency text NOT NULL DEFAULT 'GHS', created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.budgets TO service_role;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX budgets_category_month_unique ON public.budgets(team_id,category,month) WHERE category IS NOT NULL;
CREATE UNIQUE INDEX budgets_overall_month_unique ON public.budgets(team_id,month) WHERE category IS NULL;
CREATE INDEX budgets_team_id_month_idx ON public.budgets(team_id,month);
CREATE INDEX team_members_team_id_idx ON public.team_members(team_id);
CREATE INDEX team_members_user_id_idx ON public.team_members(user_id);
CREATE INDEX invitations_team_id_idx ON public.invitations(team_id);
CREATE INDEX time_entries_team_id_idx ON public.time_entries(team_id);
CREATE INDEX time_entries_user_id_idx ON public.time_entries(user_id);
CREATE INDEX expense_categories_team_id_idx ON public.expense_categories(team_id);
CREATE INDEX expenses_team_id_idx ON public.expenses(team_id) WHERE NOT is_deleted;
CREATE INDEX expenses_created_by_idx ON public.expenses(team_id,created_by_user_id) WHERE NOT is_deleted;