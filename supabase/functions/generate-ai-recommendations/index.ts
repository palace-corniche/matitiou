import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Recommendation {
  recommendation_type: 'trade' | 'exit' | 'risk_adjust' | 'market_condition';
  priority: 'low' | 'medium' | 'high' | 'critical';
  action: string;
  reasoning: string;
  confidence_score: number;
  data_sources: any[];
  metrics?: any;
  expires_at?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🤖 Generating AI recommendations...');

    const recommendations: Recommendation[] = [];

    // 1. Analyze Master Signals
    const { data: signals } = await supabase
      .from('master_signals')
      .select('*')
      .eq('status', 'pending')
      .gte('created_at', new Date(Date.now() - 3600000).toISOString()) // Last hour
      .order('final_confidence', { ascending: false })
      .limit(5);

    if (signals && signals.length > 0) {
      const topSignal = signals[0];
      const isHighConfidence = topSignal.final_confidence >= 0.75;
      
      recommendations.push({
        recommendation_type: 'trade',
        priority: isHighConfidence ? 'high' : 'medium',
        action: `Execute ${topSignal.signal_type.toUpperCase()} trade on EUR/USD`,
        reasoning: `Master signal with ${(topSignal.final_confidence * 100).toFixed(1)}% confidence detected. Confluence score: ${topSignal.confluence_score.toFixed(1)}. Contributing modules: ${topSignal.contributing_modules.join(', ')}.`,
        confidence_score: topSignal.final_confidence,
        data_sources: ['master_signals', 'modular_signals'],
        metrics: {
          entry: topSignal.recommended_entry,
          stop_loss: topSignal.recommended_stop_loss,
          take_profit: topSignal.recommended_take_profit,
          lot_size: topSignal.recommended_lot_size,
          confluence_score: topSignal.confluence_score
        },
        expires_at: new Date(Date.now() + 1800000).toISOString() // Expires in 30 min
      });
    }

    // 2. Check S/R Proximity
    const { data: srLevels } = await supabase
      .from('support_resistance')
      .select('*')
      .eq('symbol', 'EUR/USD')
      .eq('timeframe', '15m')
      .order('detected_at', { ascending: false })
      .limit(1);

    const { data: marketDataPrice } = await supabase
      .from('market_data_feed')
      .select('price')
      .eq('symbol', 'EUR/USD')
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (srLevels && srLevels.length > 0 && marketDataPrice) {
      const currentPrice = marketDataPrice.price;
      const levels = srLevels[0].levels || [];
      
      // Find closest S/R level
      const closestLevel = levels.reduce((closest: any, level: any) => {
        const distance = Math.abs(level.price - currentPrice);
        return distance < Math.abs(closest.price - currentPrice) ? level : closest;
      }, levels[0]);

      const distancePips = Math.abs(closestLevel.price - currentPrice) * 10000;

      if (distancePips < 10) {
        recommendations.push({
          recommendation_type: 'market_condition',
          priority: 'high',
          action: `Monitor S/R level at ${closestLevel.price.toFixed(5)}`,
          reasoning: `Price is only ${distancePips.toFixed(1)} pips from ${closestLevel.type} at ${closestLevel.price.toFixed(5)}. Strength: ${closestLevel.strength.toFixed(2)}. Expect ${closestLevel.type === 'resistance' ? 'rejection or breakout' : 'bounce or breakdown'}.`,
          confidence_score: closestLevel.strength,
          data_sources: ['support_resistance', 'market_data_feed'],
          metrics: {
            sr_level: closestLevel.price,
            sr_type: closestLevel.type,
            distance_pips: distancePips,
            current_price: currentPrice
          }
        });
      }
    }

    // 3. News & Sentiment Analysis
    const { data: upcomingEvents } = await supabase
      .from('economic_events')
      .select('*')
      .gte('event_time', new Date().toISOString())
      .lte('event_time', new Date(Date.now() + 7200000).toISOString()) // Next 2 hours
      .eq('impact_level', 'high')
      .order('event_time', { ascending: true })
      .limit(3);

    if (upcomingEvents && upcomingEvents.length > 0) {
      const event = upcomingEvents[0];
      const timeToEvent = new Date(event.event_time).getTime() - Date.now();
      const minutesToEvent = Math.floor(timeToEvent / 60000);

      recommendations.push({
        recommendation_type: 'risk_adjust',
        priority: minutesToEvent < 30 ? 'critical' : 'high',
        action: `High-impact ${event.currency} event in ${minutesToEvent} minutes`,
        reasoning: `${event.event_name} scheduled for ${new Date(event.event_time).toLocaleTimeString()}. Impact level: ${event.impact_level}. Consider reducing position sizes or widening stops before event.`,
        confidence_score: event.volatility_impact,
        data_sources: ['economic_events'],
        metrics: {
          event_name: event.event_name,
          event_time: event.event_time,
          minutes_to_event: minutesToEvent,
          affected_symbols: event.symbol_impact
        }
      });
    }

    // 4. Check for Correlation Breaks
    const { data: correlations } = await supabase
      .from('correlations')
      .select('*')
      .eq('asset_a', 'EUR/USD')
      .order('calculation_date', { ascending: false })
      .limit(5);

    if (correlations && correlations.length > 0) {
      const weakCorrelation = correlations.find(c => Math.abs(c.correlation_value) < 0.3);
      if (weakCorrelation) {
        recommendations.push({
          recommendation_type: 'market_condition',
          priority: 'medium',
          action: `Weak correlation detected: EUR/USD vs ${weakCorrelation.asset_b}`,
          reasoning: `Correlation between EUR/USD and ${weakCorrelation.asset_b} is ${(weakCorrelation.correlation_value * 100).toFixed(1)}%, below normal range. This may indicate diverging fundamentals or temporary market dislocation.`,
          confidence_score: 0.6,
          data_sources: ['correlations'],
          metrics: {
            asset_pair: `${weakCorrelation.asset_a} vs ${weakCorrelation.asset_b}`,
            correlation: weakCorrelation.correlation_value,
            sample_size: weakCorrelation.sample_size
          }
        });
      }
    }

    // 5. Check Open Trades Risk
    const { data: openTrades } = await supabase
      .from('shadow_trades')
      .select('*')
      .eq('status', 'open')
      .eq('portfolio_id', '00000000-0000-0000-0000-000000000001');

    const { data: account } = await supabase
      .from('global_trading_account')
      .select('margin_level, equity, used_margin')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single();

    if (account && account.margin_level < 200) {
      recommendations.push({
        recommendation_type: 'risk_adjust',
        priority: 'critical',
        action: `Margin level critically low: ${account.margin_level.toFixed(2)}%`,
        reasoning: `Current margin level is ${account.margin_level.toFixed(2)}%, below recommended 200%. Consider closing losing positions or depositing more funds to avoid margin call.`,
        confidence_score: 0.95,
        data_sources: ['global_trading_account', 'shadow_trades'],
        metrics: {
          margin_level: account.margin_level,
          equity: account.equity,
          used_margin: account.used_margin,
          open_trades: openTrades?.length || 0
        }
      });
    }

    // Sort by priority and confidence
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    recommendations.sort((a, b) => {
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.confidence_score - a.confidence_score;
    });

    // Take top 3
    const topRecommendations = recommendations.slice(0, 3);

    // Clear expired recommendations
    await supabase
      .from('ai_recommendations')
      .update({ status: 'expired' })
      .lt('expires_at', new Date().toISOString())
      .eq('status', 'active');

    // Insert new recommendations
    if (topRecommendations.length > 0) {
      const { error: insertError } = await supabase
        .from('ai_recommendations')
        .insert(topRecommendations);

      if (insertError) {
        console.error('Failed to store recommendations:', insertError);
      } else {
        console.log(`✅ Generated ${topRecommendations.length} AI recommendations`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        recommendations: topRecommendations,
        total_analyzed: recommendations.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating recommendations:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
