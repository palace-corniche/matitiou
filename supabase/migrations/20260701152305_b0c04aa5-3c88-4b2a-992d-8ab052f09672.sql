-- Dedupe: keep newest row per module_name, then add unique constraint
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY module_name ORDER BY updated_at DESC NULLS LAST, id DESC) AS rn
  FROM public.module_health
)
DELETE FROM public.module_health
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

ALTER TABLE public.module_health
  ADD CONSTRAINT module_health_module_name_key UNIQUE (module_name);