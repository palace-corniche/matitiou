import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { fetchStockTwits } from './scrapers/stocktwits.ts';
import { fetchRedditDirect, fetchRedditViaApify } from './scrapers/reddit.ts';
import { fetchSwaggyStocks } from './scrapers/swaggystocks.ts';
import { analyzeSentiment, aggregateMultiSource } from './sentiment-analyzer.ts';
import { RotationManager } from './rotation-manager.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SentimentRequest {
  symbol: string;
  timeframe?: string;
}

interface SentimentResponse {
  sentiment_score: number;
  confidence: number;
  message_volume: number;
  sources_used: string[];
  timestamp: string;
  cached: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { symbol, timeframe = '1h' }: SentimentRequest = await req.json();
    
    console.log(`🔍 Fetching social sentiment for ${symbol}, timeframe: ${timeframe}`);

    // Check cache first (5-15 min TTL)
    const { data: cached } = await supabase
      .from('social_sentiment_cache')
      .select('*')
      .eq('symbol', symbol)
      .single();

    if (cached && cached.cached_at) {
      const cacheAge = Date.now() - new Date(cached.cached_at).getTime();
      const ttl = (cached.ttl_minutes || 10) * 60 * 1000;
      
      if (cacheAge < ttl) {
        console.log(`✅ Cache hit for ${symbol} (age: ${Math.round(cacheAge / 1000)}s)`);
        return new Response(
          JSON.stringify({ ...cached.sentiment_data, cached: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Initialize rotation manager
    const rotator = new RotationManager();
    const results: any[] = [];

    // Fetch from multiple sources with rotation
    console.log('📊 Fetching from multiple sources...');

    try {
      if (await rotator.canUseSource('stocktwits')) {
        const stocktwitsData = await fetchStockTwits(symbol);
        if (stocktwitsData) {
          results.push(stocktwitsData);
          await rotator.recordUsage('stocktwits', true);
          console.log('✅ StockTwits data fetched');
        }
      }
    } catch (error) {
      console.error('StockTwits error:', error);
      await rotator.recordUsage('stocktwits', false);
    }

    try {
      if (await rotator.canUseSource('reddit_direct')) {
        const redditData = await fetchRedditDirect(symbol);
        if (redditData) {
          results.push(redditData);
          await rotator.recordUsage('reddit_direct', true);
          console.log('✅ Reddit direct data fetched');
        }
      }
    } catch (error) {
      console.error('Reddit direct error:', error);
      await rotator.recordUsage('reddit_direct', false);
    }

    try {
      if (await rotator.canUseSource('swaggystocks')) {
        const swaggyData = await fetchSwaggyStocks();
        if (swaggyData) {
          results.push(swaggyData);
          await rotator.recordUsage('swaggystocks', true);
          console.log('✅ SwaggyStocks data fetched');
        }
      }
    } catch (error) {
      console.error('SwaggyStocks error:', error);
      await rotator.recordUsage('swaggystocks', false);
    }

    // Aggregate results
    if (results.length === 0) {
      console.warn('⚠️ No sources available, returning neutral sentiment');
      const fallback: SentimentResponse = {
        sentiment_score: 0,
        confidence: 0,
        message_volume: 0,
        sources_used: [],
        timestamp: new Date().toISOString(),
        cached: false
      };
      return new Response(JSON.stringify(fallback), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const aggregated = aggregateMultiSource(results);
    const response: SentimentResponse = {
      sentiment_score: aggregated.sentiment_score,
      confidence: aggregated.confidence,
      message_volume: aggregated.message_volume,
      sources_used: aggregated.sources_used,
      timestamp: new Date().toISOString(),
      cached: false
    };

    // Update cache
    await supabase
      .from('social_sentiment_cache')
      .upsert({
        symbol,
        sentiment_data: response,
        cached_at: new Date().toISOString(),
        ttl_minutes: 10
      });

    console.log(`✅ Sentiment aggregated from ${results.length} sources`);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error in fetch-social-sentiment:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
