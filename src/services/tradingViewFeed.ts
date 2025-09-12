// ============= TRADINGVIEW WEBSOCKET FEED =============
// Direct connection to TradingView WebSocket for FOREX.com real-time data

export interface TradingViewTick {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  timestamp: number;
  volume?: number;
}

interface TradingViewSubscription {
  onTick: (tick: TradingViewTick) => void;
  onConnectionChange: (connected: boolean) => void;
  onError: (error: Error) => void;
}

class TradingViewWebSocketFeed {
  private ws: WebSocket | null = null;
  private isConnected = false;
  private lastTick: TradingViewTick | null = null;
  private subscribers: TradingViewSubscription[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private sessionId = `tv_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  private pingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.connect();
  }

  private connect() {
    try {
      console.log('🔌 Connecting to TradingView WebSocket...');
      
      // Use TradingView's WebSocket endpoint
      this.ws = new WebSocket('wss://data.tradingview.com/socket.io/?EIO=3&transport=websocket');
      
      this.ws.onopen = () => {
        console.log('✅ TradingView WebSocket connected');
        this.reconnectAttempts = 0;
        this.setupQuoteSession();
        this.startPingInterval();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onclose = () => {
        console.log('❌ TradingView WebSocket disconnected');
        this.isConnected = false;
        this.notifyConnectionChange(false);
        this.clearPingInterval();
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('❌ TradingView WebSocket error:', error);
        this.notifyError(new Error('WebSocket connection error'));
      };

    } catch (error) {
      console.error('❌ Failed to connect to TradingView WebSocket:', error);
      this.attemptReconnect();
    }
  }

  private setupQuoteSession() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    // Create quote session for FOREX.com EUR/USD
    const createSessionMsg = `40/quote:{"m":"quote_create_session","p":["${this.sessionId}"]}`;
    this.ws.send(createSessionMsg);
    
    // Set fields for the quote
    const setFieldsMsg = `40/quote:{"m":"quote_set_fields","p":["${this.sessionId}","base-currency-logoid","ch","chp","currency-logoid","currency_code","currency_id","base_currency_id","listed_exchange","logoid","original_name","pricescale","minmov","fractional","minmove2","has_intraday","has_no_volume","type","typespecs","update_mode","supported_resolutions","intraday_multipliers","has_seconds","seconds_multipliers","has_daily","has_weekly","has_monthly","regular_session","data_status","primary_listinghash","current_session","volume_precision","format","description","short_name","pro_name","exchange-listed","exchange-traded","timezone","market_status"]}`;
    this.ws.send(setFieldsMsg);

    // Add symbol (FOREX.com EUR/USD)
    const addSymbolMsg = `40/quote:{"m":"quote_add_symbols","p":["${this.sessionId}","FOREXCOM:EURUSD",{"flags":["force_permission"]}]}`;
    this.ws.send(addSymbolMsg);

    console.log('📊 TradingView quote session created for FOREXCOM:EURUSD');
  }

  private handleMessage(data: string) {
    try {
      // Handle Socket.IO protocol messages
      if (data.startsWith('40/quote:')) {
        const jsonData = data.substring(9);
        const message = JSON.parse(jsonData);
        
        if (message.m === 'qsd') {
          // Quote symbol data - contains real-time price updates
          this.handleQuoteData(message.p);
        }
      } else if (data === '3probe') {
        // Respond to ping
        this.ws?.send('5');
      }
    } catch (error) {
      console.error('❌ Error parsing TradingView message:', error);
    }
  }

  private handleQuoteData(data: any[]) {
    if (!data || data.length < 2) return;

    const [sessionId, updates] = data;
    if (sessionId !== this.sessionId || !updates) return;

    try {
      // Extract price data from the update
      const symbolData = updates['FOREXCOM:EURUSD'];
      if (!symbolData) return;

      // Get the last price (lp field)
      const lastPrice = symbolData.lp;
      if (!lastPrice || typeof lastPrice !== 'number') return;

      // Create tick data
      const tick: TradingViewTick = {
        symbol: 'EURUSD',
        price: lastPrice,
        bid: lastPrice - 0.00002, // Approximate bid (2 pip spread)
        ask: lastPrice + 0.00002, // Approximate ask (2 pip spread)
        timestamp: Date.now(),
        volume: symbolData.volume || 0
      };

      // Mark as connected only after first valid tick
      if (!this.isConnected) {
        this.isConnected = true;
        this.notifyConnectionChange(true);
        console.log('✅ TradingView feed is now LIVE with FOREX.com data');
      }

      this.lastTick = tick;
      this.notifyTick(tick);

      console.log(`💰 FOREX.com EUR/USD: ${tick.price.toFixed(5)} (Spread: ${((tick.ask - tick.bid) * 10000).toFixed(1)} pips)`);

    } catch (error) {
      console.error('❌ Error processing quote data:', error);
    }
  }

  private startPingInterval() {
    this.clearPingInterval();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send('2probe');
      }
    }, 25000); // Ping every 25 seconds
  }

  private clearPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`🔄 Attempting to reconnect to TradingView (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms...`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  private notifyTick(tick: TradingViewTick) {
    this.subscribers.forEach(subscriber => {
      try {
        subscriber.onTick(tick);
      } catch (error) {
        console.error('❌ Error notifying tick subscriber:', error);
      }
    });
  }

  private notifyConnectionChange(connected: boolean) {
    this.subscribers.forEach(subscriber => {
      try {
        subscriber.onConnectionChange(connected);
      } catch (error) {
        console.error('❌ Error notifying connection change:', error);
      }
    });
  }

  private notifyError(error: Error) {
    this.subscribers.forEach(subscriber => {
      try {
        subscriber.onError(error);
      } catch (error) {
        console.error('❌ Error notifying error subscriber:', error);
      }
    });
  }

  // Public API
  public subscribe(subscription: TradingViewSubscription): () => void {
    this.subscribers.push(subscription);
    
    // Immediately notify if we have data
    if (this.lastTick) {
      subscription.onTick(this.lastTick);
    }
    subscription.onConnectionChange(this.isConnected);
    
    // Return unsubscribe function
    return () => {
      const index = this.subscribers.indexOf(subscription);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  public getLastTick(): TradingViewTick | null {
    return this.lastTick;
  }

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  public disconnect() {
    this.clearPingInterval();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.subscribers = [];
  }
}

// Export singleton instance
export const tradingViewFeed = new TradingViewWebSocketFeed();