export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      account_defaults: {
        Row: {
          allowed_symbols: string[]
          auto_lot_sizing: boolean
          auto_sl_tp: boolean
          blacklist_symbols: string[]
          caution_threshold: number | null
          created_at: string
          default_lot_size: number
          default_sl_pips: number
          default_tp_pips: number
          force_exit_threshold: number | null
          id: string
          max_open_trades: number
          max_spread_pips: number
          max_tp_pips: number | null
          min_signal_quality: number
          portfolio_id: string
          risk_per_trade_percent: number
          trading_end_hour: number
          trading_hours_enabled: boolean
          trading_start_hour: number
          updated_at: string
          use_intelligent_exit: boolean | null
        }
        Insert: {
          allowed_symbols?: string[]
          auto_lot_sizing?: boolean
          auto_sl_tp?: boolean
          blacklist_symbols?: string[]
          caution_threshold?: number | null
          created_at?: string
          default_lot_size?: number
          default_sl_pips?: number
          default_tp_pips?: number
          force_exit_threshold?: number | null
          id?: string
          max_open_trades?: number
          max_spread_pips?: number
          max_tp_pips?: number | null
          min_signal_quality?: number
          portfolio_id: string
          risk_per_trade_percent?: number
          trading_end_hour?: number
          trading_hours_enabled?: boolean
          trading_start_hour?: number
          updated_at?: string
          use_intelligent_exit?: boolean | null
        }
        Update: {
          allowed_symbols?: string[]
          auto_lot_sizing?: boolean
          auto_sl_tp?: boolean
          blacklist_symbols?: string[]
          caution_threshold?: number | null
          created_at?: string
          default_lot_size?: number
          default_sl_pips?: number
          default_tp_pips?: number
          force_exit_threshold?: number | null
          id?: string
          max_open_trades?: number
          max_spread_pips?: number
          max_tp_pips?: number | null
          min_signal_quality?: number
          portfolio_id?: string
          risk_per_trade_percent?: number
          trading_end_hour?: number
          trading_hours_enabled?: boolean
          trading_start_hour?: number
          updated_at?: string
          use_intelligent_exit?: boolean | null
        }
        Relationships: []
      }
      account_history: {
        Row: {
          action_type: string
          amount: number
          balance_after: number
          balance_before: number
          created_at: string | null
          currency: string
          description: string | null
          exchange_rate: number | null
          id: string
          payment_method: string | null
          portfolio_id: string | null
          processed_at: string | null
          processed_by: string | null
          reference_number: string | null
          status: string | null
          transaction_fee: number | null
        }
        Insert: {
          action_type: string
          amount: number
          balance_after: number
          balance_before: number
          created_at?: string | null
          currency?: string
          description?: string | null
          exchange_rate?: number | null
          id?: string
          payment_method?: string | null
          portfolio_id?: string | null
          processed_at?: string | null
          processed_by?: string | null
          reference_number?: string | null
          status?: string | null
          transaction_fee?: number | null
        }
        Update: {
          action_type?: string
          amount?: number
          balance_after?: number
          balance_before?: number
          created_at?: string | null
          currency?: string
          description?: string | null
          exchange_rate?: number | null
          id?: string
          payment_method?: string | null
          portfolio_id?: string | null
          processed_at?: string | null
          processed_by?: string | null
          reference_number?: string | null
          status?: string | null
          transaction_fee?: number | null
        }
        Relationships: []
      }
      account_transactions: {
        Row: {
          amount: number
          amount_in_account_currency: number
          created_at: string
          currency: string
          description: string | null
          exchange_rate: number | null
          id: string
          portfolio_id: string
          reference_id: string | null
          transaction_type: string
          updated_at: string
        }
        Insert: {
          amount: number
          amount_in_account_currency: number
          created_at?: string
          currency?: string
          description?: string | null
          exchange_rate?: number | null
          id?: string
          portfolio_id: string
          reference_id?: string | null
          transaction_type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          amount_in_account_currency?: number
          created_at?: string
          currency?: string
          description?: string | null
          exchange_rate?: number | null
          id?: string
          portfolio_id?: string
          reference_id?: string | null
          transaction_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      adaptive_thresholds: {
        Row: {
          confluence_adaptive: number
          confluence_min: number
          created_at: string
          edge_adaptive: number
          edge_min: number
          entropy_current: number
          entropy_max: number
          entropy_min: number
          id: string
          last_adaptation: string
          probability_buy: number
          probability_sell: number
          updated_at: string
        }
        Insert: {
          confluence_adaptive?: number
          confluence_min?: number
          created_at?: string
          edge_adaptive?: number
          edge_min?: number
          entropy_current?: number
          entropy_max?: number
          entropy_min?: number
          id?: string
          last_adaptation?: string
          probability_buy?: number
          probability_sell?: number
          updated_at?: string
        }
        Update: {
          confluence_adaptive?: number
          confluence_min?: number
          created_at?: string
          edge_adaptive?: number
          edge_min?: number
          entropy_current?: number
          entropy_max?: number
          entropy_min?: number
          id?: string
          last_adaptation?: string
          probability_buy?: number
          probability_sell?: number
          updated_at?: string
        }
        Relationships: []
      }
      aggregated_candles: {
        Row: {
          close_price: number
          created_at: string
          high_price: number
          id: string
          is_complete: boolean
          low_price: number
          open_price: number
          symbol: string
          tick_count: number
          timeframe: string
          timestamp: string
          updated_at: string
          volume: number
        }
        Insert: {
          close_price: number
          created_at?: string
          high_price: number
          id?: string
          is_complete?: boolean
          low_price: number
          open_price: number
          symbol?: string
          tick_count?: number
          timeframe: string
          timestamp: string
          updated_at?: string
          volume?: number
        }
        Update: {
          close_price?: number
          created_at?: string
          high_price?: number
          id?: string
          is_complete?: boolean
          low_price?: number
          open_price?: number
          symbol?: string
          tick_count?: number
          timeframe?: string
          timestamp?: string
          updated_at?: string
          volume?: number
        }
        Relationships: []
      }
      ai_recommendations: {
        Row: {
          action: string
          confidence_score: number
          created_at: string
          data_sources: Json
          executed_at: string | null
          expires_at: string | null
          id: string
          metrics: Json | null
          priority: string
          reasoning: string
          recommendation_type: string
          status: string
          updated_at: string
        }
        Insert: {
          action: string
          confidence_score: number
          created_at?: string
          data_sources?: Json
          executed_at?: string | null
          expires_at?: string | null
          id?: string
          metrics?: Json | null
          priority?: string
          reasoning: string
          recommendation_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          action?: string
          confidence_score?: number
          created_at?: string
          data_sources?: Json
          executed_at?: string | null
          expires_at?: string | null
          id?: string
          metrics?: Json | null
          priority?: string
          reasoning?: string
          recommendation_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      analysis_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          current_step: string | null
          dataset_id: string
          error_logs: string[] | null
          id: string
          progress: number
          results: Json | null
          session_id: string | null
          started_at: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_step?: string | null
          dataset_id: string
          error_logs?: string[] | null
          id?: string
          progress?: number
          results?: Json | null
          session_id?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_step?: string | null
          dataset_id?: string
          error_logs?: string[] | null
          id?: string
          progress?: number
          results?: Json | null
          session_id?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analysis_jobs_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_correlations: {
        Row: {
          asset_1: string
          asset_2: string
          correlation_strength: string | null
          correlation_value: number | null
          created_at: string | null
          id: string
          timeframe: string | null
          updated_at: string | null
        }
        Insert: {
          asset_1: string
          asset_2: string
          correlation_strength?: string | null
          correlation_value?: number | null
          created_at?: string | null
          id?: string
          timeframe?: string | null
          updated_at?: string | null
        }
        Update: {
          asset_1?: string
          asset_2?: string
          correlation_strength?: string | null
          correlation_value?: number | null
          created_at?: string | null
          id?: string
          timeframe?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      automated_trading_rules: {
        Row: {
          confidence_threshold: number | null
          created_at: string | null
          execution_parameters: Json
          id: string
          is_active: boolean | null
          max_position_size: number | null
          portfolio_id: string
          rule_name: string
          rule_type: string
          stop_loss_percent: number | null
          take_profit_percent: number | null
          trigger_conditions: Json
        }
        Insert: {
          confidence_threshold?: number | null
          created_at?: string | null
          execution_parameters: Json
          id?: string
          is_active?: boolean | null
          max_position_size?: number | null
          portfolio_id: string
          rule_name: string
          rule_type: string
          stop_loss_percent?: number | null
          take_profit_percent?: number | null
          trigger_conditions: Json
        }
        Update: {
          confidence_threshold?: number | null
          created_at?: string | null
          execution_parameters?: Json
          id?: string
          is_active?: boolean | null
          max_position_size?: number | null
          portfolio_id?: string
          rule_name?: string
          rule_type?: string
          stop_loss_percent?: number | null
          take_profit_percent?: number | null
          trigger_conditions?: Json
        }
        Relationships: []
      }
      calibration_audit: {
        Row: {
          action: string
          best_sharpe_ratio: number | null
          best_win_rate: number | null
          calibration_duration_ms: number | null
          created_at: string
          id: string
          metadata: Json | null
          module_id: string
          parameters_tested: number | null
          timeframe: string
        }
        Insert: {
          action: string
          best_sharpe_ratio?: number | null
          best_win_rate?: number | null
          calibration_duration_ms?: number | null
          created_at?: string
          id?: string
          metadata?: Json | null
          module_id: string
          parameters_tested?: number | null
          timeframe: string
        }
        Update: {
          action?: string
          best_sharpe_ratio?: number | null
          best_win_rate?: number | null
          calibration_duration_ms?: number | null
          created_at?: string
          id?: string
          metadata?: Json | null
          module_id?: string
          parameters_tested?: number | null
          timeframe?: string
        }
        Relationships: []
      }
      calibration_results: {
        Row: {
          calibration_period: Json
          created_at: string
          id: string
          module_id: string
          parameters: Json
          performance_metrics: Json
          symbol: string
          timeframe: string
          updated_at: string
          version: string
        }
        Insert: {
          calibration_period: Json
          created_at?: string
          id?: string
          module_id: string
          parameters: Json
          performance_metrics: Json
          symbol?: string
          timeframe: string
          updated_at?: string
          version?: string
        }
        Update: {
          calibration_period?: Json
          created_at?: string
          id?: string
          module_id?: string
          parameters?: Json
          performance_metrics?: Json
          symbol?: string
          timeframe?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      correlations: {
        Row: {
          asset_a: string
          asset_b: string
          calculation_date: string
          correlation_value: number
          created_at: string | null
          id: string
          sample_size: number | null
          timeframe: string | null
          updated_at: string | null
          window_period: string | null
        }
        Insert: {
          asset_a: string
          asset_b: string
          calculation_date?: string
          correlation_value: number
          created_at?: string | null
          id?: string
          sample_size?: number | null
          timeframe?: string | null
          updated_at?: string | null
          window_period?: string | null
        }
        Update: {
          asset_a?: string
          asset_b?: string
          calculation_date?: string
          correlation_value?: number
          created_at?: string | null
          id?: string
          sample_size?: number | null
          timeframe?: string | null
          updated_at?: string | null
          window_period?: string | null
        }
        Relationships: []
      }
      cot_reports: {
        Row: {
          commercial_long: number | null
          commercial_short: number | null
          created_at: string | null
          id: string
          large_traders_long: number | null
          large_traders_short: number | null
          net_long: number | null
          net_short: number | null
          pair: string
          report_date: string
          retail_long: number | null
          retail_short: number | null
          updated_at: string | null
        }
        Insert: {
          commercial_long?: number | null
          commercial_short?: number | null
          created_at?: string | null
          id?: string
          large_traders_long?: number | null
          large_traders_short?: number | null
          net_long?: number | null
          net_short?: number | null
          pair?: string
          report_date: string
          retail_long?: number | null
          retail_short?: number | null
          updated_at?: string | null
        }
        Update: {
          commercial_long?: number | null
          commercial_short?: number | null
          created_at?: string | null
          id?: string
          large_traders_long?: number | null
          large_traders_short?: number | null
          net_long?: number | null
          net_short?: number | null
          pair?: string
          report_date?: string
          retail_long?: number | null
          retail_short?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      datasets: {
        Row: {
          created_at: string
          file_name: string
          file_size: number
          file_type: string
          id: string
          metadata: Json | null
          name: string
          session_id: string | null
          status: string
          storage_path: string
          updated_at: string
          upload_date: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size: number
          file_type: string
          id?: string
          metadata?: Json | null
          name: string
          session_id?: string | null
          status?: string
          storage_path: string
          updated_at?: string
          upload_date?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          metadata?: Json | null
          name?: string
          session_id?: string | null
          status?: string
          storage_path?: string
          updated_at?: string
          upload_date?: string
          user_id?: string | null
        }
        Relationships: []
      }
      discovered_patterns: {
        Row: {
          avg_pips: number | null
          avg_return_percent: number | null
          confidence: number
          created_at: string | null
          deployed: boolean | null
          deployed_at: string | null
          id: string
          last_tested_at: string | null
          pattern_name: string
          pattern_rules: Json
          pattern_type: string
          profit_factor: number | null
          sample_size: number
          win_rate: number
        }
        Insert: {
          avg_pips?: number | null
          avg_return_percent?: number | null
          confidence: number
          created_at?: string | null
          deployed?: boolean | null
          deployed_at?: string | null
          id?: string
          last_tested_at?: string | null
          pattern_name: string
          pattern_rules?: Json
          pattern_type: string
          profit_factor?: number | null
          sample_size: number
          win_rate: number
        }
        Update: {
          avg_pips?: number | null
          avg_return_percent?: number | null
          confidence?: number
          created_at?: string | null
          deployed?: boolean | null
          deployed_at?: string | null
          id?: string
          last_tested_at?: string | null
          pattern_name?: string
          pattern_rules?: Json
          pattern_type?: string
          profit_factor?: number | null
          sample_size?: number
          win_rate?: number
        }
        Relationships: []
      }
      ea_logs: {
        Row: {
          created_at: string | null
          ea_name: string
          execution_time_ms: number | null
          id: string
          log_level: string
          memory_usage_kb: number | null
          message: string
          portfolio_id: string
          symbol: string | null
          trade_id: string | null
        }
        Insert: {
          created_at?: string | null
          ea_name: string
          execution_time_ms?: number | null
          id?: string
          log_level: string
          memory_usage_kb?: number | null
          message: string
          portfolio_id: string
          symbol?: string | null
          trade_id?: string | null
        }
        Update: {
          created_at?: string | null
          ea_name?: string
          execution_time_ms?: number | null
          id?: string
          log_level?: string
          memory_usage_kb?: number | null
          message?: string
          portfolio_id?: string
          symbol?: string | null
          trade_id?: string | null
        }
        Relationships: []
      }
      economic_calendar: {
        Row: {
          actual_value: string | null
          affected_instruments: string[] | null
          created_at: string | null
          currency: string
          description: string | null
          event_name: string
          event_time: string
          forecast_value: string | null
          id: string
          impact: string | null
          impact_level: string
          is_active: boolean | null
          previous_value: string | null
          updated_at: string | null
        }
        Insert: {
          actual_value?: string | null
          affected_instruments?: string[] | null
          created_at?: string | null
          currency: string
          description?: string | null
          event_name: string
          event_time: string
          forecast_value?: string | null
          id?: string
          impact?: string | null
          impact_level: string
          is_active?: boolean | null
          previous_value?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_value?: string | null
          affected_instruments?: string[] | null
          created_at?: string | null
          currency?: string
          description?: string | null
          event_name?: string
          event_time?: string
          forecast_value?: string | null
          id?: string
          impact?: string | null
          impact_level?: string
          is_active?: boolean | null
          previous_value?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      economic_events: {
        Row: {
          actual_value: string | null
          country: string
          created_at: string | null
          currency: string
          event_name: string
          event_time: string
          forecast_value: string | null
          id: string
          impact_level: string | null
          previous_value: string | null
          symbol_impact: string[] | null
          updated_at: string | null
          volatility_impact: number | null
        }
        Insert: {
          actual_value?: string | null
          country: string
          created_at?: string | null
          currency: string
          event_name: string
          event_time: string
          forecast_value?: string | null
          id?: string
          impact_level?: string | null
          previous_value?: string | null
          symbol_impact?: string[] | null
          updated_at?: string | null
          volatility_impact?: number | null
        }
        Update: {
          actual_value?: string | null
          country?: string
          created_at?: string | null
          currency?: string
          event_name?: string
          event_time?: string
          forecast_value?: string | null
          id?: string
          impact_level?: string | null
          previous_value?: string | null
          symbol_impact?: string[] | null
          updated_at?: string | null
          volatility_impact?: number | null
        }
        Relationships: []
      }
      elliott_waves: {
        Row: {
          completion_level: number | null
          confidence: number | null
          created_at: string | null
          end_price: number
          end_time: string
          entry_zone_high: number | null
          entry_zone_low: number | null
          id: string
          pattern_type: string | null
          start_price: number
          start_time: string
          status: string | null
          symbol: string
          target_1: number | null
          target_2: number | null
          timeframe: string
          updated_at: string | null
          wave_degree: string
          wave_label: string
          wave_score: number | null
        }
        Insert: {
          completion_level?: number | null
          confidence?: number | null
          created_at?: string | null
          end_price: number
          end_time: string
          entry_zone_high?: number | null
          entry_zone_low?: number | null
          id?: string
          pattern_type?: string | null
          start_price: number
          start_time: string
          status?: string | null
          symbol?: string
          target_1?: number | null
          target_2?: number | null
          timeframe?: string
          updated_at?: string | null
          wave_degree: string
          wave_label: string
          wave_score?: number | null
        }
        Update: {
          completion_level?: number | null
          confidence?: number | null
          created_at?: string | null
          end_price?: number
          end_time?: string
          entry_zone_high?: number | null
          entry_zone_low?: number | null
          id?: string
          pattern_type?: string | null
          start_price?: number
          start_time?: string
          status?: string | null
          symbol?: string
          target_1?: number | null
          target_2?: number | null
          timeframe?: string
          updated_at?: string | null
          wave_degree?: string
          wave_label?: string
          wave_score?: number | null
        }
        Relationships: []
      }
      exit_intelligence: {
        Row: {
          check_timestamp: string | null
          created_at: string | null
          current_price: number
          factors: Json
          holding_time_minutes: number | null
          id: string
          overall_score: number
          reasoning: string | null
          recommendation: string | null
          trade_id: string | null
        }
        Insert: {
          check_timestamp?: string | null
          created_at?: string | null
          current_price: number
          factors: Json
          holding_time_minutes?: number | null
          id?: string
          overall_score: number
          reasoning?: string | null
          recommendation?: string | null
          trade_id?: string | null
        }
        Update: {
          check_timestamp?: string | null
          created_at?: string | null
          current_price?: number
          factors?: Json
          holding_time_minutes?: number | null
          id?: string
          overall_score?: number
          reasoning?: string | null
          recommendation?: string | null
          trade_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exit_intelligence_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "shadow_trades"
            referencedColumns: ["id"]
          },
        ]
      }
      fibonacci_confluence_zones: {
        Row: {
          bounce_rate: number | null
          bounces: number | null
          breaks: number | null
          confluence_count: number
          confluence_score: number
          created_at: string | null
          fib_levels: Json
          id: string
          last_tested_at: string | null
          status: string | null
          symbol: string
          timeframe: string
          timeframe_alignment: number
          touches: number | null
          updated_at: string | null
          zone_price: number
          zone_range_high: number
          zone_range_low: number
          zone_type: string
        }
        Insert: {
          bounce_rate?: number | null
          bounces?: number | null
          breaks?: number | null
          confluence_count?: number
          confluence_score?: number
          created_at?: string | null
          fib_levels: Json
          id?: string
          last_tested_at?: string | null
          status?: string | null
          symbol?: string
          timeframe: string
          timeframe_alignment?: number
          touches?: number | null
          updated_at?: string | null
          zone_price: number
          zone_range_high: number
          zone_range_low: number
          zone_type: string
        }
        Update: {
          bounce_rate?: number | null
          bounces?: number | null
          breaks?: number | null
          confluence_count?: number
          confluence_score?: number
          created_at?: string | null
          fib_levels?: Json
          id?: string
          last_tested_at?: string | null
          status?: string | null
          symbol?: string
          timeframe?: string
          timeframe_alignment?: number
          touches?: number | null
          updated_at?: string | null
          zone_price?: number
          zone_range_high?: number
          zone_range_low?: number
          zone_type?: string
        }
        Relationships: []
      }
      function_execution_locks: {
        Row: {
          completed_at: string | null
          created_at: string | null
          function_name: string
          id: string
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          function_name: string
          id?: string
          started_at?: string | null
          status: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          function_name?: string
          id?: string
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      global_trading_account: {
        Row: {
          auto_trading_enabled: boolean
          average_loss: number
          average_win: number
          balance: number
          consecutive_losses: number
          consecutive_wins: number
          created_at: string
          current_drawdown: number
          equity: number
          floating_pnl: number
          free_margin: number
          id: string
          largest_loss: number
          largest_win: number
          leverage: number
          losing_trades: number
          margin: number
          margin_level: number
          max_drawdown: number
          max_equity: number
          max_open_positions: number
          peak_balance: number
          profit_factor: number
          sharpe_ratio: number
          total_commission: number
          total_swap: number
          total_trades: number
          updated_at: string
          used_margin: number
          win_rate: number
          winning_trades: number
        }
        Insert: {
          auto_trading_enabled?: boolean
          average_loss?: number
          average_win?: number
          balance?: number
          consecutive_losses?: number
          consecutive_wins?: number
          created_at?: string
          current_drawdown?: number
          equity?: number
          floating_pnl?: number
          free_margin?: number
          id?: string
          largest_loss?: number
          largest_win?: number
          leverage?: number
          losing_trades?: number
          margin?: number
          margin_level?: number
          max_drawdown?: number
          max_equity?: number
          max_open_positions?: number
          peak_balance?: number
          profit_factor?: number
          sharpe_ratio?: number
          total_commission?: number
          total_swap?: number
          total_trades?: number
          updated_at?: string
          used_margin?: number
          win_rate?: number
          winning_trades?: number
        }
        Update: {
          auto_trading_enabled?: boolean
          average_loss?: number
          average_win?: number
          balance?: number
          consecutive_losses?: number
          consecutive_wins?: number
          created_at?: string
          current_drawdown?: number
          equity?: number
          floating_pnl?: number
          free_margin?: number
          id?: string
          largest_loss?: number
          largest_win?: number
          leverage?: number
          losing_trades?: number
          margin?: number
          margin_level?: number
          max_drawdown?: number
          max_equity?: number
          max_open_positions?: number
          peak_balance?: number
          profit_factor?: number
          sharpe_ratio?: number
          total_commission?: number
          total_swap?: number
          total_trades?: number
          updated_at?: string
          used_margin?: number
          win_rate?: number
          winning_trades?: number
        }
        Relationships: []
      }
      harmonic_prz: {
        Row: {
          activated_at: string | null
          completion_level: number | null
          confidence: number | null
          created_at: string | null
          detected_at: string
          id: string
          invalidated_at: string | null
          pattern: string
          pattern_score: number | null
          prz_high: number
          prz_low: number
          status: string | null
          symbol: string
          timeframe: string | null
          updated_at: string | null
        }
        Insert: {
          activated_at?: string | null
          completion_level?: number | null
          confidence?: number | null
          created_at?: string | null
          detected_at?: string
          id?: string
          invalidated_at?: string | null
          pattern: string
          pattern_score?: number | null
          prz_high: number
          prz_low: number
          status?: string | null
          symbol?: string
          timeframe?: string | null
          updated_at?: string | null
        }
        Update: {
          activated_at?: string | null
          completion_level?: number | null
          confidence?: number | null
          created_at?: string | null
          detected_at?: string
          id?: string
          invalidated_at?: string | null
          pattern?: string
          pattern_score?: number | null
          prz_high?: number
          prz_low?: number
          status?: string | null
          symbol?: string
          timeframe?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      insights: {
        Row: {
          analysis_job_id: string
          confidence_score: number | null
          created_at: string
          data: Json | null
          description: string
          id: string
          insight_type: string
          session_id: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          analysis_job_id: string
          confidence_score?: number | null
          created_at?: string
          data?: Json | null
          description: string
          id?: string
          insight_type: string
          session_id?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          analysis_job_id?: string
          confidence_score?: number | null
          created_at?: string
          data?: Json | null
          description?: string
          id?: string
          insight_type?: string
          session_id?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insights_analysis_job_id_fkey"
            columns: ["analysis_job_id"]
            isOneToOne: false
            referencedRelation: "analysis_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      intelligence_backtests: {
        Row: {
          avg_trade_duration: unknown
          created_at: string | null
          detailed_results: Json | null
          end_date: string
          id: string
          intelligence_config: Json
          max_drawdown: number
          sharpe_ratio: number
          start_date: string
          symbol: string
          test_name: string
          timeframe: string
          total_return: number
          total_trades: number
          win_rate: number
          winning_trades: number
        }
        Insert: {
          avg_trade_duration?: unknown
          created_at?: string | null
          detailed_results?: Json | null
          end_date: string
          id?: string
          intelligence_config: Json
          max_drawdown: number
          sharpe_ratio: number
          start_date: string
          symbol: string
          test_name: string
          timeframe: string
          total_return: number
          total_trades: number
          win_rate: number
          winning_trades: number
        }
        Update: {
          avg_trade_duration?: unknown
          created_at?: string | null
          detailed_results?: Json | null
          end_date?: string
          id?: string
          intelligence_config?: Json
          max_drawdown?: number
          sharpe_ratio?: number
          start_date?: string
          symbol?: string
          test_name?: string
          timeframe?: string
          total_return?: number
          total_trades?: number
          win_rate?: number
          winning_trades?: number
        }
        Relationships: []
      }
      intelligence_performance: {
        Row: {
          actual_move_pips: number | null
          actual_outcome: string | null
          confidence_score: number
          created_at: string | null
          id: string
          market_regime: string | null
          predicted_direction: string
          prediction_accuracy: number | null
          signal_source: string
          signal_timestamp: string
          symbol: string
          timeframe: string
        }
        Insert: {
          actual_move_pips?: number | null
          actual_outcome?: string | null
          confidence_score: number
          created_at?: string | null
          id?: string
          market_regime?: string | null
          predicted_direction: string
          prediction_accuracy?: number | null
          signal_source: string
          signal_timestamp: string
          symbol?: string
          timeframe?: string
        }
        Update: {
          actual_move_pips?: number | null
          actual_outcome?: string | null
          confidence_score?: number
          created_at?: string | null
          id?: string
          market_regime?: string | null
          predicted_direction?: string
          prediction_accuracy?: number | null
          signal_source?: string
          signal_timestamp?: string
          symbol?: string
          timeframe?: string
        }
        Relationships: []
      }
      intelligent_targets: {
        Row: {
          actual_sl: number | null
          actual_tp: number | null
          confidence: number | null
          created_at: string | null
          entry_price: number
          id: string
          key_levels: Json | null
          reasoning: string | null
          recommended_sl: number
          recommended_tp1: number
          recommended_tp2: number | null
          recommended_tp3: number | null
          signal_id: string | null
          symbol: string
          trade_id: string | null
        }
        Insert: {
          actual_sl?: number | null
          actual_tp?: number | null
          confidence?: number | null
          created_at?: string | null
          entry_price: number
          id?: string
          key_levels?: Json | null
          reasoning?: string | null
          recommended_sl: number
          recommended_tp1: number
          recommended_tp2?: number | null
          recommended_tp3?: number | null
          signal_id?: string | null
          symbol: string
          trade_id?: string | null
        }
        Update: {
          actual_sl?: number | null
          actual_tp?: number | null
          confidence?: number | null
          created_at?: string | null
          entry_price?: number
          id?: string
          key_levels?: Json | null
          reasoning?: string | null
          recommended_sl?: number
          recommended_tp1?: number
          recommended_tp2?: number | null
          recommended_tp3?: number | null
          signal_id?: string | null
          symbol?: string
          trade_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intelligent_targets_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "master_signals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intelligent_targets_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "shadow_trades"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_actions: {
        Row: {
          action_type: string
          actual_improvement: number | null
          created_at: string | null
          expected_improvement: number | null
          id: string
          metadata: Json | null
          parameters_after: Json | null
          parameters_before: Json | null
          success: boolean | null
          trigger_reason: string
          verified_at: string | null
        }
        Insert: {
          action_type: string
          actual_improvement?: number | null
          created_at?: string | null
          expected_improvement?: number | null
          id?: string
          metadata?: Json | null
          parameters_after?: Json | null
          parameters_before?: Json | null
          success?: boolean | null
          trigger_reason: string
          verified_at?: string | null
        }
        Update: {
          action_type?: string
          actual_improvement?: number | null
          created_at?: string | null
          expected_improvement?: number | null
          id?: string
          metadata?: Json | null
          parameters_after?: Json | null
          parameters_before?: Json | null
          success?: boolean | null
          trigger_reason?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      learning_outcomes: {
        Row: {
          confluence_score: number | null
          contributing_modules: Json | null
          created_at: string | null
          entry_accuracy: number | null
          exit_timing_score: number | null
          holding_time_minutes: number
          id: string
          learned_features: Json | null
          market_regime: string | null
          outcome_type: string
          pnl: number
          processed: boolean | null
          profit_pips: number
          signal_id: string | null
          signal_quality: number | null
          trade_id: string | null
        }
        Insert: {
          confluence_score?: number | null
          contributing_modules?: Json | null
          created_at?: string | null
          entry_accuracy?: number | null
          exit_timing_score?: number | null
          holding_time_minutes: number
          id?: string
          learned_features?: Json | null
          market_regime?: string | null
          outcome_type: string
          pnl: number
          processed?: boolean | null
          profit_pips: number
          signal_id?: string | null
          signal_quality?: number | null
          trade_id?: string | null
        }
        Update: {
          confluence_score?: number | null
          contributing_modules?: Json | null
          created_at?: string | null
          entry_accuracy?: number | null
          exit_timing_score?: number | null
          holding_time_minutes?: number
          id?: string
          learned_features?: Json | null
          market_regime?: string | null
          outcome_type?: string
          pnl?: number
          processed?: boolean | null
          profit_pips?: number
          signal_id?: string | null
          signal_quality?: number | null
          trade_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_outcomes_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "master_signals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_outcomes_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "shadow_trades"
            referencedColumns: ["id"]
          },
        ]
      }
      lot_size_presets: {
        Row: {
          created_at: string
          id: string
          is_default: boolean | null
          lot_size: number
          portfolio_id: string
          preset_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          lot_size: number
          portfolio_id: string
          preset_name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          lot_size?: number
          portfolio_id?: string
          preset_name?: string
        }
        Relationships: []
      }
      market_data_enhanced: {
        Row: {
          ask_price: number
          bid_price: number
          close_price: number
          created_at: string | null
          high_price: number
          id: string
          is_holiday: boolean | null
          low_price: number
          open_price: number
          session_type: string | null
          spread: number
          symbol: string
          tick_volume: number | null
          timeframe: string
          timestamp: string
          volume: number | null
        }
        Insert: {
          ask_price: number
          bid_price: number
          close_price: number
          created_at?: string | null
          high_price: number
          id?: string
          is_holiday?: boolean | null
          low_price: number
          open_price: number
          session_type?: string | null
          spread: number
          symbol: string
          tick_volume?: number | null
          timeframe: string
          timestamp: string
          volume?: number | null
        }
        Update: {
          ask_price?: number
          bid_price?: number
          close_price?: number
          created_at?: string | null
          high_price?: number
          id?: string
          is_holiday?: boolean | null
          low_price?: number
          open_price?: number
          session_type?: string | null
          spread?: number
          symbol?: string
          tick_volume?: number | null
          timeframe?: string
          timestamp?: string
          volume?: number | null
        }
        Relationships: []
      }
      market_data_feed: {
        Row: {
          created_at: string
          data_source: string
          high_price: number
          id: string
          is_live: boolean
          low_price: number
          open_price: number
          price: number
          symbol: string
          timeframe: string
          timestamp: string
          volume: number | null
        }
        Insert: {
          created_at?: string
          data_source?: string
          high_price: number
          id?: string
          is_live?: boolean
          low_price: number
          open_price: number
          price: number
          symbol?: string
          timeframe?: string
          timestamp: string
          volume?: number | null
        }
        Update: {
          created_at?: string
          data_source?: string
          high_price?: number
          id?: string
          is_live?: boolean
          low_price?: number
          open_price?: number
          price?: number
          symbol?: string
          timeframe?: string
          timestamp?: string
          volume?: number | null
        }
        Relationships: []
      }
      market_sentiment: {
        Row: {
          confidence: number | null
          created_at: string | null
          id: string
          sentiment_score: number
          source: string | null
          symbol: string
          timestamp: string | null
          updated_at: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          id?: string
          sentiment_score: number
          source?: string | null
          symbol?: string
          timestamp?: string | null
          updated_at?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          id?: string
          sentiment_score?: number
          source?: string | null
          symbol?: string
          timestamp?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      market_snapshot: {
        Row: {
          change_24h: number | null
          change_percentage_24h: number | null
          created_at: string | null
          id: string
          last_price: number
          market_cap: number | null
          snapshot_time: string
          symbol: string
          updated_at: string | null
          volume_24h: number | null
        }
        Insert: {
          change_24h?: number | null
          change_percentage_24h?: number | null
          created_at?: string | null
          id?: string
          last_price: number
          market_cap?: number | null
          snapshot_time?: string
          symbol: string
          updated_at?: string | null
          volume_24h?: number | null
        }
        Update: {
          change_24h?: number | null
          change_percentage_24h?: number | null
          created_at?: string | null
          id?: string
          last_price?: number
          market_cap?: number | null
          snapshot_time?: string
          symbol?: string
          updated_at?: string | null
          volume_24h?: number | null
        }
        Relationships: []
      }
      master_signals: {
        Row: {
          actual_outcome: string | null
          actual_pips: number | null
          actual_pnl: number | null
          analysis_id: string
          confluence_score: number
          contributing_modules: string[]
          created_at: string
          edge_probability: number | null
          execution_price: number | null
          execution_slippage: number | null
          execution_timestamp: string | null
          expires_at: string | null
          final_confidence: number
          final_strength: number
          fusion_algorithm: string
          fusion_parameters: Json
          holding_duration: unknown
          id: string
          market_data_snapshot: Json
          market_price: number | null
          market_regime: string | null
          modular_signal_ids: string[]
          notes: string | null
          price_source: string | null
          price_validated: boolean | null
          processing_started_at: string | null
          processing_timeout_count: number | null
          recommended_entry: number
          recommended_lot_size: number
          recommended_stop_loss: number
          recommended_take_profit: number
          rejection_reason: string | null
          risk_reward_ratio: number | null
          signal_hash: string | null
          signal_quality_score: number | null
          signal_type: string
          status: string
          symbol: string
          tags: string[] | null
          timeframe: string
          timestamp: string
          uncertainty_measure: number | null
          updated_at: string
          volatility_percentile: number | null
        }
        Insert: {
          actual_outcome?: string | null
          actual_pips?: number | null
          actual_pnl?: number | null
          analysis_id: string
          confluence_score?: number
          contributing_modules: string[]
          created_at?: string
          edge_probability?: number | null
          execution_price?: number | null
          execution_slippage?: number | null
          execution_timestamp?: string | null
          expires_at?: string | null
          final_confidence: number
          final_strength: number
          fusion_algorithm: string
          fusion_parameters: Json
          holding_duration?: unknown
          id?: string
          market_data_snapshot: Json
          market_price?: number | null
          market_regime?: string | null
          modular_signal_ids: string[]
          notes?: string | null
          price_source?: string | null
          price_validated?: boolean | null
          processing_started_at?: string | null
          processing_timeout_count?: number | null
          recommended_entry: number
          recommended_lot_size?: number
          recommended_stop_loss: number
          recommended_take_profit: number
          rejection_reason?: string | null
          risk_reward_ratio?: number | null
          signal_hash?: string | null
          signal_quality_score?: number | null
          signal_type: string
          status?: string
          symbol?: string
          tags?: string[] | null
          timeframe: string
          timestamp?: string
          uncertainty_measure?: number | null
          updated_at?: string
          volatility_percentile?: number | null
        }
        Update: {
          actual_outcome?: string | null
          actual_pips?: number | null
          actual_pnl?: number | null
          analysis_id?: string
          confluence_score?: number
          contributing_modules?: string[]
          created_at?: string
          edge_probability?: number | null
          execution_price?: number | null
          execution_slippage?: number | null
          execution_timestamp?: string | null
          expires_at?: string | null
          final_confidence?: number
          final_strength?: number
          fusion_algorithm?: string
          fusion_parameters?: Json
          holding_duration?: unknown
          id?: string
          market_data_snapshot?: Json
          market_price?: number | null
          market_regime?: string | null
          modular_signal_ids?: string[]
          notes?: string | null
          price_source?: string | null
          price_validated?: boolean | null
          processing_started_at?: string | null
          processing_timeout_count?: number | null
          recommended_entry?: number
          recommended_lot_size?: number
          recommended_stop_loss?: number
          recommended_take_profit?: number
          rejection_reason?: string | null
          risk_reward_ratio?: number | null
          signal_hash?: string | null
          signal_quality_score?: number | null
          signal_type?: string
          status?: string
          symbol?: string
          tags?: string[] | null
          timeframe?: string
          timestamp?: string
          uncertainty_measure?: number | null
          updated_at?: string
          volatility_percentile?: number | null
        }
        Relationships: []
      }
      master_signals_fusion: {
        Row: {
          analysis_id: string
          confidence_score: number
          contributing_signals: Json
          created_at: string
          executed_at: string | null
          expires_at: string | null
          fusion_decision: string
          fusion_reasoning: string | null
          id: string
          market_conditions: Json | null
          override_reason: string | null
          recommended_entry: number | null
          recommended_lot_size: number | null
          recommended_stop_loss: number | null
          recommended_take_profit: number | null
          risk_assessment: Json | null
          signal_weights: Json
          status: string | null
          symbol: string
          timeframe: string
          weighted_score: number
        }
        Insert: {
          analysis_id: string
          confidence_score: number
          contributing_signals: Json
          created_at?: string
          executed_at?: string | null
          expires_at?: string | null
          fusion_decision: string
          fusion_reasoning?: string | null
          id?: string
          market_conditions?: Json | null
          override_reason?: string | null
          recommended_entry?: number | null
          recommended_lot_size?: number | null
          recommended_stop_loss?: number | null
          recommended_take_profit?: number | null
          risk_assessment?: Json | null
          signal_weights: Json
          status?: string | null
          symbol?: string
          timeframe: string
          weighted_score: number
        }
        Update: {
          analysis_id?: string
          confidence_score?: number
          contributing_signals?: Json
          created_at?: string
          executed_at?: string | null
          expires_at?: string | null
          fusion_decision?: string
          fusion_reasoning?: string | null
          id?: string
          market_conditions?: Json | null
          override_reason?: string | null
          recommended_entry?: number | null
          recommended_lot_size?: number | null
          recommended_stop_loss?: number | null
          recommended_take_profit?: number | null
          risk_assessment?: Json | null
          signal_weights?: Json
          status?: string | null
          symbol?: string
          timeframe?: string
          weighted_score?: number
        }
        Relationships: []
      }
      ml_exit_models: {
        Row: {
          accuracy_score: number
          created_at: string
          feature_importance: Json
          id: string
          is_active: boolean
          model_parameters: Json
          model_type: string
          model_version: string
          training_period: Json
          training_samples: number
        }
        Insert: {
          accuracy_score?: number
          created_at?: string
          feature_importance?: Json
          id?: string
          is_active?: boolean
          model_parameters?: Json
          model_type?: string
          model_version: string
          training_period: Json
          training_samples?: number
        }
        Update: {
          accuracy_score?: number
          created_at?: string
          feature_importance?: Json
          id?: string
          is_active?: boolean
          model_parameters?: Json
          model_type?: string
          model_version?: string
          training_period?: Json
          training_samples?: number
        }
        Relationships: []
      }
      ml_exit_predictions: {
        Row: {
          actual_exit_price: number | null
          actual_exit_time: string | null
          actual_profit_pips: number | null
          confidence_score: number
          created_at: string
          feature_values: Json
          id: string
          model_version: string
          predicted_exit_price: number | null
          predicted_exit_time: string | null
          predicted_profit_pips: number | null
          prediction_error: number | null
          trade_id: string
        }
        Insert: {
          actual_exit_price?: number | null
          actual_exit_time?: string | null
          actual_profit_pips?: number | null
          confidence_score: number
          created_at?: string
          feature_values: Json
          id?: string
          model_version: string
          predicted_exit_price?: number | null
          predicted_exit_time?: string | null
          predicted_profit_pips?: number | null
          prediction_error?: number | null
          trade_id: string
        }
        Update: {
          actual_exit_price?: number | null
          actual_exit_time?: string | null
          actual_profit_pips?: number | null
          confidence_score?: number
          created_at?: string
          feature_values?: Json
          id?: string
          model_version?: string
          predicted_exit_price?: number | null
          predicted_exit_time?: string | null
          predicted_profit_pips?: number | null
          prediction_error?: number | null
          trade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ml_exit_predictions_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "shadow_trades"
            referencedColumns: ["id"]
          },
        ]
      }
      ml_performance_cache: {
        Row: {
          calculated_at: string | null
          id: string
          metric_data: Json
          metric_type: string
          valid_until: string | null
        }
        Insert: {
          calculated_at?: string | null
          id?: string
          metric_data: Json
          metric_type: string
          valid_until?: string | null
        }
        Update: {
          calculated_at?: string | null
          id?: string
          metric_data?: Json
          metric_type?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      ml_training_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          model_version: string
          success: boolean | null
          training_duration_ms: number | null
          training_samples: number | null
          trigger_type: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          model_version: string
          success?: boolean | null
          training_duration_ms?: number | null
          training_samples?: number | null
          trigger_type: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          model_version?: string
          success?: boolean | null
          training_duration_ms?: number | null
          training_samples?: number | null
          trigger_type?: string
        }
        Relationships: []
      }
      models: {
        Row: {
          analysis_job_id: string
          api_endpoint: string | null
          created_at: string
          feature_importance: Json | null
          id: string
          is_deployed: boolean
          model_config: Json | null
          model_name: string
          model_type: string
          performance_metrics: Json | null
          session_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          analysis_job_id: string
          api_endpoint?: string | null
          created_at?: string
          feature_importance?: Json | null
          id?: string
          is_deployed?: boolean
          model_config?: Json | null
          model_name: string
          model_type: string
          performance_metrics?: Json | null
          session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          analysis_job_id?: string
          api_endpoint?: string | null
          created_at?: string
          feature_importance?: Json | null
          id?: string
          is_deployed?: boolean
          model_config?: Json | null
          model_name?: string
          model_type?: string
          performance_metrics?: Json | null
          session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "models_analysis_job_id_fkey"
            columns: ["analysis_job_id"]
            isOneToOne: false
            referencedRelation: "analysis_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      modular_signals: {
        Row: {
          analysis_id: string
          calculation_parameters: Json
          confidence: number
          created_at: string
          expires_at: string | null
          id: string
          intermediate_values: Json | null
          is_active: boolean
          market_data_snapshot: Json
          market_session: string | null
          module_id: string
          module_version: string
          signal_type: string
          strength: number
          suggested_entry: number | null
          suggested_stop_loss: number | null
          suggested_take_profit: number | null
          symbol: string
          timeframe: string
          timestamp: string
          trend_context: string | null
          trigger_price: number
          volatility_regime: string | null
          weight: number
        }
        Insert: {
          analysis_id: string
          calculation_parameters: Json
          confidence: number
          created_at?: string
          expires_at?: string | null
          id?: string
          intermediate_values?: Json | null
          is_active?: boolean
          market_data_snapshot: Json
          market_session?: string | null
          module_id: string
          module_version?: string
          signal_type: string
          strength: number
          suggested_entry?: number | null
          suggested_stop_loss?: number | null
          suggested_take_profit?: number | null
          symbol?: string
          timeframe: string
          timestamp?: string
          trend_context?: string | null
          trigger_price: number
          volatility_regime?: string | null
          weight?: number
        }
        Update: {
          analysis_id?: string
          calculation_parameters?: Json
          confidence?: number
          created_at?: string
          expires_at?: string | null
          id?: string
          intermediate_values?: Json | null
          is_active?: boolean
          market_data_snapshot?: Json
          market_session?: string | null
          module_id?: string
          module_version?: string
          signal_type?: string
          strength?: number
          suggested_entry?: number | null
          suggested_stop_loss?: number | null
          suggested_take_profit?: number | null
          symbol?: string
          timeframe?: string
          timestamp?: string
          trend_context?: string | null
          trigger_price?: number
          volatility_regime?: string | null
          weight?: number
        }
        Relationships: []
      }
      module_calibration_history: {
        Row: {
          backtest_results: Json | null
          created_at: string | null
          deployed: boolean | null
          deployed_at: string | null
          id: string
          module_id: string
          new_parameters: Json
          old_parameters: Json
          performance_after: Json | null
          performance_before: Json
        }
        Insert: {
          backtest_results?: Json | null
          created_at?: string | null
          deployed?: boolean | null
          deployed_at?: string | null
          id?: string
          module_id: string
          new_parameters?: Json
          old_parameters?: Json
          performance_after?: Json | null
          performance_before?: Json
        }
        Update: {
          backtest_results?: Json | null
          created_at?: string | null
          deployed?: boolean | null
          deployed_at?: string | null
          id?: string
          module_id?: string
          new_parameters?: Json
          old_parameters?: Json
          performance_after?: Json | null
          performance_before?: Json
        }
        Relationships: []
      }
      module_correlations: {
        Row: {
          confidence_interval: number[] | null
          correlation_value: number
          created_at: string | null
          id: string
          last_calculated: string | null
          module_a: string
          module_b: string
          sample_size: number | null
          updated_at: string | null
        }
        Insert: {
          confidence_interval?: number[] | null
          correlation_value?: number
          created_at?: string | null
          id?: string
          last_calculated?: string | null
          module_a: string
          module_b: string
          sample_size?: number | null
          updated_at?: string | null
        }
        Update: {
          confidence_interval?: number[] | null
          correlation_value?: number
          created_at?: string | null
          id?: string
          last_calculated?: string | null
          module_a?: string
          module_b?: string
          sample_size?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      module_health: {
        Row: {
          created_at: string | null
          error_count: number | null
          last_error: string | null
          last_output_id: string | null
          last_run: string | null
          module_name: string
          performance_score: number | null
          signals_generated_today: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          error_count?: number | null
          last_error?: string | null
          last_output_id?: string | null
          last_run?: string | null
          module_name: string
          performance_score?: number | null
          signals_generated_today?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          error_count?: number | null
          last_error?: string | null
          last_output_id?: string | null
          last_run?: string | null
          module_name?: string
          performance_score?: number | null
          signals_generated_today?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      module_performance: {
        Row: {
          average_confidence: number | null
          average_return: number | null
          average_strength: number | null
          created_at: string | null
          failed_signals: number | null
          historical_weight: number | null
          id: string
          information_ratio: number | null
          last_updated: string | null
          max_drawdown: number | null
          module_id: string
          recent_performance: Json | null
          reliability: number | null
          sharpe_ratio: number | null
          signals_generated: number | null
          status: string | null
          successful_signals: number | null
          trend: string | null
          win_rate: number | null
        }
        Insert: {
          average_confidence?: number | null
          average_return?: number | null
          average_strength?: number | null
          created_at?: string | null
          failed_signals?: number | null
          historical_weight?: number | null
          id?: string
          information_ratio?: number | null
          last_updated?: string | null
          max_drawdown?: number | null
          module_id: string
          recent_performance?: Json | null
          reliability?: number | null
          sharpe_ratio?: number | null
          signals_generated?: number | null
          status?: string | null
          successful_signals?: number | null
          trend?: string | null
          win_rate?: number | null
        }
        Update: {
          average_confidence?: number | null
          average_return?: number | null
          average_strength?: number | null
          created_at?: string | null
          failed_signals?: number | null
          historical_weight?: number | null
          id?: string
          information_ratio?: number | null
          last_updated?: string | null
          max_drawdown?: number | null
          module_id?: string
          recent_performance?: Json | null
          reliability?: number | null
          sharpe_ratio?: number | null
          signals_generated?: number | null
          status?: string | null
          successful_signals?: number | null
          trend?: string | null
          win_rate?: number | null
        }
        Relationships: []
      }
      multi_timeframe_signals: {
        Row: {
          analysis_id: string
          cascade_strength: number
          confluence_score: number
          created_at: string | null
          divergence_detected: boolean | null
          id: string
          primary_timeframe: string
          signal_data: Json
          signal_type: string
          symbol: string
          timeframe_agreement_count: number
          timeframes: string[]
        }
        Insert: {
          analysis_id: string
          cascade_strength: number
          confluence_score: number
          created_at?: string | null
          divergence_detected?: boolean | null
          id?: string
          primary_timeframe: string
          signal_data: Json
          signal_type: string
          symbol?: string
          timeframe_agreement_count: number
          timeframes: string[]
        }
        Update: {
          analysis_id?: string
          cascade_strength?: number
          confluence_score?: number
          created_at?: string | null
          divergence_detected?: boolean | null
          id?: string
          primary_timeframe?: string
          signal_data?: Json
          signal_type?: string
          symbol?: string
          timeframe_agreement_count?: number
          timeframes?: string[]
        }
        Relationships: []
      }
      news_events: {
        Row: {
          category: string | null
          content: string | null
          created_at: string | null
          id: string
          impact_score: number | null
          published_at: string
          relevance_score: number | null
          sentiment_score: number | null
          source: string
          symbol: string
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          impact_score?: number | null
          published_at: string
          relevance_score?: number | null
          sentiment_score?: number | null
          source: string
          symbol?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          impact_score?: number | null
          published_at?: string
          relevance_score?: number | null
          sentiment_score?: number | null
          source?: string
          symbol?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      news_sentiment: {
        Row: {
          created_at: string | null
          headline: string
          id: string
          published_at: string
          relevance_score: number | null
          sentiment_label: string
          sentiment_score: number
          source: string
          summary: string | null
          symbol: string
          ticker_sentiment: Json | null
          topics: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          headline: string
          id?: string
          published_at: string
          relevance_score?: number | null
          sentiment_label: string
          sentiment_score: number
          source: string
          summary?: string | null
          symbol?: string
          ticker_sentiment?: Json | null
          topics?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          headline?: string
          id?: string
          published_at?: string
          relevance_score?: number | null
          sentiment_label?: string
          sentiment_score?: number
          source?: string
          summary?: string | null
          symbol?: string
          ticker_sentiment?: Json | null
          topics?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      order_types: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      pattern_performance: {
        Row: {
          confluence_score: number | null
          created_at: string | null
          duration_hours: number | null
          entry_price: number
          entry_time: string
          exit_price: number | null
          exit_time: string | null
          id: string
          max_adverse_excursion: number | null
          max_favorable_excursion: number | null
          outcome: string | null
          pattern_confidence: number | null
          pattern_signal_id: string | null
          pattern_type: string
          profit_pips: number | null
          profit_usd: number | null
          timeframe: string
        }
        Insert: {
          confluence_score?: number | null
          created_at?: string | null
          duration_hours?: number | null
          entry_price: number
          entry_time: string
          exit_price?: number | null
          exit_time?: string | null
          id?: string
          max_adverse_excursion?: number | null
          max_favorable_excursion?: number | null
          outcome?: string | null
          pattern_confidence?: number | null
          pattern_signal_id?: string | null
          pattern_type: string
          profit_pips?: number | null
          profit_usd?: number | null
          timeframe: string
        }
        Update: {
          confluence_score?: number | null
          created_at?: string | null
          duration_hours?: number | null
          entry_price?: number
          entry_time?: string
          exit_price?: number | null
          exit_time?: string | null
          id?: string
          max_adverse_excursion?: number | null
          max_favorable_excursion?: number | null
          outcome?: string | null
          pattern_confidence?: number | null
          pattern_signal_id?: string | null
          pattern_type?: string
          profit_pips?: number | null
          profit_usd?: number | null
          timeframe?: string
        }
        Relationships: [
          {
            foreignKeyName: "pattern_performance_pattern_signal_id_fkey"
            columns: ["pattern_signal_id"]
            isOneToOne: false
            referencedRelation: "pattern_signals"
            referencedColumns: ["id"]
          },
        ]
      }
      pattern_signals: {
        Row: {
          confidence: number | null
          confluence_score: number | null
          created_at: string | null
          detected_at: string
          entry_price: number | null
          executed_at: string | null
          id: string
          invalidated_at: string | null
          mtf_15m_confirmed: boolean | null
          mtf_1h_confirmed: boolean | null
          mtf_4h_confirmed: boolean | null
          mtf_score: number | null
          overall_score: number | null
          pattern_confidence: number | null
          pattern_type: string
          shadow_trade_id: string | null
          status: string | null
          stop_loss: number | null
          strength: number | null
          symbol: string
          take_profit: number | null
          timeframe: string | null
          updated_at: string | null
        }
        Insert: {
          confidence?: number | null
          confluence_score?: number | null
          created_at?: string | null
          detected_at?: string
          entry_price?: number | null
          executed_at?: string | null
          id?: string
          invalidated_at?: string | null
          mtf_15m_confirmed?: boolean | null
          mtf_1h_confirmed?: boolean | null
          mtf_4h_confirmed?: boolean | null
          mtf_score?: number | null
          overall_score?: number | null
          pattern_confidence?: number | null
          pattern_type: string
          shadow_trade_id?: string | null
          status?: string | null
          stop_loss?: number | null
          strength?: number | null
          symbol?: string
          take_profit?: number | null
          timeframe?: string | null
          updated_at?: string | null
        }
        Update: {
          confidence?: number | null
          confluence_score?: number | null
          created_at?: string | null
          detected_at?: string
          entry_price?: number | null
          executed_at?: string | null
          id?: string
          invalidated_at?: string | null
          mtf_15m_confirmed?: boolean | null
          mtf_1h_confirmed?: boolean | null
          mtf_4h_confirmed?: boolean | null
          mtf_score?: number | null
          overall_score?: number | null
          pattern_confidence?: number | null
          pattern_type?: string
          shadow_trade_id?: string | null
          status?: string | null
          stop_loss?: number | null
          strength?: number | null
          symbol?: string
          take_profit?: number | null
          timeframe?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      pending_orders: {
        Row: {
          commission: number | null
          created_at: string | null
          expiry_time: string | null
          expiry_type: string | null
          filled_at: string | null
          filled_lot_size: number | null
          filled_price: number | null
          id: string
          lot_size: number
          notes: string | null
          order_type: string
          partial_fill_allowed: boolean | null
          portfolio_id: string | null
          slippage_tolerance: number | null
          status: string | null
          stop_loss: number | null
          symbol: string
          take_profit: number | null
          trade_type: string
          trigger_price: number
          updated_at: string | null
        }
        Insert: {
          commission?: number | null
          created_at?: string | null
          expiry_time?: string | null
          expiry_type?: string | null
          filled_at?: string | null
          filled_lot_size?: number | null
          filled_price?: number | null
          id?: string
          lot_size?: number
          notes?: string | null
          order_type: string
          partial_fill_allowed?: boolean | null
          portfolio_id?: string | null
          slippage_tolerance?: number | null
          status?: string | null
          stop_loss?: number | null
          symbol?: string
          take_profit?: number | null
          trade_type: string
          trigger_price: number
          updated_at?: string | null
        }
        Update: {
          commission?: number | null
          created_at?: string | null
          expiry_time?: string | null
          expiry_type?: string | null
          filled_at?: string | null
          filled_lot_size?: number | null
          filled_price?: number | null
          id?: string
          lot_size?: number
          notes?: string | null
          order_type?: string
          partial_fill_allowed?: boolean | null
          portfolio_id?: string | null
          slippage_tolerance?: number | null
          status?: string | null
          stop_loss?: number | null
          symbol?: string
          take_profit?: number | null
          trade_type?: string
          trigger_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pending_orders_order_type_fkey"
            columns: ["order_type"]
            isOneToOne: false
            referencedRelation: "order_types"
            referencedColumns: ["name"]
          },
        ]
      }
      performance_snapshots: {
        Row: {
          balance: number
          created_at: string
          daily_pnl: number
          drawdown_percent: number
          equity: number
          id: string
          portfolio_id: string
          snapshot_date: string
          trades_today: number
          win_rate_today: number
        }
        Insert: {
          balance: number
          created_at?: string
          daily_pnl?: number
          drawdown_percent?: number
          equity: number
          id?: string
          portfolio_id: string
          snapshot_date: string
          trades_today?: number
          win_rate_today?: number
        }
        Update: {
          balance?: number
          created_at?: string
          daily_pnl?: number
          drawdown_percent?: number
          equity?: number
          id?: string
          portfolio_id?: string
          snapshot_date?: string
          trades_today?: number
          win_rate_today?: number
        }
        Relationships: []
      }
      portfolio_allocations: {
        Row: {
          correlation_adjustment: number | null
          created_at: string | null
          currency_pair: string
          current_allocation_percent: number
          id: string
          intelligence_confidence: number
          last_rebalance: string | null
          portfolio_id: string
          regime_based_scaling: number | null
          risk_budget_allocated: number
          target_allocation_percent: number
        }
        Insert: {
          correlation_adjustment?: number | null
          created_at?: string | null
          currency_pair: string
          current_allocation_percent: number
          id?: string
          intelligence_confidence: number
          last_rebalance?: string | null
          portfolio_id: string
          regime_based_scaling?: number | null
          risk_budget_allocated: number
          target_allocation_percent: number
        }
        Update: {
          correlation_adjustment?: number | null
          created_at?: string | null
          currency_pair?: string
          current_allocation_percent?: number
          id?: string
          intelligence_confidence?: number
          last_rebalance?: string | null
          portfolio_id?: string
          regime_based_scaling?: number | null
          risk_budget_allocated?: number
          target_allocation_percent?: number
        }
        Relationships: []
      }
      position_correlations: {
        Row: {
          calculated_at: string | null
          correlation_coefficient: number
          id: string
          portfolio_id: string
          risk_exposure: number
          symbol_a: string
          symbol_b: string
        }
        Insert: {
          calculated_at?: string | null
          correlation_coefficient: number
          id?: string
          portfolio_id: string
          risk_exposure: number
          symbol_a: string
          symbol_b: string
        }
        Update: {
          calculated_at?: string | null
          correlation_coefficient?: number
          id?: string
          portfolio_id?: string
          risk_exposure?: number
          symbol_a?: string
          symbol_b?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      retail_positions: {
        Row: {
          as_of: string
          broker: string
          created_at: string | null
          id: string
          long_percentage: number | null
          long_traders_count: number | null
          short_percentage: number | null
          short_traders_count: number | null
          symbol: string
          updated_at: string | null
        }
        Insert: {
          as_of?: string
          broker: string
          created_at?: string | null
          id?: string
          long_percentage?: number | null
          long_traders_count?: number | null
          short_percentage?: number | null
          short_traders_count?: number | null
          symbol?: string
          updated_at?: string | null
        }
        Update: {
          as_of?: string
          broker?: string
          created_at?: string | null
          id?: string
          long_percentage?: number | null
          long_traders_count?: number | null
          short_percentage?: number | null
          short_traders_count?: number | null
          symbol?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      shadow_portfolios: {
        Row: {
          auto_trading_enabled: boolean
          average_loss: number
          average_win: number
          balance: number
          consecutive_losses: number
          consecutive_wins: number
          created_at: string
          current_drawdown: number
          equity: number
          floating_pnl: number
          free_margin: number
          id: string
          initial_deposit: number
          largest_loss: number
          largest_win: number
          last_trade_time: string | null
          leverage: number
          losing_trades: number
          margin: number
          margin_level: number
          max_drawdown: number
          max_equity: number
          max_open_positions: number
          peak_balance: number
          portfolio_name: string
          profit_factor: number
          sharpe_ratio: number
          total_commission: number
          total_swap: number
          total_trades: number
          updated_at: string
          used_margin: number
          win_rate: number
          winning_trades: number
        }
        Insert: {
          auto_trading_enabled?: boolean
          average_loss?: number
          average_win?: number
          balance?: number
          consecutive_losses?: number
          consecutive_wins?: number
          created_at?: string
          current_drawdown?: number
          equity?: number
          floating_pnl?: number
          free_margin?: number
          id?: string
          initial_deposit?: number
          largest_loss?: number
          largest_win?: number
          last_trade_time?: string | null
          leverage?: number
          losing_trades?: number
          margin?: number
          margin_level?: number
          max_drawdown?: number
          max_equity?: number
          max_open_positions?: number
          peak_balance?: number
          portfolio_name?: string
          profit_factor?: number
          sharpe_ratio?: number
          total_commission?: number
          total_swap?: number
          total_trades?: number
          updated_at?: string
          used_margin?: number
          win_rate?: number
          winning_trades?: number
        }
        Update: {
          auto_trading_enabled?: boolean
          average_loss?: number
          average_win?: number
          balance?: number
          consecutive_losses?: number
          consecutive_wins?: number
          created_at?: string
          current_drawdown?: number
          equity?: number
          floating_pnl?: number
          free_margin?: number
          id?: string
          initial_deposit?: number
          largest_loss?: number
          largest_win?: number
          last_trade_time?: string | null
          leverage?: number
          losing_trades?: number
          margin?: number
          margin_level?: number
          max_drawdown?: number
          max_equity?: number
          max_open_positions?: number
          peak_balance?: number
          portfolio_name?: string
          profit_factor?: number
          sharpe_ratio?: number
          total_commission?: number
          total_swap?: number
          total_trades?: number
          updated_at?: string
          used_margin?: number
          win_rate?: number
          winning_trades?: number
        }
        Relationships: []
      }
      shadow_trades: {
        Row: {
          break_even_triggered: boolean | null
          close_type: string | null
          comment: string | null
          commission: number | null
          confluence_score: number
          contract_size: number
          created_at: string
          current_price: number | null
          entry_price: number
          entry_time: string
          execution_path: string | null
          execution_price: number | null
          exit_factors: Json | null
          exit_intelligence_score: number | null
          exit_price: number | null
          exit_reason: string | null
          exit_time: string | null
          expert_advisor: string | null
          holding_time_minutes: number | null
          id: string
          intelligence_exit_triggered: boolean | null
          key_levels: Json | null
          lot_size: number
          magic_number: number | null
          margin_required: number | null
          master_signal_id: string | null
          max_loss: number | null
          max_profit: number | null
          order_type: string | null
          original_lot_size: number | null
          original_stop_loss: number | null
          original_take_profit: number | null
          partial_close_count: number | null
          partial_closes_count: number | null
          pip_pnl: number | null
          pip_value: number | null
          pnl: number | null
          pnl_percent: number | null
          point_value: number | null
          portfolio_id: string | null
          position_size: number
          price_source: string | null
          price_timestamp: string | null
          profit: number | null
          profit_pips: number | null
          realized_pnl: number | null
          remaining_lot_size: number | null
          risk_reward_ratio: number | null
          signal_id: string | null
          slippage_pips: number | null
          status: string
          stop_loss: number
          swap: number | null
          symbol: string
          take_profit: number
          take_profit_1: number | null
          take_profit_2: number | null
          take_profit_3: number | null
          target_confidence: number | null
          target_reasoning: string | null
          tick_value: number | null
          trade_type: string
          trailing_stop_distance: number | null
          trailing_stop_triggered: boolean | null
          unrealized_pnl: number | null
          updated_at: string
        }
        Insert: {
          break_even_triggered?: boolean | null
          close_type?: string | null
          comment?: string | null
          commission?: number | null
          confluence_score?: number
          contract_size?: number
          created_at?: string
          current_price?: number | null
          entry_price: number
          entry_time?: string
          execution_path?: string | null
          execution_price?: number | null
          exit_factors?: Json | null
          exit_intelligence_score?: number | null
          exit_price?: number | null
          exit_reason?: string | null
          exit_time?: string | null
          expert_advisor?: string | null
          holding_time_minutes?: number | null
          id?: string
          intelligence_exit_triggered?: boolean | null
          key_levels?: Json | null
          lot_size?: number
          magic_number?: number | null
          margin_required?: number | null
          master_signal_id?: string | null
          max_loss?: number | null
          max_profit?: number | null
          order_type?: string | null
          original_lot_size?: number | null
          original_stop_loss?: number | null
          original_take_profit?: number | null
          partial_close_count?: number | null
          partial_closes_count?: number | null
          pip_pnl?: number | null
          pip_value?: number | null
          pnl?: number | null
          pnl_percent?: number | null
          point_value?: number | null
          portfolio_id?: string | null
          position_size: number
          price_source?: string | null
          price_timestamp?: string | null
          profit?: number | null
          profit_pips?: number | null
          realized_pnl?: number | null
          remaining_lot_size?: number | null
          risk_reward_ratio?: number | null
          signal_id?: string | null
          slippage_pips?: number | null
          status?: string
          stop_loss: number
          swap?: number | null
          symbol?: string
          take_profit: number
          take_profit_1?: number | null
          take_profit_2?: number | null
          take_profit_3?: number | null
          target_confidence?: number | null
          target_reasoning?: string | null
          tick_value?: number | null
          trade_type: string
          trailing_stop_distance?: number | null
          trailing_stop_triggered?: boolean | null
          unrealized_pnl?: number | null
          updated_at?: string
        }
        Update: {
          break_even_triggered?: boolean | null
          close_type?: string | null
          comment?: string | null
          commission?: number | null
          confluence_score?: number
          contract_size?: number
          created_at?: string
          current_price?: number | null
          entry_price?: number
          entry_time?: string
          execution_path?: string | null
          execution_price?: number | null
          exit_factors?: Json | null
          exit_intelligence_score?: number | null
          exit_price?: number | null
          exit_reason?: string | null
          exit_time?: string | null
          expert_advisor?: string | null
          holding_time_minutes?: number | null
          id?: string
          intelligence_exit_triggered?: boolean | null
          key_levels?: Json | null
          lot_size?: number
          magic_number?: number | null
          margin_required?: number | null
          master_signal_id?: string | null
          max_loss?: number | null
          max_profit?: number | null
          order_type?: string | null
          original_lot_size?: number | null
          original_stop_loss?: number | null
          original_take_profit?: number | null
          partial_close_count?: number | null
          partial_closes_count?: number | null
          pip_pnl?: number | null
          pip_value?: number | null
          pnl?: number | null
          pnl_percent?: number | null
          point_value?: number | null
          portfolio_id?: string | null
          position_size?: number
          price_source?: string | null
          price_timestamp?: string | null
          profit?: number | null
          profit_pips?: number | null
          realized_pnl?: number | null
          remaining_lot_size?: number | null
          risk_reward_ratio?: number | null
          signal_id?: string | null
          slippage_pips?: number | null
          status?: string
          stop_loss?: number
          swap?: number | null
          symbol?: string
          take_profit?: number
          take_profit_1?: number | null
          take_profit_2?: number | null
          take_profit_3?: number | null
          target_confidence?: number | null
          target_reasoning?: string | null
          tick_value?: number | null
          trade_type?: string
          trailing_stop_distance?: number | null
          trailing_stop_triggered?: boolean | null
          unrealized_pnl?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_shadow_trades_signal"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "master_signals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shadow_trades_master_signal_id_fkey"
            columns: ["master_signal_id"]
            isOneToOne: false
            referencedRelation: "master_signals"
            referencedColumns: ["id"]
          },
        ]
      }
      signal_audit: {
        Row: {
          action_reason: string | null
          action_type: string
          analysis_id: string
          changed_fields: string[] | null
          compliance_notes: string | null
          created_at: string
          id: string
          market_conditions: Json | null
          new_values: Json | null
          old_values: Json | null
          regulatory_flags: string[] | null
          risk_assessment: Json | null
          signal_id: string | null
          signal_table: string
          system_component: string | null
          system_state: Json | null
          timestamp: string
          user_id: string | null
        }
        Insert: {
          action_reason?: string | null
          action_type: string
          analysis_id: string
          changed_fields?: string[] | null
          compliance_notes?: string | null
          created_at?: string
          id?: string
          market_conditions?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          regulatory_flags?: string[] | null
          risk_assessment?: Json | null
          signal_id?: string | null
          signal_table: string
          system_component?: string | null
          system_state?: Json | null
          timestamp?: string
          user_id?: string | null
        }
        Update: {
          action_reason?: string | null
          action_type?: string
          analysis_id?: string
          changed_fields?: string[] | null
          compliance_notes?: string | null
          created_at?: string
          id?: string
          market_conditions?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          regulatory_flags?: string[] | null
          risk_assessment?: Json | null
          signal_id?: string | null
          signal_table?: string
          system_component?: string | null
          system_state?: Json | null
          timestamp?: string
          user_id?: string | null
        }
        Relationships: []
      }
      signal_execution_attempts: {
        Row: {
          attempt_number: number
          attempted_at: string | null
          execution_stage: string | null
          failure_reason: string | null
          id: string
          lock_acquired: boolean
          market_price: number | null
          signal_id: string
        }
        Insert: {
          attempt_number: number
          attempted_at?: string | null
          execution_stage?: string | null
          failure_reason?: string | null
          id?: string
          lock_acquired: boolean
          market_price?: number | null
          signal_id: string
        }
        Update: {
          attempt_number?: number
          attempted_at?: string | null
          execution_stage?: string | null
          failure_reason?: string | null
          id?: string
          lock_acquired?: boolean
          market_price?: number | null
          signal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "signal_execution_attempts_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "master_signals"
            referencedColumns: ["id"]
          },
        ]
      }
      signal_execution_locks: {
        Row: {
          expires_at: string
          locked_at: string
          locked_by: string
          signal_id: string
        }
        Insert: {
          expires_at?: string
          locked_at?: string
          locked_by: string
          signal_id: string
        }
        Update: {
          expires_at?: string
          locked_at?: string
          locked_by?: string
          signal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "signal_execution_locks_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: true
            referencedRelation: "master_signals"
            referencedColumns: ["id"]
          },
        ]
      }
      signal_rejection_logs: {
        Row: {
          confluence_score: number | null
          created_at: string
          entropy: number | null
          factors_count: number
          id: string
          market_regime: string | null
          net_edge: number | null
          probability: number | null
          reason: string
          signal_type: string
          threshold: number
          timestamp: string
          value: number
        }
        Insert: {
          confluence_score?: number | null
          created_at?: string
          entropy?: number | null
          factors_count?: number
          id?: string
          market_regime?: string | null
          net_edge?: number | null
          probability?: number | null
          reason: string
          signal_type: string
          threshold: number
          timestamp?: string
          value: number
        }
        Update: {
          confluence_score?: number | null
          created_at?: string
          entropy?: number | null
          factors_count?: number
          id?: string
          market_regime?: string | null
          net_edge?: number | null
          probability?: number | null
          reason?: string
          signal_type?: string
          threshold?: number
          timestamp?: string
          value?: number
        }
        Relationships: []
      }
      social_sentiment_cache: {
        Row: {
          cached_at: string | null
          created_at: string | null
          sentiment_data: Json
          symbol: string
          ttl_minutes: number | null
          updated_at: string | null
        }
        Insert: {
          cached_at?: string | null
          created_at?: string | null
          sentiment_data: Json
          symbol: string
          ttl_minutes?: number | null
          updated_at?: string | null
        }
        Update: {
          cached_at?: string | null
          created_at?: string | null
          sentiment_data?: Json
          symbol?: string
          ttl_minutes?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      social_sentiment_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          response_time_ms: number | null
          source: string
          success: boolean
          symbol: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          response_time_ms?: number | null
          source: string
          success: boolean
          symbol: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          response_time_ms?: number | null
          source?: string
          success?: boolean
          symbol?: string
        }
        Relationships: []
      }
      support_resistance: {
        Row: {
          created_at: string | null
          detected_at: string
          id: string
          level_price: number
          level_type: string
          strength: number | null
          symbol: string
          timeframe: string | null
          touches_count: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          detected_at?: string
          id?: string
          level_price: number
          level_type: string
          strength?: number | null
          symbol?: string
          timeframe?: string | null
          touches_count?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          detected_at?: string
          id?: string
          level_price?: number
          level_type?: string
          strength?: number | null
          symbol?: string
          timeframe?: string | null
          touches_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      system_config: {
        Row: {
          config_key: string
          config_value: Json
          created_at: string
          description: string | null
          id: string
          updated_at: string
        }
        Insert: {
          config_key: string
          config_value?: Json
          created_at?: string
          description?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          config_key?: string
          config_value?: Json
          created_at?: string
          description?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_health: {
        Row: {
          created_at: string
          details: Json | null
          error_message: string | null
          execution_time_ms: number
          function_name: string
          id: string
          memory_usage_mb: number | null
          processed_items: number | null
          status: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          error_message?: string | null
          execution_time_ms: number
          function_name: string
          id?: string
          memory_usage_mb?: number | null
          processed_items?: number | null
          status: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          error_message?: string | null
          execution_time_ms?: number
          function_name?: string
          id?: string
          memory_usage_mb?: number | null
          processed_items?: number | null
          status?: string
        }
        Relationships: []
      }
      system_learning_stats: {
        Row: {
          active_patterns: number | null
          id: string
          learning_effectiveness_score: number | null
          metadata: Json | null
          models_retrained_today: number | null
          modules_recalibrated_today: number | null
          patterns_discovered_total: number | null
          profit_factor: number | null
          self_healing_actions_today: number | null
          sharpe_ratio: number | null
          successful_actions_today: number | null
          thresholds_adjusted_today: number | null
          timestamp: string | null
          total_actions_today: number | null
          win_rate: number | null
        }
        Insert: {
          active_patterns?: number | null
          id?: string
          learning_effectiveness_score?: number | null
          metadata?: Json | null
          models_retrained_today?: number | null
          modules_recalibrated_today?: number | null
          patterns_discovered_total?: number | null
          profit_factor?: number | null
          self_healing_actions_today?: number | null
          sharpe_ratio?: number | null
          successful_actions_today?: number | null
          thresholds_adjusted_today?: number | null
          timestamp?: string | null
          total_actions_today?: number | null
          win_rate?: number | null
        }
        Update: {
          active_patterns?: number | null
          id?: string
          learning_effectiveness_score?: number | null
          metadata?: Json | null
          models_retrained_today?: number | null
          modules_recalibrated_today?: number | null
          patterns_discovered_total?: number | null
          profit_factor?: number | null
          self_healing_actions_today?: number | null
          sharpe_ratio?: number | null
          successful_actions_today?: number | null
          thresholds_adjusted_today?: number | null
          timestamp?: string | null
          total_actions_today?: number | null
          win_rate?: number | null
        }
        Relationships: []
      }
      system_performance_snapshots: {
        Row: {
          active_modules_count: number | null
          adaptive_thresholds: Json | null
          average_processing_time: number | null
          created_at: string | null
          error_count: number | null
          id: string
          module_performance_data: Json | null
          overall_win_rate: number | null
          snapshot_date: string
          system_reliability: number | null
          total_signals_executed: number | null
          total_signals_generated: number | null
        }
        Insert: {
          active_modules_count?: number | null
          adaptive_thresholds?: Json | null
          average_processing_time?: number | null
          created_at?: string | null
          error_count?: number | null
          id?: string
          module_performance_data?: Json | null
          overall_win_rate?: number | null
          snapshot_date?: string
          system_reliability?: number | null
          total_signals_executed?: number | null
          total_signals_generated?: number | null
        }
        Update: {
          active_modules_count?: number | null
          adaptive_thresholds?: Json | null
          average_processing_time?: number | null
          created_at?: string | null
          error_count?: number | null
          id?: string
          module_performance_data?: Json | null
          overall_win_rate?: number | null
          snapshot_date?: string
          system_reliability?: number | null
          total_signals_executed?: number | null
          total_signals_generated?: number | null
        }
        Relationships: []
      }
      tick_data: {
        Row: {
          ask: number
          bid: number
          created_at: string | null
          data_source: string | null
          id: string
          is_live: boolean | null
          session_type: string | null
          spread: number
          symbol: string
          tick_volume: number | null
          timestamp: string
        }
        Insert: {
          ask: number
          bid: number
          created_at?: string | null
          data_source?: string | null
          id?: string
          is_live?: boolean | null
          session_type?: string | null
          spread: number
          symbol?: string
          tick_volume?: number | null
          timestamp?: string
        }
        Update: {
          ask?: number
          bid?: number
          created_at?: string | null
          data_source?: string | null
          id?: string
          is_live?: boolean | null
          session_type?: string | null
          spread?: number
          symbol?: string
          tick_volume?: number | null
          timestamp?: string
        }
        Relationships: []
      }
      trade_decision_log: {
        Row: {
          calculated_lot_size: number | null
          created_at: string
          decision: string
          decision_reason: string
          expected_entry: number | null
          expected_sl: number | null
          expected_tp: number | null
          id: string
          market_conditions: Json | null
          metadata: Json | null
          quality_score: number | null
          rejection_filters: Json | null
          signal_id: string | null
        }
        Insert: {
          calculated_lot_size?: number | null
          created_at?: string
          decision: string
          decision_reason: string
          expected_entry?: number | null
          expected_sl?: number | null
          expected_tp?: number | null
          id?: string
          market_conditions?: Json | null
          metadata?: Json | null
          quality_score?: number | null
          rejection_filters?: Json | null
          signal_id?: string | null
        }
        Update: {
          calculated_lot_size?: number | null
          created_at?: string
          decision?: string
          decision_reason?: string
          expected_entry?: number | null
          expected_sl?: number | null
          expected_tp?: number | null
          id?: string
          market_conditions?: Json | null
          metadata?: Json | null
          quality_score?: number | null
          rejection_filters?: Json | null
          signal_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trade_decision_log_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "master_signals"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_execution_audit: {
        Row: {
          analysis_id: string | null
          created_at: string | null
          execution_timestamp: string | null
          id: string
          metadata: Json | null
          portfolio_id: string | null
          reason: string | null
          result: string
          signal_id: string | null
          trade_id: string | null
        }
        Insert: {
          analysis_id?: string | null
          created_at?: string | null
          execution_timestamp?: string | null
          id?: string
          metadata?: Json | null
          portfolio_id?: string | null
          reason?: string | null
          result: string
          signal_id?: string | null
          trade_id?: string | null
        }
        Update: {
          analysis_id?: string | null
          created_at?: string | null
          execution_timestamp?: string | null
          id?: string
          metadata?: Json | null
          portfolio_id?: string | null
          reason?: string | null
          result?: string
          signal_id?: string | null
          trade_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trade_execution_audit_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "shadow_portfolios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_execution_audit_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "shadow_trades"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_execution_log: {
        Row: {
          created_at: string
          data_freshness_ms: number | null
          execution_path: string
          execution_timestamp: string
          id: string
          price_deviation_percent: number | null
          signal_id: string | null
          trade_id: string | null
          validation_results: Json | null
        }
        Insert: {
          created_at?: string
          data_freshness_ms?: number | null
          execution_path: string
          execution_timestamp?: string
          id?: string
          price_deviation_percent?: number | null
          signal_id?: string | null
          trade_id?: string | null
          validation_results?: Json | null
        }
        Update: {
          created_at?: string
          data_freshness_ms?: number | null
          execution_path?: string
          execution_timestamp?: string
          id?: string
          price_deviation_percent?: number | null
          signal_id?: string | null
          trade_id?: string | null
          validation_results?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "trade_execution_log_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "master_signals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_execution_log_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "shadow_trades"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_execution_rate_limit: {
        Row: {
          created_at: string | null
          execution_count: number | null
          id: string
          last_execution_time: string
          portfolio_id: string
          signal_type: string
          symbol: string
        }
        Insert: {
          created_at?: string | null
          execution_count?: number | null
          id?: string
          last_execution_time?: string
          portfolio_id: string
          signal_type: string
          symbol: string
        }
        Update: {
          created_at?: string | null
          execution_count?: number | null
          id?: string
          last_execution_time?: string
          portfolio_id?: string
          signal_type?: string
          symbol?: string
        }
        Relationships: []
      }
      trade_history: {
        Row: {
          action_type: string
          balance_after: number
          balance_before: number
          commission: number | null
          created_at: string
          equity_after: number
          equity_before: number
          execution_price: number
          execution_time: string
          exit_factors: Json | null
          exit_price: number | null
          exit_reasoning: string | null
          exit_recommendation: string | null
          exit_score: number | null
          id: string
          lot_size: number
          margin_used: number | null
          master_signal_id: string | null
          original_trade_id: string | null
          portfolio_id: string | null
          profit: number
          profit_pips: number
          slippage_pips: number | null
          stop_loss: number | null
          swap: number | null
          symbol: string
          take_profit: number | null
          trade_type: string
        }
        Insert: {
          action_type: string
          balance_after: number
          balance_before: number
          commission?: number | null
          created_at?: string
          equity_after: number
          equity_before: number
          execution_price: number
          execution_time?: string
          exit_factors?: Json | null
          exit_price?: number | null
          exit_reasoning?: string | null
          exit_recommendation?: string | null
          exit_score?: number | null
          id?: string
          lot_size: number
          margin_used?: number | null
          master_signal_id?: string | null
          original_trade_id?: string | null
          portfolio_id?: string | null
          profit?: number
          profit_pips?: number
          slippage_pips?: number | null
          stop_loss?: number | null
          swap?: number | null
          symbol?: string
          take_profit?: number | null
          trade_type: string
        }
        Update: {
          action_type?: string
          balance_after?: number
          balance_before?: number
          commission?: number | null
          created_at?: string
          equity_after?: number
          equity_before?: number
          execution_price?: number
          execution_time?: string
          exit_factors?: Json | null
          exit_price?: number | null
          exit_reasoning?: string | null
          exit_recommendation?: string | null
          exit_score?: number | null
          id?: string
          lot_size?: number
          margin_used?: number | null
          master_signal_id?: string | null
          original_trade_id?: string | null
          portfolio_id?: string | null
          profit?: number
          profit_pips?: number
          slippage_pips?: number | null
          stop_loss?: number | null
          swap?: number | null
          symbol?: string
          take_profit?: number | null
          trade_type?: string
        }
        Relationships: []
      }
      trade_signals_enhanced: {
        Row: {
          confidence_score: number
          created_at: string | null
          entry_price: number
          execution_type: string | null
          expiry_time: string | null
          id: string
          indicators_used: string[] | null
          lot_size: number
          notes: string | null
          portfolio_id: string | null
          risk_reward_ratio: number | null
          signal_strength: number | null
          signal_type: string
          source: string | null
          status: string | null
          stop_loss: number | null
          strategy_name: string | null
          symbol: string
          take_profit: number | null
          timeframe: string
          updated_at: string | null
        }
        Insert: {
          confidence_score?: number
          created_at?: string | null
          entry_price: number
          execution_type?: string | null
          expiry_time?: string | null
          id?: string
          indicators_used?: string[] | null
          lot_size?: number
          notes?: string | null
          portfolio_id?: string | null
          risk_reward_ratio?: number | null
          signal_strength?: number | null
          signal_type: string
          source?: string | null
          status?: string | null
          stop_loss?: number | null
          strategy_name?: string | null
          symbol: string
          take_profit?: number | null
          timeframe: string
          updated_at?: string | null
        }
        Update: {
          confidence_score?: number
          created_at?: string | null
          entry_price?: number
          execution_type?: string | null
          expiry_time?: string | null
          id?: string
          indicators_used?: string[] | null
          lot_size?: number
          notes?: string | null
          portfolio_id?: string | null
          risk_reward_ratio?: number | null
          signal_strength?: number | null
          signal_type?: string
          source?: string | null
          status?: string | null
          stop_loss?: number | null
          strategy_name?: string | null
          symbol?: string
          take_profit?: number | null
          timeframe?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      trading_diagnostics: {
        Row: {
          created_at: string | null
          diagnostic_type: string
          error_message: string | null
          id: string
          latency_ms: number | null
          margin_calculation_valid: boolean | null
          metadata: Json | null
          pnl_accuracy: number | null
          price_source: string | null
          severity_level: string | null
          signal_modules_active: number | null
          spread_points: number | null
          symbol: string | null
          timestamp: string
        }
        Insert: {
          created_at?: string | null
          diagnostic_type: string
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          margin_calculation_valid?: boolean | null
          metadata?: Json | null
          pnl_accuracy?: number | null
          price_source?: string | null
          severity_level?: string | null
          signal_modules_active?: number | null
          spread_points?: number | null
          symbol?: string | null
          timestamp?: string
        }
        Update: {
          created_at?: string | null
          diagnostic_type?: string
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          margin_calculation_valid?: boolean | null
          metadata?: Json | null
          pnl_accuracy?: number | null
          price_source?: string | null
          severity_level?: string | null
          signal_modules_active?: number | null
          spread_points?: number | null
          symbol?: string | null
          timestamp?: string
        }
        Relationships: []
      }
      trading_instruments: {
        Row: {
          base_currency: string
          commission_type: string | null
          commission_value: number | null
          contract_size: number
          created_at: string | null
          display_name: string
          id: string
          instrument_type: string
          is_active: boolean | null
          lot_step: number
          margin_percentage: number | null
          max_lot_size: number
          min_lot_size: number
          pip_size: number
          quote_currency: string
          swap_long: number | null
          swap_short: number | null
          swap_type: string | null
          symbol: string
          tick_size: number
          tick_value: number
          trading_sessions: Json | null
          typical_spread: number
          updated_at: string | null
        }
        Insert: {
          base_currency: string
          commission_type?: string | null
          commission_value?: number | null
          contract_size?: number
          created_at?: string | null
          display_name: string
          id?: string
          instrument_type: string
          is_active?: boolean | null
          lot_step?: number
          margin_percentage?: number | null
          max_lot_size?: number
          min_lot_size?: number
          pip_size?: number
          quote_currency: string
          swap_long?: number | null
          swap_short?: number | null
          swap_type?: string | null
          symbol: string
          tick_size?: number
          tick_value?: number
          trading_sessions?: Json | null
          typical_spread?: number
          updated_at?: string | null
        }
        Update: {
          base_currency?: string
          commission_type?: string | null
          commission_value?: number | null
          contract_size?: number
          created_at?: string | null
          display_name?: string
          id?: string
          instrument_type?: string
          is_active?: boolean | null
          lot_step?: number
          margin_percentage?: number | null
          max_lot_size?: number
          min_lot_size?: number
          pip_size?: number
          quote_currency?: string
          swap_long?: number | null
          swap_short?: number | null
          swap_type?: string | null
          symbol?: string
          tick_size?: number
          tick_value?: number
          trading_sessions?: Json | null
          typical_spread?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      trading_signals: {
        Row: {
          alert_level: string
          confidence: number
          confluence_score: number
          created_at: string
          description: string
          entry_price: number
          execution_reason: string | null
          factors: Json
          id: string
          pair: string
          risk_reward_ratio: number
          session_id: string | null
          signal_id: string
          signal_type: string
          stop_loss: number
          strength: number
          take_profit: number
          updated_at: string
          user_id: string | null
          was_executed: boolean
        }
        Insert: {
          alert_level?: string
          confidence: number
          confluence_score: number
          created_at?: string
          description: string
          entry_price: number
          execution_reason?: string | null
          factors?: Json
          id?: string
          pair?: string
          risk_reward_ratio: number
          session_id?: string | null
          signal_id: string
          signal_type: string
          stop_loss: number
          strength: number
          take_profit: number
          updated_at?: string
          user_id?: string | null
          was_executed?: boolean
        }
        Update: {
          alert_level?: string
          confidence?: number
          confluence_score?: number
          created_at?: string
          description?: string
          entry_price?: number
          execution_reason?: string | null
          factors?: Json
          id?: string
          pair?: string
          risk_reward_ratio?: number
          session_id?: string | null
          signal_id?: string
          signal_type?: string
          stop_loss?: number
          strength?: number
          take_profit?: number
          updated_at?: string
          user_id?: string | null
          was_executed?: boolean
        }
        Relationships: []
      }
      volatility_metrics: {
        Row: {
          atr: number | null
          calculation_date: string
          created_at: string | null
          id: string
          implied_volatility: number | null
          realized_volatility: number | null
          symbol: string
          timeframe: string
          updated_at: string | null
          volatility_percentile: number | null
        }
        Insert: {
          atr?: number | null
          calculation_date?: string
          created_at?: string | null
          id?: string
          implied_volatility?: number | null
          realized_volatility?: number | null
          symbol?: string
          timeframe?: string
          updated_at?: string | null
          volatility_percentile?: number | null
        }
        Update: {
          atr?: number | null
          calculation_date?: string
          created_at?: string | null
          id?: string
          implied_volatility?: number | null
          realized_volatility?: number | null
          symbol?: string
          timeframe?: string
          updated_at?: string | null
          volatility_percentile?: number | null
        }
        Relationships: []
      }
      winning_patterns: {
        Row: {
          avg_pips: number
          avg_profit: number
          confidence_threshold: number
          created_at: string
          id: string
          is_active: boolean
          pattern_criteria: Json
          pattern_type: string
          sample_size: number
          updated_at: string
          win_rate: number
        }
        Insert: {
          avg_pips?: number
          avg_profit?: number
          confidence_threshold?: number
          created_at?: string
          id?: string
          is_active?: boolean
          pattern_criteria: Json
          pattern_type: string
          sample_size?: number
          updated_at?: string
          win_rate?: number
        }
        Update: {
          avg_pips?: number
          avg_profit?: number
          confidence_threshold?: number
          created_at?: string
          id?: string
          is_active?: boolean
          pattern_criteria?: Json
          pattern_type?: string
          sample_size?: number
          updated_at?: string
          win_rate?: number
        }
        Relationships: []
      }
    }
    Views: {
      trade_performance_summary: {
        Row: {
          avg_loss_amount: number | null
          avg_loss_pips: number | null
          avg_trade_duration_hours: number | null
          avg_win_amount: number | null
          avg_win_pips: number | null
          distinct_exit_reasons: number | null
          largest_loss: number | null
          largest_win: number | null
          losing_trades: number | null
          total_closed_trades: number | null
          total_open_trades: number | null
          total_realized_pnl: number | null
          total_unrealized_pnl: number | null
          win_rate_percent: number | null
          winning_trades: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      analyze_ml_exit_timing: {
        Args: { p_days_back?: number }
        Returns: {
          avg_profit_pips: number
          exit_scenario: string
          trade_count: number
          win_rate: number
        }[]
      }
      analyze_trade_performance: {
        Args: never
        Returns: {
          avg_profit: number
          pattern_type: string
          recommendation: string
          sample_size: number
          win_rate: number
        }[]
      }
      apply_intelligent_trailing_stop: {
        Args: { p_current_price: number; p_trade_id: string }
        Returns: Json
      }
      archive_old_trades: { Args: never; Returns: undefined }
      atomic_lock_signals: {
        Args: {
          p_limit?: number
          p_max_age_minutes?: number
          p_min_confluence_score?: number
        }
        Returns: {
          confluence_score: number
          created_at: string
          final_confidence: number
          id: string
          market_regime: string
          recommended_entry: number
          recommended_stop_loss: number
          recommended_take_profit: number
          signal_quality_score: number
          signal_type: string
          symbol: string
          timeframe: string
        }[]
      }
      auto_detect_support_resistance: { Args: never; Returns: undefined }
      calculate_dynamic_lot_size: {
        Args: {
          p_account_balance?: number
          p_portfolio_id: string
          p_quality_score: number
          p_risk_percent?: number
        }
        Returns: number
      }
      calculate_eurusd_pnl: {
        Args: {
          p_contract_size?: number
          p_current_price: number
          p_entry_price: number
          p_lot_size: number
          p_trade_type: string
        }
        Returns: {
          pip_value: number
          pips: number
          pnl_usd: number
        }[]
      }
      calculate_global_performance_metrics: { Args: never; Returns: undefined }
      calculate_module_performance: { Args: never; Returns: undefined }
      calculate_optimal_lot_size: {
        Args: {
          p_entry_price: number
          p_portfolio_id: string
          p_risk_percentage: number
          p_stop_loss: number
          p_symbol: string
        }
        Returns: Json
      }
      calculate_pattern_confluence: {
        Args: { p_price: number; p_price_range?: number; p_symbol: string }
        Returns: number
      }
      calculate_trade_pnl: {
        Args: { p_current_price: number; p_trade_id: string }
        Returns: {
          profit: number
          profit_pips: number
          unrealized_pnl: number
        }[]
      }
      calculate_trade_quality_score: {
        Args: {
          p_confluence_score?: number
          p_market_regime?: string
          p_signal_id: string
          p_volatility_percentile?: number
        }
        Returns: number
      }
      check_trade_integrity: {
        Args: never
        Returns: {
          actual_count: number
          check_name: string
          check_status: string
          details: string
          expected_count: number
        }[]
      }
      cleanup_anonymous_data: { Args: never; Returns: undefined }
      cleanup_expired_signal_locks: { Args: never; Returns: undefined }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      cleanup_stuck_jobs: { Args: never; Returns: undefined }
      close_shadow_trade: {
        Args: {
          p_close_lot_size?: number
          p_close_price: number
          p_close_reason?: string
          p_trade_id: string
        }
        Returns: Json
      }
      close_trade_with_balance_update: {
        Args: {
          p_exit_factors?: Json
          p_exit_price: number
          p_exit_reasoning?: string
          p_exit_recommendation?: string
          p_exit_score?: number
          p_exit_time?: string
          p_trade_id: string
        }
        Returns: {
          message: string
          new_balance: number
          profit_usd: number
          success: boolean
        }[]
      }
      create_daily_performance_snapshot: { Args: never; Returns: undefined }
      execute_advanced_order:
        | {
            Args: { p_order_data: Json; p_portfolio_id: string }
            Returns: Json
          }
        | {
            Args: {
              p_comment?: string
              p_entry_price?: number
              p_lot_size: number
              p_magic_number?: number
              p_order_type: string
              p_portfolio_id: string
              p_signal_id?: string
              p_stop_loss?: number
              p_symbol: string
              p_take_profit?: number
              p_trade_type: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_lot_size: number
              p_portfolio_id: string
              p_stop_loss?: number
              p_symbol: string
              p_take_profit?: number
              p_trade_type: string
            }
            Returns: Json
          }
      execute_global_shadow_trade: {
        Args: {
          p_comment?: string
          p_entry_price: number
          p_lot_size: number
          p_master_signal_id?: string
          p_signal_id?: string
          p_stop_loss: number
          p_symbol: string
          p_take_profit: number
          p_trade_type: string
        }
        Returns: string
      }
      get_account_defaults: {
        Args: { p_portfolio_id: string }
        Returns: {
          allowed_symbols: string[]
          auto_lot_sizing: boolean
          auto_sl_tp: boolean
          blacklist_symbols: string[]
          default_lot_size: number
          default_sl_pips: number
          default_tp_pips: number
          max_open_trades: number
          max_spread_pips: number
          risk_per_trade_percent: number
          trading_end_hour: number
          trading_hours_enabled: boolean
          trading_start_hour: number
        }[]
      }
      get_best_pattern_types: {
        Args: { p_min_trades?: number }
        Returns: {
          avg_profit_pips: number
          avg_profit_usd: number
          max_profit_pips: number
          pattern_type: string
          total_trades: number
          win_rate: number
          wins: number
        }[]
      }
      get_close_price_with_spread: {
        Args: {
          p_market_price: number
          p_spread?: number
          p_trade_type: string
        }
        Returns: number
      }
      get_global_trading_account: {
        Args: never
        Returns: {
          auto_trading_enabled: boolean
          average_loss: number
          average_win: number
          balance: number
          consecutive_losses: number
          consecutive_wins: number
          created_at: string
          current_drawdown: number
          equity: number
          floating_pnl: number
          free_margin: number
          id: string
          largest_loss: number
          largest_win: number
          leverage: number
          losing_trades: number
          margin: number
          margin_level: number
          max_drawdown: number
          max_equity: number
          max_open_positions: number
          peak_balance: number
          profit_factor: number
          sharpe_ratio: number
          total_commission: number
          total_swap: number
          total_trades: number
          updated_at: string
          used_margin: number
          win_rate: number
          winning_trades: number
        }[]
      }
      get_ml_model_versions_performance: {
        Args: never
        Returns: {
          actual_win_rate: number
          avg_profit_pips: number
          days_active: number
          model_version: string
          status: string
          trades_executed: number
          trained_date: string
          training_samples: number
          training_win_rate: number
        }[]
      }
      get_ml_performance_analytics: {
        Args: { p_days_back?: number }
        Returns: {
          improvement_percent: number
          metric_name: string
          ml_exits: number
          sample_size: number
          traditional_exits: number
        }[]
      }
      insert_master_signal: {
        Args: {
          p_analysis_id: string
          p_confidence: number
          p_confluence_score: number
          p_entry: number
          p_fusion_params?: Json
          p_lot_size: number
          p_market_snapshot?: Json
          p_modular_ids?: string[]
          p_modules?: string[]
          p_signal_type: string
          p_sl: number
          p_strength: number
          p_timeframe: string
          p_tp: number
        }
        Returns: string
      }
      link_pattern_to_trade: {
        Args: { p_pattern_signal_id: string; p_shadow_trade_id: string }
        Returns: undefined
      }
      log_trade_decision: {
        Args: {
          p_decision: string
          p_market_conditions?: Json
          p_metadata?: Json
          p_quality_score?: number
          p_reason: string
          p_signal_id: string
        }
        Returns: string
      }
      manage_break_even: { Args: never; Returns: undefined }
      reset_global_trading_account: { Args: never; Returns: Json }
      run_trading_diagnostics: {
        Args: never
        Returns: {
          check_name: string
          message: string
          status: string
          value: number
        }[]
      }
      should_trade_now: {
        Args: { p_min_quality_score?: number; p_symbol?: string }
        Returns: Json
      }
      update_eurusd_pnl: { Args: never; Returns: undefined }
      update_module_performance_from_trade: {
        Args: {
          p_confidence: number
          p_module_id: string
          p_return: number
          p_signal_successful: boolean
          p_strength: number
        }
        Returns: undefined
      }
      update_system_learning_stats: { Args: never; Returns: undefined }
      update_trailing_stops: { Args: never; Returns: undefined }
      update_winning_patterns: { Args: never; Returns: undefined }
      upsert_account_defaults: {
        Args: {
          p_allowed_symbols: string[]
          p_auto_lot_sizing: boolean
          p_auto_sl_tp: boolean
          p_blacklist_symbols: string[]
          p_default_lot_size: number
          p_default_sl_pips: number
          p_default_tp_pips: number
          p_max_open_trades: number
          p_max_spread_pips: number
          p_portfolio_id: string
          p_risk_per_trade_percent: number
          p_trading_end_hour: number
          p_trading_hours_enabled: boolean
          p_trading_start_hour: number
        }
        Returns: undefined
      }
      validate_entry_price: {
        Args: {
          p_entry_price: number
          p_symbol: string
          p_tick_timestamp: string
        }
        Returns: Json
      }
      validate_signal_freshness: {
        Args: { p_signal_id: string }
        Returns: Json
      }
      validate_signal_reproducibility: {
        Args: { p_analysis_id: string; p_signal_table?: string }
        Returns: Json
      }
      validate_trade_execution: {
        Args: {
          p_account_id?: string
          p_entry_price: number
          p_signal_id: string
          p_symbol: string
          p_tick_ask: number
          p_tick_bid: number
          p_tick_timestamp: string
        }
        Returns: Json
      }
      validate_trade_preflight: {
        Args: {
          p_confluence_score: number
          p_entry_price: number
          p_signal_type: string
          p_symbol: string
        }
        Returns: Json
      }
      verify_pnl_calculation: {
        Args: { p_trade_id: string }
        Returns: {
          calculated_pips: number
          calculated_pnl: number
          entry_price: number
          exit_price: number
          lot_size: number
          pips_match: boolean
          pnl_match: boolean
          stored_pips: number
          stored_pnl: number
          trade_id: string
          trade_type: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
