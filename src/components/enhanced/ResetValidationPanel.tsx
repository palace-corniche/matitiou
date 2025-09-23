// Phase 4: Reset Validation Panel Component
// Provides real-time validation feedback and reset status monitoring

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { useGlobalShadowTrading } from '@/hooks/useGlobalShadowTrading';
import { toast } from 'sonner';

interface ValidationStatus {
  isValid: boolean;
  message: string;
  errors: string[];
  stats: {
    tradesCount: number;
    historyCount: number;
    accountBalance: number;
  };
  lastChecked: Date;
}

export const ResetValidationPanel: React.FC = () => {
  const { validateResetCompletion, account, openTrades, tradeHistory } = useGlobalShadowTrading();
  const [validationStatus, setValidationStatus] = useState<ValidationStatus | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const runValidation = async () => {
    if (isValidating) return;
    
    setIsValidating(true);
    try {
      const result = await validateResetCompletion();
      
      setValidationStatus({
        isValid: result.success,
        message: result.message,
        errors: result.errors,
        stats: result.stats,
        lastChecked: new Date()
      });
      
      if (!result.success) {
        toast.error(`Validation failed: ${result.errors.join(', ')}`);
      }
    } catch (error) {
      console.error('Validation failed:', error);
      toast.error('Failed to run validation check');
    } finally {
      setIsValidating(false);
    }
  };

  // Auto-validation when data changes
  useEffect(() => {
    if (account) {
      runValidation();
    }
  }, [account?.total_trades, openTrades?.length, tradeHistory?.length]);

  const getStatusIcon = () => {
    if (isValidating) return <RefreshCw className="h-5 w-5 animate-spin text-blue-500" />;
    if (!validationStatus) return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    return validationStatus.isValid ? 
      <CheckCircle className="h-5 w-5 text-green-500" /> : 
      <XCircle className="h-5 w-5 text-red-500" />;
  };

  const getStatusBadge = () => {
    if (isValidating) return <Badge variant="secondary">Validating...</Badge>;
    if (!validationStatus) return <Badge variant="outline">Not Checked</Badge>;
    return validationStatus.isValid ? 
      <Badge variant="default" className="bg-green-100 text-green-800">Valid</Badge> : 
      <Badge variant="destructive">Issues Found</Badge>;
  };

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <CardTitle className="text-lg">System Validation</CardTitle>
          </div>
          {getStatusBadge()}
        </div>
        <CardDescription>
          Real-time validation of account and data integrity
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {validationStatus && (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              <strong>Status:</strong> {validationStatus.message}
            </div>
            
            {/* Current Stats */}
            <div className="grid grid-cols-3 gap-4 p-3 bg-muted/50 rounded-lg">
              <div className="text-center">
                <div className="text-lg font-bold text-primary">
                  {validationStatus.stats.tradesCount}
                </div>
                <div className="text-xs text-muted-foreground">Open Trades</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">
                  {validationStatus.stats.historyCount}
                </div>
                <div className="text-xs text-muted-foreground">History Records</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">
                  ${validationStatus.stats.accountBalance.toFixed(0)}
                </div>
                <div className="text-xs text-muted-foreground">Account Balance</div>
              </div>
            </div>

            {/* Validation Errors */}
            {validationStatus.errors.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-red-600">Issues Found:</div>
                <div className="space-y-1">
                  {validationStatus.errors.map((error, index) => (
                    <div key={index} className="text-xs text-red-600 bg-red-50 p-2 rounded">
                      • {error}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="text-xs text-muted-foreground">
              Last checked: {validationStatus.lastChecked.toLocaleTimeString()}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button 
            onClick={runValidation}
            disabled={isValidating}
            size="sm"
            variant="outline"
            className="flex items-center gap-2"
          >
            {isValidating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            {isValidating ? 'Validating...' : 'Run Check'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ResetValidationPanel;