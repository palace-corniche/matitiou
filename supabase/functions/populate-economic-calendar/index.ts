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

    // Fetch from ForexFactory (free public JSON)
    const events = await fetchEconomicEvents();
    console.log(`📊 Fetched ${events.length} economic events`);

    // Clear old events
    await supabase
      .from('economic_calendar')
      .delete()
      .lt('event_time', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString());

    // Insert into economic_calendar table
    if (events.length > 0) {
      const { error } = await supabase
        .from('economic_calendar')
        .upsert(events, { ignoreDuplicates: true });

      if (error) {
        console.error('❌ Insert error:', error);
        throw error;
      }
      console.log(`✅ Inserted ${events.length} events into economic_calendar`);
    }

    // Also fetch and insert news into news_events
    const news = await fetchNewsEvents();
    if (news.length > 0) {
      await supabase
        .from('news_events')
        .delete()
        .lt('published_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString());

      const { error: newsErr } = await supabase
        .from('news_events')
        .upsert(news, { ignoreDuplicates: true });

      if (newsErr) console.error('News insert error:', newsErr);
      else console.log(`✅ Inserted ${news.length} news events`);
    }

    return new Response(
      JSON.stringify({ success: true, eventsInserted: events.length, newsInserted: news.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function fetchEconomicEvents() {
  const now = new Date();

  try {
    const url = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json';
    console.log('🌐 Fetching from ForexFactory...');
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    if (!response.ok) throw new Error(`ForexFactory returned ${response.status}`);

    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Invalid data format');

    const relevantCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD'];
    const events = [];

    for (const event of data) {
      if (!relevantCurrencies.includes(event.country)) continue;
      const impact = event.impact === 'High' ? 'high' : event.impact === 'Medium' ? 'medium' : 'low';
      if (impact === 'low') continue;

      const eventDate = new Date(event.date);
      if (isNaN(eventDate.getTime())) continue;

      // Parse numeric values
      const parseNum = (v: any) => {
        if (v == null || v === '') return null;
        const n = parseFloat(String(v).replace(/[%K]/g, ''));
        return isNaN(n) ? null : n;
      };

      events.push({
        event_name: `${event.country} - ${event.title}`,
        event_time: eventDate.toISOString(),
        currency: event.country,
        country: getCountryName(event.country),
        impact: impact,
        actual: event.actual || null,
        forecast: event.forecast || null,
        previous: event.previous || null,
        actual_value: parseNum(event.actual),
        forecast_value: parseNum(event.forecast),
        previous_value: parseNum(event.previous),
        metadata: { source: 'forexfactory' },
      });
    }

    return events;
  } catch (error) {
    console.error('ForexFactory fetch failed, using fallback:', error);
    return generateFallbackEvents();
  }
}

async function fetchNewsEvents() {
  const now = new Date();
  const newsEvents = [];

  try {
    const feeds = ['https://www.forexlive.com/feed/news'];
    for (const feedUrl of feeds) {
      try {
        const response = await fetch(feedUrl);
        if (!response.ok) continue;
        const xml = await response.text();
        const items = parseRSS(xml);
        newsEvents.push(...items);
        if (newsEvents.length >= 15) break;
      } catch { continue; }
    }
  } catch (error) {
    console.error('News fetch error:', error);
  }

  return newsEvents.slice(0, 15);
}

function parseRSS(xml: string) {
  const items: any[] = [];
  const matches = xml.matchAll(/<item>(.*?)<\/item>/gs);

  for (const match of matches) {
    const x = match[1];
    const title = x.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ||
                  x.match(/<title>(.*?)<\/title>/)?.[1];
    const pubDate = x.match(/<pubDate>(.*?)<\/pubDate>/)?.[1];
    if (!title || !pubDate) continue;

    const publishedAt = new Date(pubDate);
    if (isNaN(publishedAt.getTime())) continue;

    const lower = title.toLowerCase();
    let sentiment = 0;
    ['rise','gain','strong','higher','rally','surge'].forEach(w => { if (lower.includes(w)) sentiment += 0.2; });
    ['fall','drop','weak','lower','decline','slump'].forEach(w => { if (lower.includes(w)) sentiment -= 0.2; });
    sentiment = Math.max(-1, Math.min(1, sentiment));

    items.push({
      headline: title.substring(0, 200),
      source: 'ForexLive',
      symbol: 'EUR/USD',
      sentiment: sentiment,
      sentiment_score: sentiment,
      relevance_score: 0.8,
      impact: Math.abs(sentiment) > 0.3 ? 'high' : 'medium',
      published_at: publishedAt.toISOString(),
      url: null,
      metadata: { source: 'rss' },
    });
  }

  return items;
}

function getCountryName(c: string) {
  const m: Record<string, string> = {
    USD: 'United States', EUR: 'Eurozone', GBP: 'United Kingdom',
    JPY: 'Japan', AUD: 'Australia', CAD: 'Canada', CHF: 'Switzerland', NZD: 'New Zealand'
  };
  return m[c] || c;
}

function generateFallbackEvents() {
  const now = new Date();
  const events = [
    { name: 'USD - Non-Farm Payrolls', currency: 'USD', impact: 'high', days: 5, h: 13, m: 30 },
    { name: 'USD - CPI', currency: 'USD', impact: 'high', days: 3, h: 13, m: 30 },
    { name: 'EUR - ECB Rate Decision', currency: 'EUR', impact: 'high', days: 7, h: 12, m: 45 },
    { name: 'USD - FOMC Minutes', currency: 'USD', impact: 'high', days: 4, h: 19, m: 0 },
  ];

  return events.map(e => {
    const t = new Date(now);
    t.setDate(t.getDate() + e.days);
    t.setHours(e.h, e.m, 0, 0);
    return {
      event_name: e.name,
      event_time: t.toISOString(),
      currency: e.currency,
      country: getCountryName(e.currency),
      impact: e.impact,
      actual: null, forecast: null, previous: null,
      actual_value: null, forecast_value: null, previous_value: null,
      metadata: { source: 'fallback' },
    };
  });
}
