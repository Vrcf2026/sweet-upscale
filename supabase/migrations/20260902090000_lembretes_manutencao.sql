-- Controlo de quando foi enviado o último lembrete de manutenção por instalação,
-- para não reenviar todos os dias enquanto a manutenção continuar a vencer.
ALTER TABLE public.instalacoes ADD COLUMN IF NOT EXISTS lembrete_enviado_em timestamptz;

-- Lembrete diário (08:00) de manutenções a vencer/em atraso, por email.
-- Reaproveita o mesmo segredo já usado pelo backup diário (BACKUP_CRON_SECRET).
SELECT cron.schedule(
  'manutencoes-diario-lembrete',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--f3e7c791-cb96-4e02-9e0b-7200065e6508.lovable.app/api/public/manutencoes-diario',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer c7f8301a8be295cf56d622efcf34fca571f1c96c2afcc383"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
