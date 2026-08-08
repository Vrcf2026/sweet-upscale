ALTER TABLE public.instalacoes
  ADD COLUMN IF NOT EXISTS periodicidade_meses integer NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS proxima_manutencao date;