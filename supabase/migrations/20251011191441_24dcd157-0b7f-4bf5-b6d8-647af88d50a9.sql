-- Create news_sentiment table
CREATE TABLE IF NOT EXISTS public.news_sentiment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL DEFAULT 'EUR/USD',
  headline TEXT NOT NULL,
  summary TEXT,
  source TEXT NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE NOT NULL,
  sentiment_score NUMERIC NOT NULL, -- -1.0 (bearish) to 1.0 (bullish)
  sentiment_label TEXT NOT NULL, -- 'Bearish', 'Neutral', 'Bullish'
  relevance_score NUMERIC DEFAULT 0.5, -- 0.0 to 1.0
  ticker_sentiment JSONB, -- Raw sentiment data from API
  topics JSONB, -- Array of topics/tags
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_news_sentiment_symbol ON public.news_sentiment(symbol);
CREATE INDEX IF NOT EXISTS idx_news_sentiment_published_at ON public.news_sentiment(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_sentiment_created_at ON public.news_sentiment(created_at DESC);

-- Enable RLS
ALTER TABLE public.news_sentiment ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view news sentiment"
  ON public.news_sentiment
  FOR SELECT
  USING (true);

CREATE POLICY "System can manage news sentiment"
  ON public.news_sentiment
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_news_sentiment_updated_at
  BEFORE UPDATE ON public.news_sentiment
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Schedule hourly news sentiment updates
SELECT cron.schedule(
  'news-sentiment-update',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT net.http_post(
    url := 'https://gmpmpbuzlybajzrapdrr.supabase.co/functions/v1/fetch-news-sentiment',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcG1wYnV6bHliYWp6cmFwZHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5OTM3MDAsImV4cCI6MjA3MDU2OTcwMH0.9cYpKsuHhrO4NFfVjpvCniUTRwRZRvhvsqXE22nM8a8"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- Add comment
COMMENT ON TABLE public.news_sentiment IS 'Stores real-time financial news sentiment data from Alpha Vantage News Sentiment API';