-- Create social sentiment cache table
CREATE TABLE IF NOT EXISTS public.social_sentiment_cache (
  symbol TEXT PRIMARY KEY,
  sentiment_data JSONB NOT NULL,
  cached_at TIMESTAMPTZ DEFAULT now(),
  ttl_minutes INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create social sentiment logs table for monitoring
CREATE TABLE IF NOT EXISTS public.social_sentiment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  symbol TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  response_time_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_social_sentiment_cache_cached_at 
  ON public.social_sentiment_cache(cached_at);

CREATE INDEX IF NOT EXISTS idx_social_sentiment_logs_created_at 
  ON public.social_sentiment_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_social_sentiment_logs_source 
  ON public.social_sentiment_logs(source, created_at);

-- Enable RLS
ALTER TABLE public.social_sentiment_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_sentiment_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view social sentiment cache"
  ON public.social_sentiment_cache
  FOR SELECT
  USING (true);

CREATE POLICY "System can manage social sentiment cache"
  ON public.social_sentiment_cache
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can view social sentiment logs"
  ON public.social_sentiment_logs
  FOR SELECT
  USING (true);

CREATE POLICY "System can manage social sentiment logs"
  ON public.social_sentiment_logs
  FOR INSERT
  WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_social_sentiment_cache_updated_at
  BEFORE UPDATE ON public.social_sentiment_cache
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments
COMMENT ON TABLE public.social_sentiment_cache IS 'Caches social sentiment data from multiple sources (StockTwits, Reddit, SwaggyStocks) to reduce API calls';
COMMENT ON TABLE public.social_sentiment_logs IS 'Tracks social sentiment API usage and success rates for monitoring';
