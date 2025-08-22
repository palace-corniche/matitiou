import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Minus, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DepositWithdrawDialogProps {
  portfolioId: string;
  currentBalance: number;
  currentEquity: number;
  accountCurrency: string;
  onTransactionComplete: () => void;
}

const DepositWithdrawDialog: React.FC<DepositWithdrawDialogProps> = ({
  portfolioId,
  currentBalance,
  currentEquity,
  accountCurrency,
  onTransactionComplete
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const { toast } = useToast();

  const currencySymbol = {
    'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥',
    'CHF': 'Fr', 'CAD': 'C$', 'AUD': 'A$'
  }[accountCurrency] || '$';

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid deposit amount.",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);

      // Add transaction record
      const { error: transactionError } = await supabase
        .from('account_transactions')
        .insert({
          portfolio_id: portfolioId,
          transaction_type: 'deposit',
          amount: amount,
          currency: accountCurrency,
          amount_in_account_currency: amount,
          description: `Manual deposit of ${currencySymbol}${amount.toLocaleString()}`
        });

      if (transactionError) throw transactionError;

      // Update portfolio balance and equity
      const newBalance = currentBalance + amount;
      const balanceChange = amount;
      const newEquity = currentEquity + amount;

      const { error: portfolioError } = await supabase
        .from('shadow_portfolios')
        .update({
          balance: newBalance,
          equity: newEquity,
          deposits_total: currentBalance + amount, // Will be updated with new total
          updated_at: new Date().toISOString()
        })
        .eq('id', portfolioId);

      if (portfolioError) throw portfolioError;

      toast({
        title: "Deposit Successful",
        description: `${currencySymbol}${amount.toLocaleString()} has been deposited to your account.`
      });

      setDepositAmount('');
      onTransactionComplete();
      setOpen(false);
    } catch (error) {
      console.error('Error processing deposit:', error);
      toast({
        title: "Deposit Failed",
        description: "Failed to process deposit. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid withdrawal amount.",
        variant: "destructive"
      });
      return;
    }

    if (amount > currentBalance) {
      toast({
        title: "Insufficient Funds",
        description: "Withdrawal amount exceeds available balance.",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);

      // Add transaction record
      const { error: transactionError } = await supabase
        .from('account_transactions')
        .insert({
          portfolio_id: portfolioId,
          transaction_type: 'withdrawal',
          amount: -amount,
          currency: accountCurrency,
          amount_in_account_currency: -amount,
          description: `Manual withdrawal of ${currencySymbol}${amount.toLocaleString()}`
        });

      if (transactionError) throw transactionError;

      // Update portfolio balance and equity
      const newBalance = currentBalance - amount;
      const newEquity = currentEquity - amount;

      const { error: portfolioError } = await supabase
        .from('shadow_portfolios')
        .update({
          balance: newBalance,
          equity: newEquity,
          withdrawals_total: currentBalance - amount, // Will be updated with new total
          updated_at: new Date().toISOString()
        })
        .eq('id', portfolioId);

      if (portfolioError) throw portfolioError;

      toast({
        title: "Withdrawal Successful",
        description: `${currencySymbol}${amount.toLocaleString()} has been withdrawn from your account.`
      });

      setWithdrawAmount('');
      onTransactionComplete();
      setOpen(false);
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      toast({
        title: "Withdrawal Failed",
        description: "Failed to process withdrawal. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const quickAmounts = [100, 500, 1000, 5000, 10000];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <DollarSign className="h-4 w-4 mr-2" />
          Deposit/Withdraw
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Account Funding
          </DialogTitle>
        </DialogHeader>

        {/* Account Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Account Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Balance:</span>
              <span className="font-medium">
                {currencySymbol}{currentBalance.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Equity:</span>
              <span className="font-medium">
                {currencySymbol}{currentEquity.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">P&L:</span>
              <span className={`font-medium ${(currentEquity - currentBalance) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {currencySymbol}{(currentEquity - currentBalance).toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="deposit" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="deposit" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Deposit
            </TabsTrigger>
            <TabsTrigger value="withdraw" className="flex items-center gap-2">
              <Minus className="h-4 w-4" />
              Withdraw
            </TabsTrigger>
          </TabsList>

          <TabsContent value="deposit" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-green-600">
                  <TrendingUp className="h-4 w-4" />
                  Add Funds
                </CardTitle>
                <CardDescription>
                  Increase your trading capital
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="deposit-amount">Deposit Amount</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-lg font-medium">{currencySymbol}</span>
                    <Input
                      id="deposit-amount"
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-sm">Quick Amounts</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {quickAmounts.map(amount => (
                      <Badge
                        key={amount}
                        variant="outline"
                        className="cursor-pointer hover:bg-green-50 hover:border-green-300"
                        onClick={() => setDepositAmount(amount.toString())}
                      >
                        {currencySymbol}{amount.toLocaleString()}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Button 
                  onClick={handleDeposit} 
                  disabled={loading || !depositAmount}
                  className="w-full"
                >
                  {loading ? 'Processing...' : `Deposit ${depositAmount ? currencySymbol + parseFloat(depositAmount).toLocaleString() : ''}`}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="withdraw" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-red-600">
                  <TrendingDown className="h-4 w-4" />
                  Withdraw Funds
                </CardTitle>
                <CardDescription>
                  Remove funds from your account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="withdraw-amount">Withdrawal Amount</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-lg font-medium">{currencySymbol}</span>
                    <Input
                      id="withdraw-amount"
                      type="number"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="0.00"
                      min="0"
                      max={currentBalance}
                      step="0.01"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Maximum: {currencySymbol}{currentBalance.toLocaleString()}
                  </p>
                </div>

                <div>
                  <Label className="text-sm">Quick Amounts</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {quickAmounts
                      .filter(amount => amount <= currentBalance)
                      .map(amount => (
                        <Badge
                          key={amount}
                          variant="outline"
                          className="cursor-pointer hover:bg-red-50 hover:border-red-300"
                          onClick={() => setWithdrawAmount(amount.toString())}
                        >
                          {currencySymbol}{amount.toLocaleString()}
                        </Badge>
                      ))}
                    <Badge
                      variant="outline"
                      className="cursor-pointer hover:bg-red-50 hover:border-red-300"
                      onClick={() => setWithdrawAmount(currentBalance.toString())}
                    >
                      All ({currencySymbol}{currentBalance.toLocaleString()})
                    </Badge>
                  </div>
                </div>

                <Button 
                  onClick={handleWithdraw} 
                  disabled={loading || !withdrawAmount}
                  variant="destructive"
                  className="w-full"
                >
                  {loading ? 'Processing...' : `Withdraw ${withdrawAmount ? currencySymbol + parseFloat(withdrawAmount).toLocaleString() : ''}`}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default DepositWithdrawDialog;