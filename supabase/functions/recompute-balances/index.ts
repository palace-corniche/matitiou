import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type RecomputeScope = {
  scope?: "global" | "portfolios" | "all";
  portfolioId?: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = (await req.json().catch(() => ({}))) as RecomputeScope;
    const scope = body.scope ?? "all";
    const GLOBAL_ID = "00000000-0000-0000-0000-000000000001";

    // Step 1: Recompute closed trade PnL on shadow_trades (authoritative)
    const recomputeClosedTrades = async () => {
      const { data: closedTrades, error: closedErr } = await supabase
        .from("shadow_trades")
        .select(
          "id, entry_price, exit_price, trade_type, lot_size, commission, swap, pnl, profit_pips, status"
        )
        .eq("status", "closed");
      if (closedErr) throw closedErr;

      let updated = 0;
      let checked = 0;

      if (closedTrades) {
        for (const t of closedTrades) {
          checked++;
          if (t.exit_price == null) continue;
          const pipDiff = t.trade_type === "buy"
            ? (Number(t.exit_price) - Number(t.entry_price)) / 0.0001
            : (Number(t.entry_price) - Number(t.exit_price)) / 0.0001;
          const pipValue = Number(t.lot_size) * 10;
          const gross = pipDiff * pipValue;
          const commission = Number(t.commission ?? Number(t.lot_size) * 0.5);
          const swap = Number(t.swap ?? 0);
          const net = gross - commission - swap;

          const pipsChanged = Math.abs((t.profit_pips ?? 0) - pipDiff) > 0.1;
          const pnlChanged = Math.abs((t.pnl ?? 0) - net) > 0.01;
          if (pipsChanged || pnlChanged) {
            const { error: upErr } = await supabase
              .from("shadow_trades")
              .update({ profit_pips: pipDiff, pnl: net, profit: gross, commission, swap })
              .eq("id", t.id);
            if (upErr) throw upErr;
            updated++;
          }
        }
      }
      return { checked, updated };
    };

    // Step 2: Rebuild balances from trade_history in chronological order
    const rebuildBalancesFor = async (portfolioId: string) => {
      // Get current account to determine defaults
      let balanceBefore = 0;
      let equityBefore = 0;
      let used_margin = 0;

      if (portfolioId === GLOBAL_ID) {
        const { data: acct, error: acctErr } = await supabase
          .from("global_trading_account")
          .select("id, balance, equity, used_margin")
          .eq("id", GLOBAL_ID)
          .single();
        if (acctErr) throw acctErr;
        balanceBefore = Number(acct.balance ?? 0);
        equityBefore = Number(acct.equity ?? balanceBefore);
        used_margin = Number(acct.used_margin ?? 0);
      } else {
        const { data: p, error: pErr } = await supabase
          .from("shadow_portfolios")
          .select("id, balance, equity, used_margin")
          .eq("id", portfolioId)
          .single();
        if (pErr) throw pErr;
        balanceBefore = Number(p.balance ?? 0);
        equityBefore = Number(p.equity ?? balanceBefore);
        used_margin = Number(p.used_margin ?? 0);
      }

      // Fetch history
      const { data: history, error: histErr } = await supabase
        .from("trade_history")
        .select(
          "id, profit, execution_time, balance_before, balance_after, equity_before, equity_after"
        )
        .eq("portfolio_id", portfolioId)
        .order("execution_time", { ascending: true });
      if (histErr) throw histErr;

      if (!history || history.length === 0) {
        // If no history, set equity consistent with balance
        const finalBalance = balanceBefore;
        const finalEquity = finalBalance; // floating pnl considered 0 here
        if (portfolioId === GLOBAL_ID) {
          await supabase
            .from("global_trading_account")
            .update({
              balance: finalBalance,
              equity: finalEquity,
              free_margin: finalEquity - used_margin,
              margin_level: used_margin > 0 ? (finalEquity * 100.0) / used_margin : 0,
              updated_at: new Date().toISOString(),
            })
            .eq("id", GLOBAL_ID);
        } else {
          await supabase
            .from("shadow_portfolios")
            .update({
              balance: finalBalance,
              equity: finalEquity,
              free_margin: finalEquity - used_margin,
              margin_level: used_margin > 0 ? (finalEquity * 100.0) / used_margin : 0,
              updated_at: new Date().toISOString(),
            })
            .eq("id", portfolioId);
        }
        return { rows: 0, fixed: 0, startBalance: finalBalance, endBalance: finalBalance };
      }

      // Determine starting balance from first row if present
      let runningBalance =
        history[0].balance_before != null
          ? Number(history[0].balance_before)
          : balanceBefore;
      let fixed = 0;

      // Fix the first row if needed
      if (
        history[0].balance_before == null ||
        Math.abs(Number(history[0].balance_before) - runningBalance) > 0.01
      ) {
        const { error: upFirst } = await supabase
          .from("trade_history")
          .update({ balance_before: runningBalance, equity_before: runningBalance })
          .eq("id", history[0].id);
        if (upFirst) throw upFirst;
        fixed++;
      }

      // Iterate and fix each row's after/before fields
      for (let i = 0; i < history.length; i++) {
        const row = history[i];
        const profit = Number(row.profit ?? 0);
        const expectedAfter = runningBalance + profit;
        const needFix =
          Math.abs((row.balance_after ?? NaN) - expectedAfter) > 0.01 ||
          row.balance_after == null ||
          row.equity_after == null ||
          Math.abs((row.equity_after ?? NaN) - expectedAfter) > 0.01;

        if (needFix) {
          const { error: upErr } = await supabase
            .from("trade_history")
            .update({
              balance_before: runningBalance,
              balance_after: expectedAfter,
              equity_before: runningBalance,
              equity_after: expectedAfter,
            })
            .eq("id", row.id);
          if (upErr) throw upErr;
          fixed++;
        }
        runningBalance = expectedAfter;

        // Also ensure next row's balance_before equals current runningBalance
        if (i + 1 < history.length) {
          const next = history[i + 1];
          if (
            next.balance_before == null ||
            Math.abs(Number(next.balance_before) - runningBalance) > 0.01
          ) {
            const { error: upNext } = await supabase
              .from("trade_history")
              .update({ balance_before: runningBalance, equity_before: runningBalance })
              .eq("id", next.id);
            if (upNext) throw upNext;
            fixed++;
          }
        }
      }

      // Update final account balances
      if (portfolioId === GLOBAL_ID) {
        const { error: upAcc } = await supabase
          .from("global_trading_account")
          .update({
            balance: runningBalance,
            equity: runningBalance,
            free_margin: runningBalance - used_margin,
            margin_level: used_margin > 0 ? (runningBalance * 100.0) / used_margin : 0,
            updated_at: new Date().toISOString(),
          })
          .eq("id", GLOBAL_ID);
        if (upAcc) throw upAcc;
      } else {
        const { error: upPort } = await supabase
          .from("shadow_portfolios")
          .update({
            balance: runningBalance,
            equity: runningBalance,
            free_margin: runningBalance - used_margin,
            margin_level: used_margin > 0 ? (runningBalance * 100.0) / used_margin : 0,
            updated_at: new Date().toISOString(),
          })
          .eq("id", portfolioId);
        if (upPort) throw upPort;
      }

      return {
        rows: history.length,
        fixed,
        startBalance: Number(history[0].balance_before ?? balanceBefore),
        endBalance: runningBalance,
      };
    };

    const recomputeRes = await recomputeClosedTrades();

    const summaries: any[] = [];
    if (scope === "global" || scope === "all") {
      summaries.push({ scope: "global", ...(await rebuildBalancesFor(GLOBAL_ID)) });
    }

    if (scope === "portfolios" || scope === "all") {
      const { data: portRows, error: portsErr } = await supabase
        .from("trade_history")
        .select("portfolio_id")
        .not("portfolio_id", "is", null)
        .neq("portfolio_id", GLOBAL_ID);
      if (portsErr) throw portsErr;
      const ids = Array.from(
        new Set((portRows ?? []).map((r: any) => r.portfolio_id))
      );
      for (const pid of ids) {
        summaries.push({ scope: "portfolio", portfolioId: pid, ...(await rebuildBalancesFor(pid)) });
      }
    }

    // Recompute simple performance stats for global account
    const { data: closed, error: closedErr2 } = await supabase
      .from("shadow_trades")
      .select("pnl")
      .eq("status", "closed");
    if (closedErr2) throw closedErr2;
    const totalTrades = closed?.length ?? 0;
    const wins = (closed ?? []).filter((t: any) => Number(t.pnl ?? 0) > 0).length;
    const losses = totalTrades - wins;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

    const report = {
      success: true,
      recomputedTrades: recomputeRes,
      balanceRebuild: summaries,
      performance: { totalTrades, wins, losses, winRate },
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("recompute-balances error", e);
    return new Response(JSON.stringify({ success: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
