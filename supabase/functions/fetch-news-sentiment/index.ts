import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

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

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch news from Alpha Vantage News Sentiment API
    // Topics: forex (for currency news)
    const newsUrl = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&topics=forex&apikey=${ALPHA_VANTAGE_API_KEY}&limit=50`;
    
    console.log('📰 Fetching news from Alpha Vantage...');
    const newsResponse = await fetch(newsUrl);
    
    if (!newsResponse.ok) {
      throw new Error(`Alpha Vantage API error: ${newsResponse.status}`);
    }

    const newsData = await newsResponse.json();
    
    if (newsData.Note) {
      console.warn('⚠️ API rate limit reached:', newsData.Note);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'API rate limit reached',
          message: newsData.Note 
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!newsData.feed || newsData.feed.length === 0) {
      console.log('ℹ️ No news articles found');
      return new Response(
        JSON.stringify({ success: true, processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 Processing ${newsData.feed.length} articles...`);

    // Process and insert news sentiment
    const newsRecords = [];
    const currencies = ['EUR', 'USD', 'GBP', 'JPY'];

    for (const article of newsData.feed) {
      // Extract relevant currency sentiment
      const tickerSentiment = article.ticker_sentiment || [];
      const relevantTickers = tickerSentiment.filter((t: any) => 
        currencies.some(c => t.ticker?.includes(c))
      );

      if (relevantTickers.length === 0) continue;

      // Calculate overall sentiment for the article
      const sentimentScore = parseFloat(article.overall_sentiment_score || 0);
      let sentimentLabel = 'Neutral';
      if (sentimentScore > 0.15) sentimentLabel = 'Bullish';
      else if (sentimentScore < -0.15) sentimentLabel = 'Bearish';

      // Determine which symbol this affects (e.g., EUR/USD)
      const symbol = determineSymbol(relevantTickers);

      const record = {
        symbol,
        headline: article.title?.substring(0, 500) || '',
        summary: article.summary?.substring(0, 1000) || null,
        source: article.source || 'Unknown',
        published_at: new Date(article.time_published).toISOString(),
        sentiment_score: sentimentScore,
        sentiment_label: sentimentLabel,
        relevance_score: parseFloat(article.relevance_score || 0.5),
        ticker_sentiment: relevantTickers,
        topics: article.topics || [],
      };

      newsRecords.push(record);
    }

    if (newsRecords.length === 0) {
      console.log('ℹ️ No relevant forex news found');
      return new Response(
        JSON.stringify({ success: true, processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert news records (upsert to avoid duplicates)
    const { data, error } = await supabaseClient
      .from('news_sentiment')
      .upsert(newsRecords, {
        onConflict: 'headline,published_at',
        ignoreDuplicates: true
      });

    if (error) {
      console.error('❌ Error inserting news sentiment:', error);
      throw error;
    }

    // Clean up old news (keep only last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    await supabaseClient
      .from('news_sentiment')
      .delete()
      .lt('published_at', sevenDaysAgo.toISOString());

    console.log(`✅ Successfully processed ${newsRecords.length} news articles`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: newsRecords.length,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in fetch-news-sentiment:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to determine which forex pair is most relevant
function determineSymbol(tickers: any[]): string {
  const currencies: { [key: string]: number } = {};
  
  for (const ticker of tickers) {
    const matches = ticker.ticker?.match(/([A-Z]{3})/g) || [];
    for (const currency of matches) {
      currencies[currency] = (currencies[currency] || 0) + parseFloat(ticker.relevance_score || 0);
    }
  }

  // Sort by relevance
  const sortedCurrencies = Object.entries(currencies)
    .sort((a, b) => b[1] - a[1])
    .map(([curr]) => curr);

  // Default to EUR/USD if we have EUR or USD, otherwise use top 2
  if (sortedCurrencies.includes('EUR') && sortedCurrencies.includes('USD')) {
    return 'EUR/USD';
  } else if (sortedCurrencies.includes('GBP') && sortedCurrencies.includes('USD')) {
    return 'GBP/USD';
  } else if (sortedCurrencies.includes('USD') && sortedCurrencies.includes('JPY')) {
    return 'USD/JPY';
  } else if (sortedCurrencies.length >= 2) {
    return `${sortedCurrencies[0]}/${sortedCurrencies[1]}`;
  }

  return 'EUR/USD'; // Default fallback
}
