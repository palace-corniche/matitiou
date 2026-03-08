import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 Starting news sentiment fetch...');

    const ALPHA_VANTAGE_API_KEY = Deno.env.get('ALPHA_VANTAGE_API_KEY');
    if (!ALPHA_VANTAGE_API_KEY) {
      throw new Error('ALPHA_VANTAGE_API_KEY not configured');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const newsUrl = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&topics=forex&apikey=${ALPHA_VANTAGE_API_KEY}&limit=50`;

    let newsResponse;
    try {
      newsResponse = await fetch(newsUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!newsResponse.ok) throw new Error(`Alpha Vantage error: ${newsResponse.status}`);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        return new Response(
          JSON.stringify({ success: false, error: 'Timeout' }),
          { status: 408, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw error;
    }

    const newsData = await newsResponse.json();

    if (newsData.Note) {
      return new Response(
        JSON.stringify({ success: false, error: 'Rate limited', message: newsData.Note }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!newsData.feed || newsData.feed.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 Processing ${newsData.feed.length} articles...`);

    const currencies = ['EUR', 'USD', 'GBP', 'JPY'];
    const newsRecords = [];

    for (const article of newsData.feed) {
      const tickerSentiment = article.ticker_sentiment || [];
      const relevant = tickerSentiment.filter((t: any) =>
        currencies.some(c => t.ticker?.includes(c))
      );
      if (relevant.length === 0) continue;

      const sentimentScore = parseFloat(article.overall_sentiment_score || '0');
      const symbol = determineSymbol(relevant);

      // Write to news_events table (correct schema)
      newsRecords.push({
        symbol,
        headline: (article.title || '').substring(0, 500),
        source: article.source || 'Alpha Vantage',
        published_at: new Date(article.time_published).toISOString(),
        sentiment: sentimentScore,
        sentiment_score: sentimentScore,
        relevance_score: parseFloat(article.relevance_score || '0.5'),
        impact: Math.abs(sentimentScore) > 0.3 ? 'high' : 'medium',
        url: article.url || null,
        metadata: {
          topics: article.topics || [],
          ticker_sentiment: relevant,
        },
      });
    }

    if (newsRecords.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert into news_events (the table that actually exists)
    const { error } = await supabase
      .from('news_events')
      .insert(newsRecords);

    if (error) {
      console.error('❌ Error inserting news:', error);
      throw error;
    }

    // Cleanup old news
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    await supabase
      .from('news_events')
      .delete()
      .lt('published_at', sevenDaysAgo.toISOString());

    console.log(`✅ Processed ${newsRecords.length} news articles into news_events`);

    return new Response(
      JSON.stringify({ success: true, processed: newsRecords.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function determineSymbol(tickers: any[]): string {
  const currencies: Record<string, number> = {};
  for (const t of tickers) {
    const matches = t.ticker?.match(/([A-Z]{3})/g) || [];
    for (const c of matches) {
      currencies[c] = (currencies[c] || 0) + parseFloat(t.relevance_score || '0');
    }
  }
  const sorted = Object.entries(currencies).sort((a, b) => b[1] - a[1]).map(([c]) => c);
  if (sorted.includes('EUR') && sorted.includes('USD')) return 'EUR/USD';
  if (sorted.includes('GBP') && sorted.includes('USD')) return 'GBP/USD';
  if (sorted.includes('USD') && sorted.includes('JPY')) return 'USD/JPY';
  return 'EUR/USD';
}
