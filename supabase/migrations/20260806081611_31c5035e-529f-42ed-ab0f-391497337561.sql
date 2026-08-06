-- Perfis
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Empresa (1 por utilizador)
CREATE TABLE public.empresa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  nome text NOT NULL DEFAULT '',
  nipc text DEFAULT '',
  registo text DEFAULT '',
  data_emissao date,
  morada text DEFAULT '',
  localidade text DEFAULT '',
  contacto text DEFAULT '',
  tecnico text DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.empresa TO authenticated;
GRANT ALL ON public.empresa TO service_role;
ALTER TABLE public.empresa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "empresa own" ON public.empresa FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Clientes
CREATE TABLE public.clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome text NOT NULL,
  nif text DEFAULT '',
  contacto text DEFAULT '',
  morada text DEFAULT '',
  localidade text DEFAULT '',
  cp text DEFAULT '',
  tlm text DEFAULT '',
  tel text DEFAULT '',
  email text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes TO authenticated;
GRANT ALL ON public.clientes TO service_role;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clientes own" ON public.clientes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX clientes_user_idx ON public.clientes(user_id);

-- Instalações
CREATE TABLE public.instalacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  entidade text DEFAULT '',
  sistema_id text DEFAULT '',
  tipo_sistema text DEFAULT '',
  morada text DEFAULT '',
  localidade text DEFAULT '',
  responsavel text DEFAULT '',
  contacto_resp text DEFAULT '',
  instalado_por text DEFAULT '',
  data_instalacao date,
  num_registo text DEFAULT '',
  monitorizado_por text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.instalacoes TO authenticated;
GRANT ALL ON public.instalacoes TO service_role;
ALTER TABLE public.instalacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "instalacoes own" ON public.instalacoes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX instalacoes_cliente_idx ON public.instalacoes(cliente_id);

-- Equipamento
CREATE TABLE public.equipamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  instalacao_id uuid NOT NULL REFERENCES public.instalacoes(id) ON DELETE CASCADE,
  equip text NOT NULL DEFAULT '',
  marca text DEFAULT '',
  serie text DEFAULT '',
  local text DEFAULT '',
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipamentos TO authenticated;
GRANT ALL ON public.equipamentos TO service_role;
ALTER TABLE public.equipamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "equipamentos own" ON public.equipamentos FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX equipamentos_inst_idx ON public.equipamentos(instalacao_id);

-- Intervenções (livro de registos)
CREATE TABLE public.intervencoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  instalacao_id uuid NOT NULL REFERENCES public.instalacoes(id) ON DELETE CASCADE,
  data date NOT NULL DEFAULT current_date,
  hora text DEFAULT '',
  tipo text DEFAULT '',
  modo text DEFAULT '',
  causa text DEFAULT '',
  trabalhos text DEFAULT '',
  num_relatorio text DEFAULT '',
  tecnico text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.intervencoes TO authenticated;
GRANT ALL ON public.intervencoes TO service_role;
ALTER TABLE public.intervencoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "intervencoes own" ON public.intervencoes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX intervencoes_inst_idx ON public.intervencoes(instalacao_id);

-- Documentos gerados
CREATE TABLE public.documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  instalacao_id uuid REFERENCES public.instalacoes(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  numero text DEFAULT '',
  resumo text DEFAULT '',
  estado text NOT NULL DEFAULT 'rascunho',
  html text NOT NULL DEFAULT '',
  dados jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documentos TO authenticated;
GRANT ALL ON public.documentos TO service_role;
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "documentos own" ON public.documentos FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX documentos_inst_idx ON public.documentos(instalacao_id);

-- Numeração automática por ano
CREATE TABLE public.doc_counters (
  user_id uuid NOT NULL,
  ano integer NOT NULL,
  seq integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, ano)
);
GRANT SELECT, INSERT, UPDATE ON public.doc_counters TO authenticated;
GRANT ALL ON public.doc_counters TO service_role;
ALTER TABLE public.doc_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "counters own" ON public.doc_counters FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.next_doc_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_ano integer := extract(year from now())::int;
  v_seq integer;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Nao autenticado';
  END IF;
  INSERT INTO public.doc_counters (user_id, ano, seq)
  VALUES (v_user, v_ano, 1)
  ON CONFLICT (user_id, ano) DO UPDATE SET seq = public.doc_counters.seq + 1
  RETURNING seq INTO v_seq;
  RETURN v_ano::text || '/' || lpad(v_seq::text, 4, '0');
END;
$$;