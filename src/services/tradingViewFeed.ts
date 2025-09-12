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
  private lastTick: TradingViewTick | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private sessionId: string | null = null;

  constructor() {
    this.connect();
  }

  private connect() {
    try {
      // TradingView uses Engine.IO v3 protocol
      this.ws = new WebSocket('wss://data.tradingview.com/socket.io/?EIO=3&transport=websocket');
      
      this.ws.onopen = () => {
        console.log('📡 TradingView WebSocket connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = event.data;
          
          // Engine.IO v3 protocol handling
          if (data === '40') {
            // Socket.IO connection established
            console.log('📡 Socket.IO connected');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.notifyConnectionChange(true);
            this.startHeartbeat();
            this.subscribeToSymbol('FX_IDC:EURUSD');
            return;
          }
          
          if (data === '2') {
            // Ping from server
            this.ws?.send('3'); // Respond with pong
            return;
          }
          
          if (data.startsWith('42')) {
            // Socket.IO event message
            const jsonStr = data.substring(2);
            const parsed = JSON.parse(jsonStr);
            
            if (parsed[0] === 'qsd' && parsed[1]) {
              // Quote data message
              const quote = parsed[1];
              
              if (quote.n === 'FX_IDC:EURUSD' && quote.v) {
                const price = quote.v.lp; // Last price
                const bid = quote.v.bid;
                const ask = quote.v.ask;
                
                if (price && bid && ask) {
                  const tick: TradingViewTick = {
                    symbol: 'EUR/USD',
                    price,
                    bid,
                    ask,
                    timestamp: Date.now(),
                    volume: quote.v.volume
                  };
                  
                  this.lastTick = tick;
                  this.notifyTick(tick);
                  console.log('📊 TradingView tick:', { price, bid, ask });
                }
              }
            } else if (parsed[0] === 'quote_update' && parsed[1]) {
              // Quote update message
              const update = parsed[1];
              
              if (update.n === 'FX_IDC:EURUSD' && update.v) {
                const price = update.v.lp;
                const bid = update.v.bid;
                const ask = update.v.ask;
                
                if (price && bid && ask) {
                  const tick: TradingViewTick = {
                    symbol: 'EUR/USD',
                    price,
                    bid,
                    ask,
                    timestamp: Date.now(),
                    volume: update.v.volume
                  };
                  
                  this.lastTick = tick;
                  this.notifyTick(tick);
                  console.log('📊 TradingView update:', { price, bid, ask });
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
        this.stopHeartbeat();
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

  private startHeartbeat() {
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send('2'); // Send ping
      }
    }, 25000); // Every 25 seconds
  }

  private stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private subscribeToSymbol(symbol: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        // Create session and subscribe to quotes
        const createSession = `42["create_session","qs_${Date.now()}"]`;
        const subscribeQuotes = `42["quote_add_symbols","qs_${Date.now()}",["${symbol}"]]`;
        
        this.ws.send(createSession);
        setTimeout(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(subscribeQuotes);
            console.log(`📊 Subscribed to ${symbol} on TradingView`);
          }
        }, 100);
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
    this.stopHeartbeat();
    this.callbacks = [];
    this.isConnected = false;
  }
}

// Singleton instance
export const tradingViewFeed = new TradingViewFeedService();