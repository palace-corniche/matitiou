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

    console.log('📅 Populating economic calendar...');

    // Generate realistic economic events for the next 7 days
    const events = generateEconomicEvents();

    // **FIX 3: Clear ALL old events first (no date filtering to avoid conflicts)**
    const { error: deleteAllEventsError } = await supabase
      .from('economic_events')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteAllEventsError) {
      console.error('Failed to clear events:', deleteAllEventsError);
    } else {
      console.log('🗑️ Cleared all old economic events');
    }

    // Insert new events
    const { data: insertedEvents, error: insertError } = await supabase
      .from('economic_events')
      .insert(events);

    if (insertError) {
      console.error('❌ Failed to insert events:', insertError);
      throw insertError;
    }

    console.log(`✅ Inserted ${events.length} economic events`);

    // Clear ALL old news events
    const { error: deleteAllNewsError } = await supabase
      .from('news_events')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    if (deleteAllNewsError) {
      console.error('Failed to clear news:', deleteAllNewsError);
    } else {
      console.log('🗑️ Cleared all old news events');
    }
    
    const newsEvents = generateNewsEvents();
    
    const { error: newsError } = await supabase
      .from('news_events')
      .insert(newsEvents);

    if (newsError) {
      console.error('❌ Failed to insert news:', newsError);
    } else {
      console.log(`✅ Inserted ${newsEvents.length} news events`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        eventsInserted: events.length,
        newsInserted: newsEvents.length 
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

function generateEconomicEvents() {
  const now = new Date();
  const events = [];
  
  const eventTemplates = [
    { name: 'EUR - ECB Interest Rate Decision', currency: 'EUR', impact: 'high', affected: ['EUR/USD', 'EUR/GBP'] },
    { name: 'USD - NFP (Non-Farm Payrolls)', currency: 'USD', impact: 'high', affected: ['EUR/USD', 'GBP/USD', 'USD/JPY'] },
    { name: 'USD - CPI (Consumer Price Index)', currency: 'USD', impact: 'high', affected: ['EUR/USD', 'GBP/USD', 'USD/JPY'] },
    { name: 'EUR - GDP Growth Rate', currency: 'EUR', impact: 'medium', affected: ['EUR/USD', 'EUR/GBP'] },
    { name: 'USD - FOMC Minutes', currency: 'USD', impact: 'medium', affected: ['EUR/USD', 'GBP/USD'] },
    { name: 'EUR - PMI Manufacturing', currency: 'EUR', impact: 'medium', affected: ['EUR/USD'] },
    { name: 'USD - Retail Sales', currency: 'USD', impact: 'medium', affected: ['EUR/USD', 'USD/JPY'] },
    { name: 'EUR - Unemployment Rate', currency: 'EUR', impact: 'low', affected: ['EUR/USD'] },
  ];

  // Generate 15 events over next 7 days
  for (let i = 0; i < 15; i++) {
    const template = eventTemplates[Math.floor(Math.random() * eventTemplates.length)];
    const eventTime = new Date(now);
    eventTime.setHours(now.getHours() + (i * 12) + Math.floor(Math.random() * 8));
    
    events.push({
      event_name: template.name,
      event_time: eventTime.toISOString(),
      currency: template.currency,
      country: template.currency === 'EUR' ? 'Eurozone' : 'United States',
      impact_level: template.impact,
      symbol_impact: template.affected,
      forecast_value: generateValue(template.name),
      previous_value: generateValue(template.name),
      actual_value: null,
      volatility_impact: template.impact === 'high' ? 0.8 : template.impact === 'medium' ? 0.5 : 0.2,
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    });
  }

  return events;
}

function generateValue(eventName: string): string {
  if (eventName.includes('Interest Rate')) return `${(Math.random() * 2 + 3).toFixed(2)}%`;
  if (eventName.includes('NFP')) return `${Math.floor(Math.random() * 100 + 150)}K`;
  if (eventName.includes('CPI')) return `${(Math.random() * 2 + 2).toFixed(1)}%`;
  if (eventName.includes('GDP')) return `${(Math.random() * 2 + 1).toFixed(1)}%`;
  if (eventName.includes('PMI')) return `${(Math.random() * 10 + 45).toFixed(1)}`;
  if (eventName.includes('Unemployment')) return `${(Math.random() * 2 + 3).toFixed(1)}%`;
  if (eventName.includes('Retail Sales')) return `${(Math.random() * 2).toFixed(1)}%`;
  return 'TBD';
}

function generateNewsEvents() {
  const now = new Date();
  const newsTemplates = [
    { title: 'ECB Signals Potential Rate Hike', sentiment: 0.3, impact: 0.7, category: 'central_bank' },
    { title: 'Strong US Employment Data Boosts Dollar', sentiment: 0.6, impact: 0.8, category: 'economic_data' },
    { title: 'Eurozone Inflation Concerns Mount', sentiment: -0.4, impact: 0.6, category: 'economic_data' },
    { title: 'Fed Minutes Reveal Cautious Outlook', sentiment: -0.2, impact: 0.5, category: 'central_bank' },
    { title: 'EUR/USD Technical Breakout Imminent', sentiment: 0.5, impact: 0.4, category: 'technical' },
    { title: 'Dollar Index Retreats on Weak Data', sentiment: -0.5, impact: 0.6, category: 'market_update' },
    { title: 'European Markets Rally on Trade Hopes', sentiment: 0.7, impact: 0.5, category: 'market_update' },
  ];

  return newsTemplates.map((template, index) => {
    const publishedAt = new Date(now);
    publishedAt.setHours(now.getHours() - (index * 4));

    return {
      title: template.title,
      content: `Market analysis and details about ${template.title.toLowerCase()}.`,
      source: 'Economic News Wire',
      symbol: 'EUR/USD',
      category: template.category,
      sentiment_score: template.sentiment,
      impact_score: template.impact,
      relevance_score: 0.8,
      published_at: publishedAt.toISOString(),
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    };
  });
}
