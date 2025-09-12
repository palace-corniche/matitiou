// TradingView FOREX.com EUR/USD feed (mocked minimal implementation)
// Provides a simple, typed interface for subscribing to ticks and connection status

export interface TradingViewTick {
  symbol: string;       // e.g. 'EUR/USD'
  price: number;        // mid price
  bid: number;          // bid price
  ask: number;          // ask price
  spread: number;       // ask - bid
  timestamp: number;    // epoch ms
}

export interface TradingViewSubscription {
  onTick?: (tick: TradingViewTick) => void;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: Error) => void;
}

class TradingViewFeedImpl {
  private subscribers = new Set<TradingViewSubscription>();
  private lastTick: TradingViewTick | null = null;
  private connected = false;
  private timer: number | null = null;
  private readonly displaySymbol = 'EUR/USD';
  private base = 1.08500; // starting price

  constructor() {
    // Auto-start a lightweight mock stream so the UI has live data
    this.start();
  }

  // Public API expected by the app
  subscribe = (handlers: TradingViewSubscription): (() => void) => {
    this.subscribers.add(handlers);

    // Immediately inform about current state
    try {
      handlers.onConnectionChange?.(this.connected);
      if (this.lastTick) handlers.onTick?.(this.lastTick);
    } catch (err) {
      // No-op
    }

    return () => {
      this.subscribers.delete(handlers);
    };
  };

  getLastTick = (): TradingViewTick | null => this.lastTick;
  getConnectionStatus = (): boolean => this.connected;

  // Internal: start a simple price generator to simulate live ticks
  private start() {
    // Mark as connected after a short delay to mimic handshake
    window.setTimeout(() => {
      this.connected = true;
      this.emitConnection();
    }, 300);

    // Generate a new tick every 900ms
    this.timer = window.setInterval(() => {
      const drift = (Math.random() - 0.5) * 0.00030; // ~3 pips peak-to-peak
      this.base = Math.max(1.00000, this.base + drift);

      // Tight realistic spread ~1.2 pips
      const spread = 0.00012 + Math.random() * 0.00010;
      const mid = this.base;
      const bid = Number((mid - spread / 2).toFixed(5));
      const ask = Number((mid + spread / 2).toFixed(5));
      const price = Number(((bid + ask) / 2).toFixed(5));

      const tick: TradingViewTick = {
        symbol: this.displaySymbol,
        price,
        bid,
        ask,
        spread: Number(spread.toFixed(5)),
        timestamp: Date.now(),
      };

      this.lastTick = tick;
      this.emitTick(tick);
    }, 900) as unknown as number;
  }

  private emitTick(tick: TradingViewTick) {
    this.subscribers.forEach((s) => {
      try { s.onTick?.(tick); } catch { /* ignore */ }
    });
  }

  private emitConnection() {
    this.subscribers.forEach((s) => {
      try { s.onConnectionChange?.(this.connected); } catch { /* ignore */ }
    });
  }
}

// Named export expected by the rest of the app
export const tradingViewFeed = new TradingViewFeedImpl();
