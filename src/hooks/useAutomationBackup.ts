import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Client-side backup automation hook
 * Triggers edge functions if cron jobs fail or system goes idle
 */
export const useAutomationBackup = () => {
  const intervalRef = useRef<NodeJS.Timeout>();
  const lastSignalRef = useRef<number>(Date.now());

  useEffect(() => {
    const checkAndTriggerBackup = async () => {
      try {
        // Check when last signal was generated
        const { data: lastSignal } = await supabase
          .from('trading_signals')
          .select('created_at')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const lastSignalTime = lastSignal ? new Date(lastSignal.created_at).getTime() : 0;
        const timeSinceLastSignal = Date.now() - lastSignalTime;
        
        // If no signal in 30 minutes, trigger backup
        if (timeSinceLastSignal > 30 * 60 * 1000) {
          console.log('⚠️ Backup trigger: No signals for 30+ minutes, invoking functions...');
          
          // Trigger market data fetch
          await supabase.functions.invoke('fetch-market-data', {
            body: { trigger: 'backup' }
          });
          
          // Wait 30 seconds then trigger signal generation
          setTimeout(async () => {
            await supabase.functions.invoke('generate-confluence-signals', {
              body: { trigger: 'backup' }
            });
          }, 30000);
          
          lastSignalRef.current = Date.now();
        }
      } catch (error) {
        console.error('Backup automation error:', error);
      }
    };

    // Check every 10 minutes
    intervalRef.current = setInterval(checkAndTriggerBackup, 10 * 60 * 1000);
    
    // Initial check after 1 minute
    setTimeout(checkAndTriggerBackup, 60000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const manualTrigger = async () => {
    console.log('🔄 Manual trigger: Invoking all trading functions...');
    
    try {
      // Fetch fresh market data
      const { data: marketData } = await supabase.functions.invoke('fetch-market-data', {
        body: { trigger: 'manual' }
      });
      console.log('Market data fetch result:', marketData);
      
      // Generate signals after 30 second delay
      setTimeout(async () => {
        const { data: signalData } = await supabase.functions.invoke('generate-confluence-signals', {
          body: { trigger: 'manual' }
        });
        console.log('Signal generation result:', signalData);
        
        // Execute trades after another 30 second delay
        setTimeout(async () => {
          const { data: tradeData } = await supabase.functions.invoke('execute-shadow-trades', {
            body: { trigger: 'manual' }
          });
          console.log('Trade execution result:', tradeData);
        }, 30000);
      }, 30000);
      
    } catch (error) {
      console.error('Manual trigger error:', error);
    }
  };

  return { manualTrigger };
};