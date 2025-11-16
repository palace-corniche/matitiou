-- Absolute final table - news sentiment

CREATE TABLE IF NOT EXISTS public.news_sentiment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  headline TEXT NOT NULL,
  source TEXT,
  sentiment_score DECIMAL(5,4),
  relevance_score DECIMAL(5,4),
  symbols TEXT[],
  published_at TIMESTAMPTZ,
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  impact_level TEXT DEFAULT 'medium'
);

CREATE INDEX IF NOT EXISTS idx_news_sentiment_published ON public.news_sentiment(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_sentiment_symbols ON public.news_sentiment USING GIN(symbols);

-- Enable RLS
ALTER TABLE public.news_sentiment ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Allow all access to news_sentiment" ON public.news_sentiment FOR ALL USING (true);