// Simple TradingView-like market data feed (mocked with random ticks)
// Provides a consistent interface for subscribing to ticks and connection status

export interface TradingViewTick {
  symbol: string;
  price: number; // mid price
  bid: number;
  ask: number;
  timestamp: number; // ms epoch
}

export type TradingViewSubscription = {
  onTick?: (tick: TradingViewTick) => void;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: unknown) => void;
};

class TradingViewFeed {
  private subscribers = new Set<TradingViewSubscription>();
  private connected = false; // mock feed marked as not live
  private lastTick: TradingViewTick | null = null;
  private timerId: number | null = null;

  constructor() {
    // Start mock generator in the browser
    if (typeof window !== 'undefined') {
      this.startMockGenerator();
    }
  }

  private startMockGenerator() {
    if (this.timerId) return;

    // Initial mock price around EUR/USD
    let price = 1.08345;
    const spread = 0.00008; // ~0.8 pip

    // Emit an initial tick immediately
    this.lastTick = {
      symbol: 'EUR/USD',
      price,
      bid: price - spread / 2,
      ask: price + spread / 2,
      timestamp: Date.now(),
    };
    this.emitTick(this.lastTick);

    // Random-walk price updates
    this.timerId = window.setInterval(() => {
      const delta = (Math.random() - 0.5) * 0.0002; // +/- 2 pips
      price = Math.max(0.5, price + delta);
      const tick: TradingViewTick = {
        symbol: 'EUR/USD',
        price,
        bid: price - spread / 2,
        ask: price + spread / 2,
        timestamp: Date.now(),
      };
      this.lastTick = tick;
      this.emitTick(tick);
    }, 1000);
  }

  subscribe(sub: TradingViewSubscription): () => void {
    this.subscribers.add(sub);

    // Immediately provide current state
    try {
      sub.onConnectionChange?.(this.connected);
      if (this.lastTick) sub.onTick?.(this.lastTick);
    } catch (err) {
      sub.onError?.(err);
    }

    return () => {
      this.subscribers.delete(sub);
    };
  }

  getLastTick(): TradingViewTick | null {
    return this.lastTick;
  }

  getConnectionStatus(): boolean {
    return this.connected;
  }

  // Optional: allow external code to update connection status if a real WS is wired later
  setConnectionStatus(connected: boolean) {
    if (this.connected !== connected) {
      this.connected = connected;
      this.emitConnection();
    }
  }

  private emitTick(tick: TradingViewTick) {
    this.subscribers.forEach((s) => s.onTick?.(tick));
  }

  private emitConnection() {
    this.subscribers.forEach((s) => s.onConnectionChange?.(this.connected));
  }
}

// Named export required by the app
export const tradingViewFeed = new TradingViewFeed();
