import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CandleValidation {
  timeframe: string;
  available_candles: number;
  required_candles: number;
  is_sufficient: boolean;
  status: 'ready' | 'partial' | 'insufficient';
  message: string;
}

export const CandleDataValidation = () => {
  const [validations, setValidations] = useState<CandleValidation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkCandleData = async () => {
      const timeframes = ['15m', 'H1', 'H4', 'D1'];
      const results: CandleValidation[] = [];

      for (const timeframe of timeframes) {
        try {
          // Query the database directly instead of using RPC
          const { data: candles, error } = await supabase
            .from('market_data_feed')
            .select('id')
            .eq('symbol', 'EUR/USD')
            .eq('timeframe', timeframe);

          if (!error && candles) {
            const availableCandles = candles.length;
            const requiredCandles = 50;
            const isSufficient = availableCandles >= requiredCandles;
            
            results.push({
              timeframe,
              available_candles: availableCandles,
              required_candles: requiredCandles,
              is_sufficient: isSufficient,
              status: isSufficient ? 'ready' : (availableCandles >= requiredCandles * 0.5 ? 'partial' : 'insufficient'),
              message: isSufficient 
                ? 'Sufficient data for analysis' 
                : `Need ${requiredCandles - availableCandles} more candles for reliable analysis`
            });
          }
        } catch (err) {
          console.error(`Failed to validate ${timeframe}:`, err);
        }
      }

      setValidations(results);
      setLoading(false);
    };

    checkCandleData();
    
    // Refresh every 5 minutes
    const interval = setInterval(checkCandleData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'partial':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'insufficient':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'partial':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'insufficient':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const criticalIssues = validations.filter(v => v.status === 'insufficient');
  const partialIssues = validations.filter(v => v.status === 'partial');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Candle Data Validation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Status Alert */}
        {criticalIssues.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> {criticalIssues.length} timeframe(s) have insufficient candle data for reliable technical analysis.
              Signal quality may be compromised.
            </AlertDescription>
          </Alert>
        )}

        {partialIssues.length > 0 && criticalIssues.length === 0 && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              {partialIssues.length} timeframe(s) have partial data. Accuracy will improve as more candles are collected.
            </AlertDescription>
          </Alert>
        )}

        {/* Timeframe Status Grid */}
        <div className="grid grid-cols-2 gap-3">
          {loading ? (
            <div className="col-span-2 text-center text-sm text-muted-foreground py-8">
              Validating candle data...
            </div>
          ) : (
            validations.map((validation) => (
              <div
                key={validation.timeframe}
                className="p-4 rounded-lg border bg-card space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{validation.timeframe}</span>
                  {getStatusIcon(validation.status)}
                </div>
                
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Candles:</span>
                  <Badge variant="outline" className={getStatusColor(validation.status)}>
                    {validation.available_candles} / {validation.required_candles}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground">
                  {validation.message}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Summary */}
        <div className="text-xs text-muted-foreground">
          Technical indicators require sufficient historical data for accurate calculations.
          Insufficient data may result in false signals.
        </div>
      </CardContent>
    </Card>
  );
};
