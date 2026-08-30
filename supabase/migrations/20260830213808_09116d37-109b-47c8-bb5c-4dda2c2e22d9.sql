CREATE TABLE public.brasoes (
  autoridade text PRIMARY KEY,
  imagem text NOT NULL,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.brasoes TO authenticated;
GRANT ALL ON public.brasoes TO service_role;

ALTER TABLE public.brasoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brasoes leitura" ON public.brasoes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "brasoes escrita superadmin" ON public.brasoes
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'superadmin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'superadmin'::public.app_role));