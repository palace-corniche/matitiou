import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import PnLCalculator from '@/services/pnlCalculator';

const PnLVerificationTest: React.FC = () => {
  // Test scenarios for verification
  const testScenarios = [
    {
      name: "BUY 0.01 lot - 10 pip profit",
      tradeType: 'buy' as const,
      entryPrice: 1.18000,
      currentPrice: 1.18100,
      lotSize: 0.01,
      expectedPips: 10,
      expectedPnL: 1.00 // $1.00 profit
    },
    {
      name: "SELL 0.01 lot - 10 pip profit", 
      tradeType: 'sell' as const,
      entryPrice: 1.18000,
      currentPrice: 1.17900,
      lotSize: 0.01,
      expectedPips: 10,
      expectedPnL: 1.00 // $1.00 profit
    },
    {
      name: "BUY 1.0 lot - 20 pip profit",
      tradeType: 'buy' as const,
      entryPrice: 1.18000,
      currentPrice: 1.18200,
      lotSize: 1.0,
      expectedPips: 20,
      expectedPnL: 200.00 // $200.00 profit
    },
    {
      name: "SELL 0.1 lot - 15 pip loss",
      tradeType: 'sell' as const,
      entryPrice: 1.18000,
      currentPrice: 1.18150,
      lotSize: 0.1,
      expectedPips: -15,
      expectedPnL: -15.00 // $15.00 loss
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>PnL Calculation Verification</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {testScenarios.map((scenario, index) => {
            const calculatedPips = PnLCalculator.calculatePips(
              scenario.tradeType, 
              scenario.entryPrice, 
              scenario.currentPrice
            );
            const calculatedPnL = PnLCalculator.calculateNetPnL(
              calculatedPips, 
              scenario.lotSize
            );
            
            const pipsMatch = Math.abs(calculatedPips - scenario.expectedPips) < 0.1;
            const pnlMatch = Math.abs(calculatedPnL - scenario.expectedPnL) < 0.01;
            const allMatch = pipsMatch && pnlMatch;

            return (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">{scenario.name}</h4>
                  <Badge variant={allMatch ? "default" : "destructive"}>
                    {allMatch ? "PASS" : "FAIL"}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Expected:</div>
                    <div>Pips: {scenario.expectedPips}</div>
                    <div>PnL: ${scenario.expectedPnL.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Calculated:</div>
                    <div className={pipsMatch ? "text-green-600" : "text-red-600"}>
                      Pips: {calculatedPips.toFixed(1)}
                    </div>
                    <div className={pnlMatch ? "text-green-600" : "text-red-600"}>
                      PnL: ${calculatedPnL.toFixed(2)}
                    </div>
                  </div>
                </div>
                
                <div className="mt-2 text-xs text-muted-foreground">
                  {scenario.tradeType.toUpperCase()} {scenario.lotSize} lot @ {scenario.entryPrice.toFixed(5)} → {scenario.currentPrice.toFixed(5)}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default PnLVerificationTest;