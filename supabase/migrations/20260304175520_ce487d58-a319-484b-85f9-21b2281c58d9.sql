
ALTER TABLE public.module_performance ADD COLUMN IF NOT EXISTS recent_performance JSONB DEFAULT '[]';
ALTER TABLE public.module_performance ADD COLUMN IF NOT EXISTS trend TEXT DEFAULT 'stable';
ALTER TABLE public.module_performance ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
