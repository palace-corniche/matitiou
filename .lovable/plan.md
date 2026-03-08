

# Telegram Trade Notifications

## Secrets to Store
- `TELEGRAM_BOT_TOKEN` = `8754141486:AAFcJPcpuk3WHTwbXvBREBAvJkQKz2b13uw`
- `TELEGRAM_CHAT_ID` = `7480819673`

## Implementation

### 1. Create `send-telegram-notification` Edge Function
Sends a message via Telegram Bot API:
```
POST https://api.telegram.org/bot{TOKEN}/sendMessage
{ chat_id, text, parse_mode: "HTML" }
```
Accepts `{ message: string }` body.

### 2. Edit `execute-shadow-trades/index.ts`
After successful `execute_global_shadow_trade` RPC, invoke notification:
```
📈 TRADE OPENED
Symbol: EUR/USD
Type: BUY/SELL
Entry: 1.15563
SL: 1.15363 | TP: 1.15963
Lot: 0.01
```

### 3. Edit `check-trade-exits/index.ts`
After successful `close_shadow_trade` RPC, invoke notification:
```
📊 TRADE CLOSED
Type: BUY/SELL
Entry: 1.15563 → Exit: 1.15963
Reason: TP Hit / SL Hit / Time Limit
PnL: +$4.00 (+40.0 pips)
```

### 4. Edit `monitor-exit-intelligence/index.ts`
After FORCE_EXIT close, send same close format with reason "Intelligent Exit".

### Files
- **Create**: `supabase/functions/send-telegram-notification/index.ts`
- **Edit**: `supabase/functions/execute-shadow-trades/index.ts`
- **Edit**: `supabase/functions/check-trade-exits/index.ts`
- **Edit**: `supabase/functions/monitor-exit-intelligence/index.ts`

