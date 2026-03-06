import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Client-side backup automation hook
 * Triggers the full pipeline: market data → candles → signals → trades → exits
 */
export const useAutomationBackup = () => {
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const runFullPipeline = async () => {
      try {
        // Check when last signal was generated (use master_signals, not trading_signals)
        const { data: lastSignal } = await supabase
          .from('master_signals')
          .select('created_at')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const lastSignalTime = lastSignal ? new Date(lastSignal.created_at).getTime() : 0;
        const timeSinceLastSignal = Date.now() - lastSignalTime;
        
        // If no signal in 15 minutes, trigger full pipeline
        if (timeSinceLastSignal > 15 * 60 * 1000) {
          console.log('⚠️ Backup trigger: No signals for 15+ minutes, running full pipeline...');
          
          // Step 1: Fetch market data
          const { error: mdError } = await supabase.functions.invoke('fetch-market-data', {
            body: { trigger: 'backup' }
          });
          if (mdError) console.error('Market data fetch error:', mdError);
          
          // Step 2: Aggregate candles (wait 5s for data to settle)
          await new Promise(r => setTimeout(r, 5000));
          const { error: acError } = await supabase.functions.invoke('aggregate-candles', {
            body: { trigger: 'backup' }
          });
          if (acError) console.error('Aggregate candles error:', acError);
          
          // Step 3: Generate signals (wait 5s)
          await new Promise(r => setTimeout(r, 5000));
          const { error: gsError } = await supabase.functions.invoke('generate-confluence-signals', {
            body: { trigger: 'backup' }
          });
          if (gsError) console.error('Signal generation error:', gsError);
          
          // Step 4: Execute trades (wait 5s)
          await new Promise(r => setTimeout(r, 5000));
          const { error: etError } = await supabase.functions.invoke('execute-shadow-trades', {
            body: { trigger: 'backup' }
          });
          if (etError) console.error('Trade execution error:', etError);
          
          // Step 5: Check exits
          await new Promise(r => setTimeout(r, 3000));
          const { error: ceError } = await supabase.functions.invoke('check-trade-exits', {
            body: { trigger: 'backup' }
          });
          if (ceError) console.error('Exit check error:', ceError);
          
          console.log('✅ Full pipeline backup run complete');
        } else {
          // Even if signals are recent, still check exits and try to execute pending signals
          const { error: etError } = await supabase.functions.invoke('execute-shadow-trades', {
            body: { trigger: 'backup-periodic' }
          });
          if (etError) console.error('Periodic trade execution error:', etError);

          const { error: ceError } = await supabase.functions.invoke('check-trade-exits', {
            body: { trigger: 'backup-periodic' }
          });
          if (ceError) console.error('Periodic exit check error:', ceError);
        }
      } catch (error) {
        console.error('Backup automation error:', error);
      }
    };

    // Run every 5 minutes
    intervalRef.current = setInterval(runFullPipeline, 5 * 60 * 1000);
    
    // Initial run after 30 seconds
    setTimeout(runFullPipeline, 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const manualTrigger = async () => {
    console.log('🔄 Manual trigger: Running full trading pipeline...');
    
    try {
      // Step 1: Fetch market data
      console.log('📊 Step 1: Fetching market data...');
      const { data: md } = await supabase.functions.invoke('fetch-market-data', { body: { trigger: 'manual' } });
      console.log('Market data:', md);
      
      // Step 2: Aggregate candles
      await new Promise(r => setTimeout(r, 3000));
      console.log('🕯️ Step 2: Aggregating candles...');
      const { data: ac } = await supabase.functions.invoke('aggregate-candles', { body: { trigger: 'manual' } });
      console.log('Candles:', ac);
      
      // Step 3: Generate signals
      await new Promise(r => setTimeout(r, 3000));
      console.log('🎯 Step 3: Generating signals...');
      const { data: gs } = await supabase.functions.invoke('generate-confluence-signals', { body: { trigger: 'manual' } });
      console.log('Signals:', gs);
      
      // Step 4: Execute trades
      await new Promise(r => setTimeout(r, 3000));
      console.log('💰 Step 4: Executing trades...');
      const { data: et } = await supabase.functions.invoke('execute-shadow-trades', { body: { trigger: 'manual' } });
      console.log('Trades:', et);
      
      // Step 5: Check exits
      await new Promise(r => setTimeout(r, 2000));
      console.log('🚪 Step 5: Checking exits...');
      const { data: ce } = await supabase.functions.invoke('check-trade-exits', { body: { trigger: 'manual' } });
      console.log('Exits:', ce);
      
      console.log('✅ Full manual pipeline complete');
    } catch (error) {
      console.error('Manual trigger error:', error);
    }
  };

  return { manualTrigger };
};
