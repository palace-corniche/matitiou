

# WhatsApp Trade Notifications via CallMeBot

## Overview
Send WhatsApp messages to 53624095 when trades open and close, using CallMeBot's free API.

## Prerequisites
- User must activate CallMeBot and provide the API key
- Store `CALLMEBOT_API_KEY` and `CALLMEBOT_PHONE` as backend secrets

## Implementation

### 1. Store Secrets
- `CALLMEBOT_API_KEY` — from activation step
- `CALLMEBOT_PHONE` — `53624095` (with country code if needed)

### 2. Create `send-whatsapp-notification` Edge Function
Simple function that sends a message via CallMeBot:
```
GET https://api.callmebot.com/whatsapp.php?phone={PHONE}&text={URL_ENCODED_MESSAGE}&apikey={KEY}
```
Accepts `{ message: string }` body. Reads phone + apikey from secrets.

### 3. Edit `execute-shadow-trades/index.ts`
After successful `execute_global_shadow_trade` RPC call, invoke `send-whatsapp-notification` with:
```
📈 TRADE OPENED
Symbol: EUR/USD
Type: BUY/SELL
Entry: 1.15563
SL: 1.15363
TP: 1.15963
Lot: 0.01
Time: 2026-03-08 14:30 UTC
```

### 4. Edit `check-trade-exits/index.ts`
After successful `close_shadow_trade` RPC call, invoke `send-whatsapp-notification` with:
```
📊 TRADE CLOSED
Symbol: EUR/USD
Type: BUY/SELL
Entry: 1.15563 → Exit: 1.15963
Reason: TP Hit / SL Hit / Time Limit
PnL: +$4.00 (+40.0 pips)
Duration: 2h 15m
```

### 5. Edit `monitor-exit-intelligence/index.ts`
After FORCE_EXIT close, send same close notification format with reason "Intelligent Exit".

### Files
- **Create**: `supabase/functions/send-whatsapp-notification/index.ts`
- **Edit**: `supabase/functions/execute-shadow-trades/index.ts` (add notification after trade open)
- **Edit**: `supabase/functions/check-trade-exits/index.ts` (add notification after trade close)
- **Edit**: `supabase/functions/monitor-exit-intelligence/index.ts` (add notification after force exit)

