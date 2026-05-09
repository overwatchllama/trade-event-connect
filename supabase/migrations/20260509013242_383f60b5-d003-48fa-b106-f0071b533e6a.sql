
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove any prior schedule with the same name (idempotent)
SELECT cron.unschedule('refresh-market-data-daily')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh-market-data-daily');

SELECT cron.schedule(
  'refresh-market-data-daily',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://gsjwamfnoezhwlhkqzdn.supabase.co/functions/v1/refresh-market-data',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzandhbWZub2V6aHdsaGtxemRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5MTkwNTQsImV4cCI6MjA3MTQ5NTA1NH0.8GfmyMPtkw8RnwXkB2OxFsnzVyDmaozRp0wDTuGopPw"}'::jsonb,
    body := '{"game":"all","ingest_limit":1500,"enrich_limit":100}'::jsonb
  );
  $$
);
