// PendingOrders Component - Display and manage pending orders

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Edit3, Clock, Target } from 'lucide-react';

interface PendingOrder {
  id: string;
  symbol: string;
  order_type: string;
  trade_type: 'buy' | 'sell';
  lot_size: number;
  trigger_price: number;
  stop_loss?: number;
  take_profit?: number;
  expiry_time?: string;
  status: string;
  created_at: string;
}

interface PendingOrdersProps {
  orders: PendingOrder[];
  onCancel: (orderId: string) => void;
  onModify: (orderId: string) => void;
}

export const PendingOrders: React.FC<PendingOrdersProps> = ({
  orders,
  onCancel,
  onModify
}) => {
  const formatPrice = (price: number) => price.toFixed(5);
  
  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getOrderTypeColor = (orderType: string) => {
    switch (orderType) {
      case 'limit': return 'default';
      case 'stop': return 'destructive';
      case 'stop_limit': return 'secondary';
      case 'trailing_stop': return 'outline';
      default: return 'default';
    }
  };

  const getTradeTypeColor = (tradeType: string) => {
    return tradeType === 'buy' ? 'default' : 'destructive';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Pending Orders ({orders.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          {orders.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No pending orders</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div key={order.id} className="p-3 border rounded-lg space-y-2">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{order.symbol}</span>
                      <Badge 
                        variant={getOrderTypeColor(order.order_type)}
                        className="text-xs"
                      >
                        {order.order_type.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <Badge 
                        variant={getTradeTypeColor(order.trade_type)}
                        className="text-xs"
                      >
                        {order.trade_type.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onModify(order.id)}
                        className="h-6 w-6 p-0"
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onCancel(order.id)}
                        className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Order Details */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Lots:</span>
                      <span className="ml-1 font-medium">{order.lot_size}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Trigger:</span>
                      <span className="ml-1 font-medium">{formatPrice(order.trigger_price)}</span>
                    </div>
                    
                    {order.stop_loss && (
                      <div>
                        <span className="text-muted-foreground">S/L:</span>
                        <span className="ml-1 font-medium text-red-600">
                          {formatPrice(order.stop_loss)}
                        </span>
                      </div>
                    )}
                    
                    {order.take_profit && (
                      <div>
                        <span className="text-muted-foreground">T/P:</span>
                        <span className="ml-1 font-medium text-green-600">
                          {formatPrice(order.take_profit)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Timing Information */}
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Created: {formatTime(order.created_at)}</span>
                    {order.expiry_time && (
                      <span className="flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        Expires: {formatTime(order.expiry_time)}
                      </span>
                    )}
                  </div>

                  {/* Status */}
                  <div className="flex justify-between items-center">
                    <Badge variant="outline" className="text-xs">
                      {order.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};