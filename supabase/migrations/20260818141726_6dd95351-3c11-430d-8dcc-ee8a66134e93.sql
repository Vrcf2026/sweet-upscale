ALTER TABLE public.instalacoes
  ADD COLUMN IF NOT EXISTS autoridade text DEFAULT ''::text,
  ADD COLUMN IF NOT EXISTS autoridade_subunidade text DEFAULT ''::text;