-- Add unique constraint to economic_events to prevent duplicates
ALTER TABLE public.economic_events 
DROP CONSTRAINT IF EXISTS economic_events_name_time_unique;

ALTER TABLE public.economic_events 
ADD CONSTRAINT economic_events_name_time_unique 
UNIQUE (event_name, event_time);

-- Add unique constraint to news_events to prevent duplicates
ALTER TABLE public.news_events 
DROP CONSTRAINT IF EXISTS news_events_title_published_at_unique;

ALTER TABLE public.news_events 
ADD CONSTRAINT news_events_title_published_at_unique 
UNIQUE (title, published_at);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_economic_events_time ON public.economic_events(event_time DESC);
CREATE INDEX IF NOT EXISTS idx_news_events_published_at ON public.news_events(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_events_source ON public.news_events(source);