CREATE TABLE public.auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  entidade text NOT NULL,
  entidade_id uuid,
  accao text NOT NULL,
  descricao text NOT NULL DEFAULT '',
  detalhe jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.auditoria TO authenticated;
GRANT ALL ON public.auditoria TO service_role;

ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auditoria insere" ON public.auditoria
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "auditoria leitura" ON public.auditoria
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'superadmin'::app_role));

CREATE INDEX auditoria_created_idx ON public.auditoria (created_at DESC);

ALTER TABLE public.documentos ADD COLUMN IF NOT EXISTS hash text;
ALTER TABLE public.documentos ADD COLUMN IF NOT EXISTS ficheiro_path text;

CREATE OR REPLACE FUNCTION public.documentos_bloqueio()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.estado = 'entregue' THEN
      RAISE EXCEPTION 'Documento entregue ao cliente nao pode ser apagado';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.estado IN ('assinado','entregue') THEN
    IF NEW.html IS DISTINCT FROM OLD.html
       OR NEW.dados IS DISTINCT FROM OLD.dados
       OR NEW.tipo IS DISTINCT FROM OLD.tipo
       OR NEW.numero IS DISTINCT FROM OLD.numero
       OR NEW.cliente_id IS DISTINCT FROM OLD.cliente_id
       OR NEW.instalacao_id IS DISTINCT FROM OLD.instalacao_id THEN
      RAISE EXCEPTION 'Documento assinado nao pode ser alterado';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS documentos_bloqueio_trg ON public.documentos;
CREATE TRIGGER documentos_bloqueio_trg
  BEFORE UPDATE OR DELETE ON public.documentos
  FOR EACH ROW EXECUTE FUNCTION public.documentos_bloqueio();