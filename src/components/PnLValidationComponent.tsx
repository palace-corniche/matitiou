// ============= PnL VALIDATION COMPONENT =============
// Cross-checks Shadow Trading vs MetaTrader4 PnL calculations

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, Calculator, RefreshCw } from 'lucide-react';
import { useShadowTradingUnified } from '@/hooks/useShadowTradingUnified';
import { unifiedMarketData } from '@/services/unifiedMarketData';
import PnLCalculator from '@/services/pnlCalculator';

interface ValidationResult {
  tradeId: string;
  symbol: string;
  tradeType: 'buy' | 'sell';
  entryPrice: number;
  currentPrice: number;
  lotSize: number;
  
  // Calculated values
  calculatedPips: number;
  calculatedPnL: number;
  
  // System values
  systemPips: number;
  systemPnL: number;
  
  // Validation
  pipsMatch: boolean;
  pnlMatch: boolean;
  isValid: boolean;
}

export const PnLValidationComponent: React.FC = () => {
  const { openTrades, tickData, currentPrice } = useShadowTradingUnified();
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [lastValidation, setLastValidation] = useState<Date | null>(null);

  // Manual PnL calculation for validation using centralized logic
  const calculateManualPnL = (
    tradeType: 'buy' | 'sell',
    entryPrice: number,
    currentPrice: number,
    lotSize: number
  ): { pips: number; pnl: number } => {
    const pips = PnLCalculator.calculatePips(tradeType, entryPrice, currentPrice);
    const pnl = PnLCalculator.calculatePnL(tradeType, entryPrice, currentPrice, lotSize);
    
    return {
      pips: parseFloat(pips.toFixed(1)),
      pnl: parseFloat(pnl.toFixed(2))
    };
  };

  const runValidation = async () => {
    if (!tickData) {
      return;
    }

    setIsValidating(true);
    const results: ValidationResult[] = [];

    try {
      for (const trade of openTrades) {
        // Use correct bid/ask for current price
        const currentMarketPrice = trade.trade_type === 'buy' ? tickData.bid : tickData.ask;
        
        // Calculate expected values manually
        const manual = calculateManualPnL(
          trade.trade_type,
          trade.entry_price,
          currentMarketPrice,
          trade.lot_size
        );

        // Compare with system values
        const systemPips = trade.profit_pips || 0;
        const systemPnL = trade.unrealized_pnl || 0;

        const pipsMatch = Math.abs(manual.pips - systemPips) < 0.2; // Allow 0.2 pip tolerance
        const pnlMatch = Math.abs(manual.pnl - systemPnL) < 0.10; // Allow $0.10 tolerance

        results.push({
          tradeId: trade.id,
          symbol: trade.symbol,
          tradeType: trade.trade_type,
          entryPrice: trade.entry_price,
          currentPrice: currentMarketPrice,
          lotSize: trade.lot_size,
          calculatedPips: manual.pips,
          calculatedPnL: manual.pnl,
          systemPips,
          systemPnL,
          pipsMatch,
          pnlMatch,
          isValid: pipsMatch && pnlMatch
        });
      }

      setValidationResults(results);
      setLastValidation(new Date());
    } catch (error) {
      console.error('❌ Validation error:', error);
    } finally {
      setIsValidating(false);
    }
  };

  // Auto-validate when trades or prices change
  useEffect(() => {
    if (openTrades.length > 0 && tickData) {
      const timer = setTimeout(runValidation, 1000); // Debounce
      return () => clearTimeout(timer);
    }
  }, [openTrades.length, tickData?.price]);

  const overallValidation = validationResults.length > 0 
    ? validationResults.every(r => r.isValid)
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Calculator className="h-5 w-5 mr-2" />
          PnL Calculation Validation
        </CardTitle>
        <CardDescription>
          Cross-validation of real-time PnL and Pips calculations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Market Data Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
          <div>
            <div className="text-sm text-muted-foreground">Current Price</div>
            <div className="font-medium">{currentPrice.toFixed(5)}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Bid</div>
            <div className="font-medium">{tickData?.bid.toFixed(5) || 'N/A'}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Ask</div>
            <div className="font-medium">{tickData?.ask.toFixed(5) || 'N/A'}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Spread</div>
            <div className="font-medium">{tickData?.spread.toFixed(1) || 'N/A'} pips</div>
          </div>
        </div>

        {/* Validation Controls */}
        <div className="flex items-center justify-between">
          <Button 
            onClick={runValidation} 
            disabled={isValidating || openTrades.length === 0}
            variant="outline"
          >
            {isValidating ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Calculator className="h-4 w-4 mr-2" />
            )}
            Validate PnL Calculations
          </Button>
          
          {lastValidation && (
            <div className="text-sm text-muted-foreground">
              Last validation: {lastValidation.toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* Overall Status */}
        {overallValidation !== null && (
          <Alert className={overallValidation ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
            <div className="flex items-center">
              {overallValidation ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className="ml-2">
                {overallValidation
                  ? `All ${validationResults.length} trades pass validation`
                  : `${validationResults.filter(r => !r.isValid).length} trades have calculation discrepancies`
                }
              </AlertDescription>
            </div>
          </Alert>
        )}

        {/* Validation Results */}
        {validationResults.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Validation Results</h4>
            {validationResults.map((result) => (
              <div 
                key={result.tradeId} 
                className={`border rounded-lg p-4 ${
                  result.isValid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Badge variant={result.tradeType === 'buy' ? 'default' : 'destructive'}>
                      {result.tradeType.toUpperCase()}
                    </Badge>
                    <span className="font-medium">{result.symbol}</span>
                    <span className="text-sm text-muted-foreground">
                      {result.lotSize} lots
                    </span>
                  </div>
                  
                  {result.isValid ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Entry Price</div>
                    <div className="font-medium">{result.entryPrice.toFixed(5)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Current Price</div>
                    <div className="font-medium">{result.currentPrice.toFixed(5)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Expected Pips</div>
                    <div className={`font-medium ${result.pipsMatch ? 'text-green-600' : 'text-red-600'}`}>
                      {result.calculatedPips.toFixed(1)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">System Pips</div>
                    <div className={`font-medium ${result.pipsMatch ? 'text-green-600' : 'text-red-600'}`}>
                      {result.systemPips.toFixed(1)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                  <div>
                    <div className="text-muted-foreground">Expected PnL</div>
                    <div className={`font-medium ${result.pnlMatch ? 'text-green-600' : 'text-red-600'}`}>
                      ${result.calculatedPnL.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">System PnL</div>
                    <div className={`font-medium ${result.pnlMatch ? 'text-green-600' : 'text-red-600'}`}>
                      ${result.systemPnL.toFixed(2)}
                    </div>
                  </div>
                </div>

                {!result.isValid && (
                  <div className="mt-2 text-sm text-red-600">
                    Issues: {!result.pipsMatch && 'Pips mismatch'} {!result.pnlMatch && 'PnL mismatch'}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {openTrades.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No open trades to validate</p>
            <p className="text-sm">Open some positions to test PnL calculations</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PnLValidationComponent;