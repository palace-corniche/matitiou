// ============= SHADOW TRADING PnL VALIDATION COMPONENT =============
// Test component to validate real-time PnL calculations

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { unifiedMarketData } from '@/services/unifiedMarketData';
import { useShadowTradingUnified } from '@/hooks/useShadowTradingUnified';
import { Calculator, TrendingUp, TrendingDown, CheckCircle, AlertCircle } from 'lucide-react';
import PnLCalculator from '@/services/pnlCalculator';

export const PnLValidationTest: React.FC = () => {
  const {
    currentPrice,
    tickData,
    isConnected,
    openTrades,
    executeTrade
  } = useShadowTradingUnified();

  const [testResults, setTestResults] = useState<any[]>([]);
  const [isRunningTest, setIsRunningTest] = useState(false);

  // Manual PnL calculation function for validation
  const calculateManualPnL = (
    tradeType: 'buy' | 'sell',
    entryPrice: number,
    currentPrice: number,
    lotSize: number
  ) => {
    const pips = PnLCalculator.calculatePips(tradeType, entryPrice, currentPrice);
    const pnl = PnLCalculator.calculatePnL(tradeType, entryPrice, currentPrice, lotSize);
    
    return {
      profitPips: parseFloat(pips.toFixed(1)),
      pnl: parseFloat(pnl.toFixed(2))
    };
  };

  const runPnLValidationTest = async () => {
    if (!currentPrice || !tickData || !isConnected) {
      setTestResults([{
        test: 'Market Data Check',
        status: 'failed',
        message: 'No market data available',
        details: { currentPrice, isConnected }
      }]);
      return;
    }

    setIsRunningTest(true);
    const results = [];

    // Test 1: Market Data Validation
    results.push({
      test: 'Market Data Connection',
      status: 'passed',
      message: `Live EUR/USD: ${currentPrice.toFixed(5)}`,
      details: {
        price: currentPrice,
        bid: tickData.bid,
        ask: tickData.ask,
        spread: tickData.spread,
        source: tickData.source
      }
    });

    // Test 2: Calculate Manual PnL for existing trades
    for (const trade of openTrades) {
      const usePrice = trade.trade_type === 'buy' ? tickData.bid : tickData.ask;
      const manualCalc = calculateManualPnL(trade.trade_type, trade.entry_price, usePrice, trade.lot_size);
      
      const tradePnLMatch = Math.abs((trade.unrealized_pnl || 0) - manualCalc.pnl) < 0.01;
      const tradePipsMatch = Math.abs((trade.profit_pips || 0) - manualCalc.profitPips) < 0.1;
      
      results.push({
        test: `Trade ${trade.id.slice(0, 8)} PnL Validation`,
        status: tradePnLMatch && tradePipsMatch ? 'passed' : 'failed',
        message: `${trade.trade_type.toUpperCase()} ${trade.symbol} | Lot: ${trade.lot_size}`,
        details: {
          entryPrice: trade.entry_price,
          currentPrice: usePrice,
          systemPnL: trade.unrealized_pnl || 0,
          manualPnL: manualCalc.pnl,
          systemPips: trade.profit_pips || 0,
          manualPips: manualCalc.profitPips,
          pnlMatch: tradePnLMatch,
          pipsMatch: tradePipsMatch
        }
      });
    }

    // Test 3: Execute a test trade if none exist
    if (openTrades.length === 0) {
      try {
        console.log('📊 Executing test trade for PnL validation...');
        
        const testTrade = await executeTrade({
          symbol: 'EUR/USD',
          trade_type: 'buy',
          lot_size: 0.01,
          entry_price: currentPrice,
          stop_loss: currentPrice - 0.0050,
          take_profit: currentPrice + 0.0100,
          strategy_name: 'PnL Validation Test',
          comment: 'Test trade for PnL calculation validation'
        });

        if (testTrade) {
          results.push({
            test: 'Test Trade Execution',
            status: 'passed',
            message: 'Test trade created successfully',
            details: {
              tradeId: testTrade.id,
              entryPrice: testTrade.entry_price,
              lotSize: testTrade.lot_size,
              type: testTrade.trade_type
            }
          });
        } else {
          results.push({
            test: 'Test Trade Execution',
            status: 'failed',
            message: 'Failed to create test trade'
          });
        }
      } catch (error) {
        results.push({
          test: 'Test Trade Execution',
          status: 'failed',
          message: `Error: ${error.message}`,
          details: { error }
        });
      }
    }

    setTestResults(results);
    setIsRunningTest(false);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calculator className="h-5 w-5" />
          <span>Shadow Trading PnL Validation</span>
          <Badge variant={isConnected ? 'default' : 'destructive'}>
            {isConnected ? 'Live Data' : 'Disconnected'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Market Data */}
        <div className="p-4 bg-muted rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium">EUR/USD Price:</span>
              <div className="font-mono text-lg">{currentPrice.toFixed(5)}</div>
            </div>
            {tickData && (
              <>
                <div>
                  <span className="font-medium">Bid:</span>
                  <div className="font-mono">{tickData.bid.toFixed(5)}</div>
                </div>
                <div>
                  <span className="font-medium">Ask:</span>
                  <div className="font-mono">{tickData.ask.toFixed(5)}</div>
                </div>
                <div>
                  <span className="font-medium">Spread:</span>
                  <div>{tickData.spread} pips</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Test Controls */}
        <Button 
          onClick={runPnLValidationTest} 
          disabled={isRunningTest || !isConnected}
          className="w-full"
        >
          {isRunningTest ? 'Running Validation...' : 'Validate PnL Calculations'}
        </Button>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-medium">Validation Results:</h3>
            {testResults.map((result, index) => (
              <div key={index} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{result.test}</span>
                  <div className="flex items-center space-x-2">
                    {result.status === 'passed' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                    <Badge variant={result.status === 'passed' ? 'default' : 'destructive'}>
                      {result.status}
                    </Badge>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground mb-2">
                  {result.message}
                </div>
                {result.details && (
                  <details className="text-xs">
                    <summary className="cursor-pointer font-medium">Details</summary>
                    <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Open Trades Summary */}
        {openTrades.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-medium">Current Open Trades ({openTrades.length}):</h3>
            {openTrades.map((trade) => (
              <div key={trade.id} className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center space-x-2">
                  {trade.trade_type === 'buy' ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                  <span className="text-sm">
                    {trade.trade_type.toUpperCase()} {trade.lot_size} lots @ {trade.entry_price.toFixed(5)}
                  </span>
                </div>
                <div className="text-right text-sm">
                  <div className={`font-medium ${
                    (trade.unrealized_pnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    ${(trade.unrealized_pnl || 0).toFixed(2)}
                  </div>
                  <div className="text-muted-foreground">
                    {(trade.profit_pips || 0).toFixed(1)} pips
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};