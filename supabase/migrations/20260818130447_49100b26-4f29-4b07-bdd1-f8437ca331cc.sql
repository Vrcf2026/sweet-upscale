CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION private.pode_cliente(_cliente_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _cliente_id IS NOT NULL AND (
    private.has_role(auth.uid(),'superadmin')
    OR EXISTS (SELECT 1 FROM public.clientes c WHERE c.id = _cliente_id AND c.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.acessos a WHERE a.user_id = auth.uid() AND a.cliente_id = _cliente_id)
    OR EXISTS (
      SELECT 1 FROM public.acessos a
      JOIN public.instalacoes i ON i.id = a.instalacao_id
      WHERE a.user_id = auth.uid() AND i.cliente_id = _cliente_id
    )
  )
$$;

CREATE OR REPLACE FUNCTION private.pode_instalacao(_instalacao_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _instalacao_id IS NOT NULL AND (
    private.has_role(auth.uid(),'superadmin')
    OR EXISTS (SELECT 1 FROM public.instalacoes i WHERE i.id = _instalacao_id AND i.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.acessos a WHERE a.user_id = auth.uid() AND a.instalacao_id = _instalacao_id)
    OR EXISTS (
      SELECT 1 FROM public.acessos a
      JOIN public.instalacoes i ON i.cliente_id = a.cliente_id
      WHERE a.user_id = auth.uid() AND i.id = _instalacao_id
    )
  )
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.pode_cliente(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.pode_instalacao(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.pode_cliente(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.pode_instalacao(uuid) TO authenticated, service_role;

-- acessos
DROP POLICY IF EXISTS "acessos geridos pelo superadmin" ON public.acessos;
CREATE POLICY "acessos geridos pelo superadmin" ON public.acessos FOR ALL TO authenticated
USING (private.has_role(auth.uid(),'superadmin')) WITH CHECK (private.has_role(auth.uid(),'superadmin'));
DROP POLICY IF EXISTS "acessos leitura" ON public.acessos;
CREATE POLICY "acessos leitura" ON public.acessos FOR SELECT TO authenticated
USING (user_id = auth.uid() OR private.has_role(auth.uid(),'superadmin'));

-- clientes
DROP POLICY IF EXISTS "clientes altera" ON public.clientes;
CREATE POLICY "clientes altera" ON public.clientes FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR private.pode_cliente(id)) WITH CHECK (user_id = auth.uid() OR private.pode_cliente(id));
DROP POLICY IF EXISTS "clientes apaga" ON public.clientes;
CREATE POLICY "clientes apaga" ON public.clientes FOR DELETE TO authenticated
USING (user_id = auth.uid() OR private.has_role(auth.uid(),'superadmin'));
DROP POLICY IF EXISTS "clientes leitura" ON public.clientes;
CREATE POLICY "clientes leitura" ON public.clientes FOR SELECT TO authenticated
USING (user_id = auth.uid() OR private.pode_cliente(id));

-- documentos
DROP POLICY IF EXISTS "documentos acesso" ON public.documentos;
CREATE POLICY "documentos acesso" ON public.documentos FOR ALL TO authenticated
USING (user_id = auth.uid() OR private.pode_instalacao(instalacao_id) OR private.pode_cliente(cliente_id))
WITH CHECK (user_id = auth.uid() OR private.pode_instalacao(instalacao_id) OR private.pode_cliente(cliente_id));

-- empresa
DROP POLICY IF EXISTS "empresa leitura equipa" ON public.empresa;
CREATE POLICY "empresa leitura equipa" ON public.empresa FOR SELECT TO authenticated
USING (user_id = auth.uid() OR private.has_role(user_id,'superadmin'));

-- equipamentos
DROP POLICY IF EXISTS "equipamentos acesso" ON public.equipamentos;
CREATE POLICY "equipamentos acesso" ON public.equipamentos FOR ALL TO authenticated
USING (user_id = auth.uid() OR private.pode_instalacao(instalacao_id))
WITH CHECK (user_id = auth.uid() OR private.pode_instalacao(instalacao_id));

-- instalacoes
DROP POLICY IF EXISTS "instalacoes altera" ON public.instalacoes;
CREATE POLICY "instalacoes altera" ON public.instalacoes FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR private.pode_instalacao(id)) WITH CHECK (user_id = auth.uid() OR private.pode_instalacao(id));
DROP POLICY IF EXISTS "instalacoes apaga" ON public.instalacoes;
CREATE POLICY "instalacoes apaga" ON public.instalacoes FOR DELETE TO authenticated
USING (user_id = auth.uid() OR private.has_role(auth.uid(),'superadmin'));
DROP POLICY IF EXISTS "instalacoes insere" ON public.instalacoes;
CREATE POLICY "instalacoes insere" ON public.instalacoes FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND (private.pode_cliente(cliente_id) OR EXISTS (SELECT 1 FROM public.clientes c WHERE c.id = cliente_id AND c.user_id = auth.uid())));
DROP POLICY IF EXISTS "instalacoes leitura" ON public.instalacoes;
CREATE POLICY "instalacoes leitura" ON public.instalacoes FOR SELECT TO authenticated
USING (user_id = auth.uid() OR private.pode_instalacao(id) OR private.pode_cliente(cliente_id));

-- intervencoes
DROP POLICY IF EXISTS "intervencoes acesso" ON public.intervencoes;
CREATE POLICY "intervencoes acesso" ON public.intervencoes FOR ALL TO authenticated
USING (user_id = auth.uid() OR private.pode_instalacao(instalacao_id))
WITH CHECK (user_id = auth.uid() OR private.pode_instalacao(instalacao_id));

-- profiles
DROP POLICY IF EXISTS "profiles superadmin select" ON public.profiles;
CREATE POLICY "profiles superadmin select" ON public.profiles FOR SELECT TO authenticated
USING (private.has_role(auth.uid(),'superadmin'));

-- user_roles
DROP POLICY IF EXISTS "roles proprias ou superadmin" ON public.user_roles;
CREATE POLICY "roles proprias ou superadmin" ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR private.has_role(auth.uid(),'superadmin'));
DROP POLICY IF EXISTS "user_roles superadmin insert" ON public.user_roles;
CREATE POLICY "user_roles superadmin insert" ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(),'superadmin') AND user_id <> auth.uid());
DROP POLICY IF EXISTS "user_roles superadmin update" ON public.user_roles;
CREATE POLICY "user_roles superadmin update" ON public.user_roles FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(),'superadmin') AND user_id <> auth.uid())
WITH CHECK (private.has_role(auth.uid(),'superadmin') AND user_id <> auth.uid());
DROP POLICY IF EXISTS "user_roles superadmin delete" ON public.user_roles;
CREATE POLICY "user_roles superadmin delete" ON public.user_roles FOR DELETE TO authenticated
USING (private.has_role(auth.uid(),'superadmin') AND user_id <> auth.uid());

-- handle_new_user passa a usar as funcoes internas
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN lower(NEW.email) = 'vrcf.loja@gmail.com' THEN 'superadmin'::public.app_role ELSE 'tecnico'::public.app_role END)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.pode_cliente(uuid);
DROP FUNCTION IF EXISTS public.pode_instalacao(uuid);
DROP FUNCTION IF EXISTS public.next_doc_number();