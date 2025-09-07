// MarketWatch Component - Real-time instrument prices and selection

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Search, TrendingUp, TrendingDown, Star, Plus } from 'lucide-react';

interface TradingInstrument {
  symbol: string;
  display_name: string;
  instrument_type: string;
  pip_size: number;
  typical_spread: number;
  bid_price?: number;
  ask_price?: number;
  change?: number;
  change_percent?: number;
}

interface MarketWatchProps {
  instruments: TradingInstrument[];
  selectedSymbol: string;
  onSymbolSelect: (symbol: string) => void;
}

export const MarketWatch: React.FC<MarketWatchProps> = ({
  instruments,
  selectedSymbol,
  onSymbolSelect
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [favorites, setFavorites] = useState<string[]>(['EUR/USD', 'GBP/USD', 'USD/JPY']);

  const filteredInstruments = instruments.filter(instrument => {
    const matchesSearch = instrument.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         instrument.display_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || instrument.instrument_type === selectedType;
    return matchesSearch && matchesType;
  });

  const instrumentTypes = ['all', 'forex', 'index', 'commodity', 'crypto'];

  const formatPrice = (price: number | undefined, pipSize: number) => {
    if (!price) return '0.00000';
    const decimals = pipSize === 0.01 ? 2 : pipSize === 0.0001 ? 5 : 3;
    return price.toFixed(decimals);
  };

  const formatSpread = (bid: number | undefined, ask: number | undefined) => {
    if (!bid || !ask) return '0.0';
    const spread = (ask - bid) * 10000; // in pips
    return spread.toFixed(1);
  };

  const toggleFavorite = (symbol: string) => {
    setFavorites(prev => 
      prev.includes(symbol) 
        ? prev.filter(s => s !== symbol)
        : [...prev, symbol]
    );
  };

  return (
    <Card className="h-[500px]">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          Market Watch
          <Button variant="ghost" size="sm">
            <Plus className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Search and Filter */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search instruments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8"
            />
          </div>
          
          <div className="flex gap-1 flex-wrap">
            {instrumentTypes.map(type => (
              <Button
                key={type}
                variant={selectedType === type ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedType(type)}
                className="h-6 px-2 text-xs"
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Favorites Section */}
        {favorites.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-2">Favorites</h4>
            <div className="space-y-1">
              {instruments
                .filter(inst => favorites.includes(inst.symbol))
                .map(instrument => (
                  <InstrumentRow
                    key={`fav-${instrument.symbol}`}
                    instrument={instrument}
                    isSelected={selectedSymbol === instrument.symbol}
                    isFavorite={true}
                    onSelect={() => onSymbolSelect(instrument.symbol)}
                    onToggleFavorite={() => toggleFavorite(instrument.symbol)}
                    formatPrice={formatPrice}
                    formatSpread={formatSpread}
                  />
                ))}
            </div>
            <Separator className="my-2" />
          </div>
        )}

        {/* All Instruments */}
        <ScrollArea className="h-[300px]">
          <div className="space-y-1">
            {filteredInstruments.map(instrument => (
              <InstrumentRow
                key={instrument.symbol}
                instrument={instrument}
                isSelected={selectedSymbol === instrument.symbol}
                isFavorite={favorites.includes(instrument.symbol)}
                onSelect={() => onSymbolSelect(instrument.symbol)}
                onToggleFavorite={() => toggleFavorite(instrument.symbol)}
                formatPrice={formatPrice}
                formatSpread={formatSpread}
              />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

interface InstrumentRowProps {
  instrument: TradingInstrument;
  isSelected: boolean;
  isFavorite: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
  formatPrice: (price: number | undefined, pipSize: number) => string;
  formatSpread: (bid: number | undefined, ask: number | undefined) => string;
}

const InstrumentRow: React.FC<InstrumentRowProps> = ({
  instrument,
  isSelected,
  isFavorite,
  onSelect,
  onToggleFavorite,
  formatPrice,
  formatSpread
}) => (
  <div
    className={`p-2 rounded cursor-pointer hover:bg-muted/50 transition-colors text-xs ${
      isSelected ? 'bg-primary/10 border border-primary/20' : 'border border-transparent'
    }`}
    onClick={onSelect}
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-4 w-4 p-0"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
        >
          <Star 
            className={`h-3 w-3 ${
              isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
            }`} 
          />
        </Button>
        <div>
          <div className="font-medium">{instrument.symbol}</div>
          <div className="text-muted-foreground text-xs">{instrument.display_name}</div>
        </div>
      </div>
      
      <div className="text-right">
        <div className="flex items-center gap-1">
          <span className="text-red-600">{formatPrice(instrument.bid_price, instrument.pip_size)}</span>
          <span className="text-green-600">{formatPrice(instrument.ask_price, instrument.pip_size)}</span>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <span className="text-muted-foreground">
            {formatSpread(instrument.bid_price, instrument.ask_price)}
          </span>
          {instrument.change !== undefined && (
            <div className={`flex items-center ${
              instrument.change >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {instrument.change >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span>{Math.abs(instrument.change_percent || 0).toFixed(2)}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
);