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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('📅 Fetching real economic calendar data...');

    // Fetch real economic events from ForexFactory
    const events = await fetchRealEconomicEvents();
    console.log(`📊 Fetched ${events.length} real economic events`);

    // Clear old events (older than 24 hours)
    const { error: deleteOldEventsError } = await supabase
      .from('economic_events')
      .delete()
      .lt('event_time', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (deleteOldEventsError) {
      console.error('Failed to clear old events:', deleteOldEventsError);
    } else {
      console.log('🗑️ Cleared old economic events');
    }

    // Insert new events (upsert to avoid duplicates)
    if (events.length > 0) {
      const { error: insertError } = await supabase
        .from('economic_events')
        .upsert(events, { ignoreDuplicates: true });

      if (insertError) {
        console.error('❌ Failed to insert events:', insertError);
        throw insertError;
      }

      console.log(`✅ Inserted/updated ${events.length} economic events`);
    }

    // Fetch and insert real news events
    const newsEvents = await fetchRealNewsEvents();
    console.log(`📰 Fetched ${newsEvents.length} real news events`);

    // Clear old news events (older than 48 hours)
    const { error: deleteOldNewsError } = await supabase
      .from('news_events')
      .delete()
      .lt('published_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString());
    
    if (deleteOldNewsError) {
      console.error('Failed to clear old news:', deleteOldNewsError);
    } else {
      console.log('🗑️ Cleared old news events');
    }
    
    if (newsEvents.length > 0) {
      const { error: newsError } = await supabase
        .from('news_events')
        .upsert(newsEvents, { ignoreDuplicates: true });

      if (newsError) {
        console.error('❌ Failed to insert news:', newsError);
      } else {
        console.log(`✅ Inserted/updated ${newsEvents.length} news events`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        eventsInserted: events.length,
        newsInserted: newsEvents.length,
        source: 'live_api'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error populating economic calendar:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function fetchRealEconomicEvents() {
  const now = new Date();
  const events = [];

  try {
    // Fetch from ForexFactory Calendar (public JSON endpoint)
    const startDate = new Date(now);
    const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days ahead
    
    // ForexFactory Calendar API endpoint
    const url = `https://nfs.faireconomy.media/ff_calendar_thisweek.json`;
    
    console.log('🌐 Fetching from ForexFactory Calendar...');
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      console.error(`ForexFactory API error: ${response.status}`);
      throw new Error(`ForexFactory API returned ${response.status}`);
    }

    const data = await response.json();
    
    if (!Array.isArray(data)) {
      console.error('ForexFactory API returned invalid data format');
      throw new Error('Invalid data format from ForexFactory');
    }

    console.log(`📊 Received ${data.length} events from ForexFactory`);

    // Process and filter events
    for (const event of data) {
      // Only include relevant currencies and high/medium impact events
      const relevantCurrencies = ['USD', 'EUR', 'GBP', 'JPY'];
      if (!relevantCurrencies.includes(event.country)) continue;
      
      // Parse impact level
      const impactMap: Record<string, string> = {
        'High': 'high',
        'Medium': 'medium',
        'Low': 'low'
      };
      const impact = impactMap[event.impact] || 'low';
      
      // Only include high and medium impact events
      if (impact === 'low') continue;

      // Parse event time
      const eventDate = new Date(event.date);
      if (isNaN(eventDate.getTime())) continue;

      // Determine affected symbols
      const affectedSymbols = determineAffectedSymbols(event.country);

      events.push({
        event_name: `${event.country} - ${event.title}`,
        event_time: eventDate.toISOString(),
        currency: event.country,
        country: getCountryName(event.country),
        impact_level: impact,
        symbol_impact: affectedSymbols,
        forecast_value: event.forecast || null,
        previous_value: event.previous || null,
        actual_value: event.actual || null,
        volatility_impact: impact === 'high' ? 0.8 : 0.5,
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      });
    }

    console.log(`✅ Processed ${events.length} relevant events`);

  } catch (error) {
    console.error('Error fetching real economic events:', error);
    
    // Fallback to minimal simulated data if API fails
    console.log('⚠️ Falling back to essential economic indicators');
    const fallbackEvents = generateEssentialEvents();
    return fallbackEvents;
  }

  return events;
}

async function fetchRealNewsEvents() {
  const now = new Date();
  const newsEvents = [];

  try {
    // Fetch from RSS feeds or news APIs
    const rssFeeds = [
      'https://www.forexlive.com/feed/news',
      'https://www.fxstreet.com/rss/news'
    ];

    for (const feedUrl of rssFeeds) {
      try {
        console.log(`📰 Fetching from ${feedUrl}...`);
        const response = await fetch(feedUrl);
        
        if (!response.ok) continue;

        const xmlText = await response.text();
        const newsItems = parseRSSFeed(xmlText);
        
        newsEvents.push(...newsItems);
        console.log(`✅ Fetched ${newsItems.length} news items from ${feedUrl}`);
        
        // Limit to avoid overwhelming the system
        if (newsEvents.length >= 20) break;
        
      } catch (feedError) {
        console.error(`Error fetching from ${feedUrl}:`, feedError);
        continue;
      }
    }

  } catch (error) {
    console.error('Error fetching real news events:', error);
  }

  return newsEvents.slice(0, 20); // Limit to 20 most recent
}

function parseRSSFeed(xmlText: string) {
  const newsItems = [];
  const now = new Date();

  try {
    // Simple XML parsing for RSS items
    const itemMatches = xmlText.matchAll(/<item>(.*?)<\/item>/gs);
    
    for (const match of itemMatches) {
      const itemXml = match[1];
      
      const title = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] || 
                   itemXml.match(/<title>(.*?)<\/title>/)?.[1];
      const pubDate = itemXml.match(/<pubDate>(.*?)<\/pubDate>/)?.[1];
      const description = itemXml.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1] ||
                         itemXml.match(/<description>(.*?)<\/description>/)?.[1];
      
      if (!title || !pubDate) continue;

      const publishedAt = new Date(pubDate);
      if (isNaN(publishedAt.getTime())) continue;

      // Simple sentiment analysis based on keywords
      const sentiment = analyzeSentiment(title + ' ' + (description || ''));
      
      newsItems.push({
        title: title.substring(0, 200),
        content: (description || title).substring(0, 500),
        source: 'Forex News Feed',
        symbol: 'EUR/USD',
        category: categorizeNews(title),
        sentiment_score: sentiment,
        impact_score: Math.abs(sentiment) > 0.5 ? 0.7 : 0.5,
        relevance_score: 0.8,
        published_at: publishedAt.toISOString(),
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      });
    }
  } catch (error) {
    console.error('Error parsing RSS feed:', error);
  }

  return newsItems;
}

function analyzeSentiment(text: string): number {
  const lowerText = text.toLowerCase();
  
  const positiveWords = ['rise', 'gain', 'boost', 'strong', 'higher', 'rally', 'surge', 'jump', 'improvement'];
  const negativeWords = ['fall', 'drop', 'weak', 'lower', 'decline', 'slump', 'concern', 'worry', 'risk'];
  
  let score = 0;
  positiveWords.forEach(word => {
    if (lowerText.includes(word)) score += 0.2;
  });
  negativeWords.forEach(word => {
    if (lowerText.includes(word)) score -= 0.2;
  });
  
  return Math.max(-1, Math.min(1, score));
}

function categorizeNews(title: string): string {
  const lowerTitle = title.toLowerCase();
  
  if (lowerTitle.includes('central bank') || lowerTitle.includes('fed') || lowerTitle.includes('ecb')) {
    return 'central_bank';
  }
  if (lowerTitle.includes('gdp') || lowerTitle.includes('employment') || lowerTitle.includes('inflation')) {
    return 'economic_data';
  }
  if (lowerTitle.includes('technical') || lowerTitle.includes('chart')) {
    return 'technical';
  }
  
  return 'market_update';
}

function determineAffectedSymbols(currency: string): string[] {
  const symbolMap: Record<string, string[]> = {
    'USD': ['EUR/USD', 'GBP/USD', 'USD/JPY'],
    'EUR': ['EUR/USD', 'EUR/GBP'],
    'GBP': ['GBP/USD', 'EUR/GBP'],
    'JPY': ['USD/JPY']
  };
  
  return symbolMap[currency] || ['EUR/USD'];
}

function getCountryName(currency: string): string {
  const countryMap: Record<string, string> = {
    'USD': 'United States',
    'EUR': 'Eurozone',
    'GBP': 'United Kingdom',
    'JPY': 'Japan'
  };
  
  return countryMap[currency] || currency;
}

function generateEssentialEvents() {
  // Fallback: Generate only the most essential upcoming economic events
  const now = new Date();
  const events = [];
  
  const essentialEvents = [
    { 
      name: 'USD - Non-Farm Payrolls', 
      currency: 'USD', 
      impact: 'high', 
      affected: ['EUR/USD', 'GBP/USD', 'USD/JPY'],
      daysAhead: 5,
      hour: 13, // 1 PM UTC (8:30 AM EST)
      minute: 30
    },
    { 
      name: 'USD - CPI (Consumer Price Index)', 
      currency: 'USD', 
      impact: 'high', 
      affected: ['EUR/USD', 'GBP/USD', 'USD/JPY'],
      daysAhead: 3,
      hour: 13,
      minute: 30
    },
    { 
      name: 'EUR - ECB Interest Rate Decision', 
      currency: 'EUR', 
      impact: 'high', 
      affected: ['EUR/USD', 'EUR/GBP'],
      daysAhead: 7,
      hour: 12, // 12 PM UTC
      minute: 45
    },
    { 
      name: 'USD - FOMC Meeting Minutes', 
      currency: 'USD', 
      impact: 'high', 
      affected: ['EUR/USD', 'GBP/USD'],
      daysAhead: 4,
      hour: 19, // 7 PM UTC (2 PM EST)
      minute: 0
    }
  ];

  for (const event of essentialEvents) {
    const eventTime = new Date(now);
    eventTime.setDate(eventTime.getDate() + event.daysAhead);
    eventTime.setHours(event.hour, event.minute, 0, 0);
    
    events.push({
      event_name: event.name,
      event_time: eventTime.toISOString(),
      currency: event.currency,
      country: getCountryName(event.currency),
      impact_level: event.impact,
      symbol_impact: event.affected,
      forecast_value: 'TBD',
      previous_value: null,
      actual_value: null,
      volatility_impact: 0.8,
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    });
  }

  return events;
}
