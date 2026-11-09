CREATE TABLE public.ai_search_access_state (
  model text PRIMARY KEY,
  message text NOT NULL,
  blocked_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.ai_search_access_state TO service_role;
ALTER TABLE public.ai_search_access_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_ai_search_access ON public.ai_search_access_state FOR ALL TO service_role USING (true) WITH CHECK (true);