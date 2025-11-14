/**
 * Real-time Trade Update Service
 * Handles automatic balance and trade updates via Supabase realtime subscriptions
 */

import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { toast } from 'sonner';

type TradeUpdateCallback = (payload: any) => void;
type BalanceUpdateCallback = (balance: number, equity: number) => void;

class TradeRealtimeService {
  private tradeChannel: RealtimeChannel | null = null;
  private accountChannel: RealtimeChannel | null = null;
  private tradeCallbacks: Set<TradeUpdateCallback> = new Set();
  private balanceCallbacks: Set<BalanceUpdateCallback> = new Set();

  /**
   * Subscribe to real-time trade updates
   */
  subscribeTrades(callback: TradeUpdateCallback) {
    this.tradeCallbacks.add(callback);

    if (!this.tradeChannel) {
      console.log('🔔 Setting up real-time trade subscription...');
      
      this.tradeChannel = supabase
        .channel('shadow_trades_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'shadow_trades'
          },
          (payload) => {
            console.log('📊 Trade update received:', payload);
            
            // Notify all subscribers
            this.tradeCallbacks.forEach(cb => cb(payload));

            // Show toast notification for trade closures
            if (payload.eventType === 'UPDATE' && 
                payload.new.status === 'closed' && 
                payload.old.status === 'open') {
              const pnl = payload.new.pnl || 0;
              const symbol = payload.new.symbol;
              const pips = payload.new.profit_pips || 0;
              
              if (pnl > 0) {
                toast.success(
                  `Trade Closed: ${symbol}`,
                  { 
                    description: `+$${pnl.toFixed(2)} (${pips.toFixed(1)} pips)`,
                    duration: 5000 
                  }
                );
              } else {
                toast.error(
                  `Trade Closed: ${symbol}`,
                  { 
                    description: `-$${Math.abs(pnl).toFixed(2)} (${pips.toFixed(1)} pips)`,
                    duration: 5000 
                  }
                );
              }
            }
          }
        )
        .subscribe((status) => {
          console.log('🔔 Trade subscription status:', status);
        });
    }

    return () => this.unsubscribeTrade(callback);
  }

  /**
   * Subscribe to real-time account balance updates
   */
  subscribeBalance(callback: BalanceUpdateCallback) {
    this.balanceCallbacks.add(callback);

    if (!this.accountChannel) {
      console.log('💰 Setting up real-time balance subscription...');
      
      this.accountChannel = supabase
        .channel('account_balance_changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'global_trading_account',
            filter: 'id=eq.00000000-0000-0000-0000-000000000001'
          },
          (payload) => {
            console.log('💰 Balance update received:', payload);
            
            const balance = payload.new.balance;
            const equity = payload.new.equity;
            
            // Notify all subscribers
            this.balanceCallbacks.forEach(cb => cb(balance, equity));
          }
        )
        .subscribe((status) => {
          console.log('💰 Balance subscription status:', status);
        });
    }

    return () => this.unsubscribeBalance(callback);
  }

  /**
   * Unsubscribe from trade updates
   */
  private unsubscribeTrade(callback: TradeUpdateCallback) {
    this.tradeCallbacks.delete(callback);

    if (this.tradeCallbacks.size === 0 && this.tradeChannel) {
      console.log('🔕 Removing trade subscription');
      this.tradeChannel.unsubscribe();
      this.tradeChannel = null;
    }
  }

  /**
   * Unsubscribe from balance updates
   */
  private unsubscribeBalance(callback: BalanceUpdateCallback) {
    this.balanceCallbacks.delete(callback);

    if (this.balanceCallbacks.size === 0 && this.accountChannel) {
      console.log('🔕 Removing balance subscription');
      this.accountChannel.unsubscribe();
      this.accountChannel = null;
    }
  }

  /**
   * Clean up all subscriptions
   */
  cleanup() {
    if (this.tradeChannel) {
      this.tradeChannel.unsubscribe();
      this.tradeChannel = null;
    }
    if (this.accountChannel) {
      this.accountChannel.unsubscribe();
      this.accountChannel = null;
    }
    this.tradeCallbacks.clear();
    this.balanceCallbacks.clear();
  }
}

// Export singleton instance
export const tradeRealtimeService = new TradeRealtimeService();
