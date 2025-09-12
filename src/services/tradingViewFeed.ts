// ============= TRADINGVIEW WEBSOCKET FEED =============
// Real-time EUR/USD price feed using TradingView's WebSocket API
// WARNING: This is an unofficial integration and may violate TradingView's ToS

export interface TradingViewTick {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  timestamp: number;
  volume?: number;
}

export interface TradingViewSubscription {
  onTick: (tick: TradingViewTick) => void;
  onConnectionChange: (connected: boolean) => void;
  onError: (error: Error) => void;
}

class TradingViewFeedService {
  private ws: WebSocket | null = null;
  private callbacks: TradingViewSubscription[] = [];
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000;
  private lastPrice = 0;
  private lastTick: TradingViewTick | null = null;

  constructor() {
    this.connect();
  }

  private connect() {
    try {
      // TradingView WebSocket endpoint (unofficial)
      this.ws = new WebSocket('wss://data.tradingview.com/socket.io/websocket');
      
      this.ws.onopen = () => {
        console.log('📡 TradingView WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.notifyConnectionChange(true);
        
        // Send initial subscription message for EUR/USD
        this.subscribeToSymbol('EURUSD');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = event.data;
          
          // Handle TradingView's protocol messages
          if (data.startsWith('40')) {
            // Initial connection acknowledgment
            return;
          }
          
          if (data.startsWith('42')) {
            // Parse JSON data
            const jsonStr = data.substring(2);
            const parsed = JSON.parse(jsonStr);
            
            if (parsed[0] === 'quote_completed' && parsed[1]) {
              const quote = parsed[1];
              
              if (quote.n === 'EURUSD') {
                const price = quote.v?.lp || quote.v?.close_price || this.lastPrice;
                
                if (price && price !== this.lastPrice) {
                  this.lastPrice = price;
                  
                  // Generate realistic bid/ask spread (typically 1-2 pips for EUR/USD)
                  const spread = 0.00015; // 1.5 pips
                  const bid = price - (spread / 2);
                  const ask = price + (spread / 2);
                  
                  const tick: TradingViewTick = {
                    symbol: 'EUR/USD',
                    price,
                    bid,
                    ask,
                    timestamp: Date.now(),
                    volume: quote.v?.volume
                  };
                  
                  this.lastTick = tick;
                  this.notifyTick(tick);
                }
              }
            }
          }
        } catch (error) {
          console.warn('⚠️ Failed to parse TradingView message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('📡 TradingView WebSocket disconnected');
        this.isConnected = false;
        this.notifyConnectionChange(false);
        this.handleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('❌ TradingView WebSocket error:', error);
        this.notifyError(new Error('TradingView connection error'));
      };

    } catch (error) {
      console.error('❌ Failed to connect to TradingView:', error);
      this.handleReconnect();
    }
  }

  private subscribeToSymbol(symbol: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        // Send TradingView subscription message
        const subscribeMsg = `42["quote_add_symbols",["${symbol}"]]`;
        this.ws.send(subscribeMsg);
        console.log(`📊 Subscribed to ${symbol} on TradingView`);
      } catch (error) {
        console.error('❌ Failed to subscribe to symbol:', error);
      }
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);
  }

  private notifyTick(tick: TradingViewTick) {
    this.callbacks.forEach(callback => {
      try {
        callback.onTick(tick);
      } catch (error) {
        console.error('❌ Error in tick callback:', error);
      }
    });
  }

  private notifyConnectionChange(connected: boolean) {
    this.callbacks.forEach(callback => {
      try {
        callback.onConnectionChange(connected);
      } catch (error) {
        console.error('❌ Error in connection callback:', error);
      }
    });
  }

  private notifyError(error: Error) {
    this.callbacks.forEach(callback => {
      try {
        callback.onError(error);
      } catch (error) {
        console.error('❌ Error in error callback:', error);
      }
    });
  }

  // Public methods
  subscribe(callback: TradingViewSubscription) {
    this.callbacks.push(callback);
    
    // Send last tick immediately if available
    if (this.lastTick) {
      callback.onTick(this.lastTick);
    }
    
    // Send current connection status
    callback.onConnectionChange(this.isConnected);
    
    // Return unsubscribe function
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  getLastTick(): TradingViewTick | null {
    return this.lastTick;
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.callbacks = [];
    this.isConnected = false;
  }

  // Generate mock tick for testing when TradingView is unavailable
  generateMockTick(): TradingViewTick {
    const basePrice = 1.0850; // Realistic EUR/USD price
    const volatility = 0.0005; // 5 pips volatility
    const randomChange = (Math.random() - 0.5) * volatility;
    const price = basePrice + randomChange;
    
    const spread = 0.00015; // 1.5 pips
    const bid = price - (spread / 2);
    const ask = price + (spread / 2);
    
    return {
      symbol: 'EUR/USD',
      price,
      bid,
      ask,
      timestamp: Date.now(),
      volume: Math.floor(Math.random() * 1000) + 100
    };
  }
}

// Singleton instance
export const tradingViewFeed = new TradingViewFeedService();