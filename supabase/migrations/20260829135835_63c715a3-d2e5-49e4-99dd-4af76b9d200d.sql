CREATE TABLE public.backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origem text NOT NULL DEFAULT 'manual',
  ficheiro text NOT NULL DEFAULT '',
  drive_file_id text,
  drive_link text,
  tamanho_bytes bigint NOT NULL DEFAULT 0,
  estado text NOT NULL DEFAULT 'ok',
  erro text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.backups TO authenticated;
GRANT ALL ON public.backups TO service_role;
ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "backups leitura superadmin" ON public.backups
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'superadmin'::app_role));

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.schedule(
  'backup-diario-drive',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--f3e7c791-cb96-4e02-9e0b-7200065e6508.lovable.app/api/public/backup-diario',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer c7f8301a8be295cf56d622efcf34fca571f1c96c2afcc383"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);