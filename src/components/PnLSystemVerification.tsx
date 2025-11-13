import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import PnLCalculator from '@/services/pnlCalculator';

interface VerificationResult {
  trade_id: string;
  entry_price: number;
  exit_price: number;
  trade_type: string;
  lot_size: number;
  calculated_pips: number;
  stored_pips: number;
  calculated_pnl: number;
  stored_pnl: number;
  pips_match: boolean;
  pnl_match: boolean;
}

const PnLSystemVerification: React.FC = () => {
  const [verifying, setVerifying] = useState(false);
  const [results, setResults] = useState<VerificationResult[]>([]);
  const [summary, setSummary] = useState<{
    total: number;
    passed: number;
    failed: number;
  } | null>(null);

  const runVerification = async () => {
    setVerifying(true);
    try {
      // Get recent closed trades
      const { data: trades, error } = await supabase
        .from('shadow_trades')
        .select('id, entry_price, exit_price, trade_type, lot_size, profit_pips, pnl')
        .eq('status', 'closed')
        .not('exit_price', 'is', null)
        .order('exit_time', { ascending: false })
        .limit(10);

      if (error) throw error;

      if (!trades || trades.length === 0) {
        setResults([]);
        setSummary({ total: 0, passed: 0, failed: 0 });
        return;
      }

      // Verify each trade
      const verificationResults: VerificationResult[] = trades.map(trade => {
        // Recalculate pips
        const calculatedPips = PnLCalculator.calculatePips(
          trade.trade_type as 'buy' | 'sell',
          trade.entry_price,
          trade.exit_price
        );

        // Recalculate PnL
        const calculatedPnL = PnLCalculator.calculateNetPnL(
          calculatedPips,
          trade.lot_size
        );

        // Check if they match (within tolerance)
        const pipsMatch = Math.abs(calculatedPips - (trade.profit_pips || 0)) < 0.1;
        const pnlMatch = Math.abs(calculatedPnL - (trade.pnl || 0)) < 0.01;

        return {
          trade_id: trade.id,
          entry_price: trade.entry_price,
          exit_price: trade.exit_price,
          trade_type: trade.trade_type,
          lot_size: trade.lot_size,
          calculated_pips: calculatedPips,
          stored_pips: trade.profit_pips || 0,
          calculated_pnl: calculatedPnL,
          stored_pnl: trade.pnl || 0,
          pips_match: pipsMatch,
          pnl_match: pnlMatch,
        };
      });

      setResults(verificationResults);

      const passed = verificationResults.filter(r => r.pips_match && r.pnl_match).length;
      setSummary({
        total: verificationResults.length,
        passed,
        failed: verificationResults.length - passed,
      });
    } catch (error) {
      console.error('Verification failed:', error);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>PnL System Verification</CardTitle>
            <CardDescription>
              Verifies that all PnL and pip calculations match between frontend and backend
            </CardDescription>
          </div>
          <Button onClick={runVerification} disabled={verifying}>
            <RefreshCw className={`mr-2 h-4 w-4 ${verifying ? 'animate-spin' : ''}`} />
            {verifying ? 'Verifying...' : 'Run Verification'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {summary && (
          <Alert variant={summary.failed === 0 ? 'default' : 'destructive'}>
            <AlertDescription className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {summary.failed === 0 ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5" />
                )}
                <span className="font-semibold">
                  {summary.passed}/{summary.total} trades verified correctly
                </span>
              </div>
              {summary.failed > 0 && (
                <Badge variant="destructive">{summary.failed} mismatches found</Badge>
              )}
            </AlertDescription>
          </Alert>
        )}

        {results.length === 0 && !verifying && (
          <div className="text-center py-8 text-muted-foreground">
            No closed trades to verify. Click "Run Verification" to check recent trades.
          </div>
        )}

        <div className="space-y-3">
          {results.map((result, index) => {
            const allMatch = result.pips_match && result.pnl_match;
            
            return (
              <div
                key={result.trade_id}
                className={`border rounded-lg p-4 ${
                  allMatch ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Trade #{index + 1}</span>
                    <Badge variant={result.trade_type === 'buy' ? 'default' : 'secondary'}>
                      {result.trade_type.toUpperCase()}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {result.lot_size} lot
                    </span>
                  </div>
                  {allMatch ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground mb-1">Prices</div>
                    <div>Entry: {result.entry_price.toFixed(5)}</div>
                    <div>Exit: {result.exit_price.toFixed(5)}</div>
                  </div>

                  <div>
                    <div className="text-muted-foreground mb-1">Pips</div>
                    <div className={result.pips_match ? 'text-green-600' : 'text-red-600'}>
                      Calculated: {result.calculated_pips.toFixed(1)}
                    </div>
                    <div>Stored: {result.stored_pips.toFixed(1)}</div>
                    {!result.pips_match && (
                      <div className="text-xs text-red-600 mt-1">
                        Δ {Math.abs(result.calculated_pips - result.stored_pips).toFixed(1)} pips
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="text-muted-foreground mb-1">PnL</div>
                    <div className={result.pnl_match ? 'text-green-600' : 'text-red-600'}>
                      Calculated: ${result.calculated_pnl.toFixed(2)}
                    </div>
                    <div>Stored: ${result.stored_pnl.toFixed(2)}</div>
                    {!result.pnl_match && (
                      <div className="text-xs text-red-600 mt-1">
                        Δ ${Math.abs(result.calculated_pnl - result.stored_pnl).toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default PnLSystemVerification;
