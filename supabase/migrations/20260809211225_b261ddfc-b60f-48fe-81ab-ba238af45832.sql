
-- 1. Roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('superadmin','tecnico');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

CREATE POLICY "roles proprias ou superadmin" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'superadmin'));

-- 2. Acessos por cliente / instalacao
CREATE TABLE IF NOT EXISTS public.acessos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE CASCADE,
  instalacao_id uuid REFERENCES public.instalacoes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (cliente_id IS NOT NULL OR instalacao_id IS NOT NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS acessos_cliente_uq ON public.acessos (user_id, cliente_id) WHERE cliente_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS acessos_inst_uq ON public.acessos (user_id, instalacao_id) WHERE instalacao_id IS NOT NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.acessos TO authenticated;
GRANT ALL ON public.acessos TO service_role;
ALTER TABLE public.acessos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "acessos leitura" ON public.acessos
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'superadmin'));
CREATE POLICY "acessos geridos pelo superadmin" ON public.acessos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'superadmin'))
  WITH CHECK (public.has_role(auth.uid(),'superadmin'));

-- 3. Funcoes de permissao
CREATE OR REPLACE FUNCTION public.pode_cliente(_cliente_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _cliente_id IS NOT NULL AND (
    public.has_role(auth.uid(),'superadmin')
    OR EXISTS (SELECT 1 FROM public.clientes c WHERE c.id = _cliente_id AND c.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.acessos a WHERE a.user_id = auth.uid() AND a.cliente_id = _cliente_id)
    OR EXISTS (
      SELECT 1 FROM public.acessos a
      JOIN public.instalacoes i ON i.id = a.instalacao_id
      WHERE a.user_id = auth.uid() AND i.cliente_id = _cliente_id
    )
  )
$$;
REVOKE EXECUTE ON FUNCTION public.pode_cliente(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pode_cliente(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.pode_instalacao(_instalacao_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _instalacao_id IS NOT NULL AND (
    public.has_role(auth.uid(),'superadmin')
    OR EXISTS (SELECT 1 FROM public.instalacoes i WHERE i.id = _instalacao_id AND i.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.acessos a WHERE a.user_id = auth.uid() AND a.instalacao_id = _instalacao_id)
    OR EXISTS (
      SELECT 1 FROM public.acessos a
      JOIN public.instalacoes i ON i.cliente_id = a.cliente_id
      WHERE a.user_id = auth.uid() AND i.id = _instalacao_id
    )
  )
$$;
REVOKE EXECUTE ON FUNCTION public.pode_instalacao(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pode_instalacao(uuid) TO authenticated, service_role;

-- 4. Politicas por tabela
DROP POLICY IF EXISTS "clientes own" ON public.clientes;
CREATE POLICY "clientes leitura" ON public.clientes FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.pode_cliente(id));
CREATE POLICY "clientes insere" ON public.clientes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "clientes altera" ON public.clientes FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.pode_cliente(id))
  WITH CHECK (user_id = auth.uid() OR public.pode_cliente(id));
CREATE POLICY "clientes apaga" ON public.clientes FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'superadmin'));

DROP POLICY IF EXISTS "instalacoes own" ON public.instalacoes;
CREATE POLICY "instalacoes leitura" ON public.instalacoes FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.pode_instalacao(id) OR public.pode_cliente(cliente_id));
CREATE POLICY "instalacoes insere" ON public.instalacoes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND (public.pode_cliente(cliente_id) OR EXISTS (SELECT 1 FROM public.clientes c WHERE c.id = cliente_id AND c.user_id = auth.uid())));
CREATE POLICY "instalacoes altera" ON public.instalacoes FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.pode_instalacao(id))
  WITH CHECK (user_id = auth.uid() OR public.pode_instalacao(id));
CREATE POLICY "instalacoes apaga" ON public.instalacoes FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'superadmin'));

DROP POLICY IF EXISTS "equipamentos own" ON public.equipamentos;
CREATE POLICY "equipamentos acesso" ON public.equipamentos FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.pode_instalacao(instalacao_id))
  WITH CHECK (user_id = auth.uid() OR public.pode_instalacao(instalacao_id));

DROP POLICY IF EXISTS "intervencoes own" ON public.intervencoes;
CREATE POLICY "intervencoes acesso" ON public.intervencoes FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.pode_instalacao(instalacao_id))
  WITH CHECK (user_id = auth.uid() OR public.pode_instalacao(instalacao_id));

DROP POLICY IF EXISTS "documentos own" ON public.documentos;
CREATE POLICY "documentos acesso" ON public.documentos FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.pode_instalacao(instalacao_id) OR public.pode_cliente(cliente_id))
  WITH CHECK (user_id = auth.uid() OR public.pode_instalacao(instalacao_id) OR public.pode_cliente(cliente_id));

DROP POLICY IF EXISTS "empresa own" ON public.empresa;
CREATE POLICY "empresa leitura equipa" ON public.empresa FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(user_id,'superadmin'));
CREATE POLICY "empresa escrita" ON public.empresa FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 5. Superadmin automatico para o email indicado
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, nome)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN lower(NEW.email) = 'vrcf.loja@gmail.com' THEN 'superadmin'::public.app_role ELSE 'tecnico'::public.app_role END)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'superadmin'::public.app_role FROM auth.users WHERE lower(email) = 'vrcf.loja@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'tecnico'::public.app_role FROM auth.users WHERE lower(email) <> 'vrcf.loja@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Perfis visiveis ao superadmin
CREATE POLICY "profiles superadmin select" ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'superadmin'));
