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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      account_defaults: {
        Row: {
          created_at: string | null
          id: string
          max_position_size: number | null
          min_signal_quality: number | null
          portfolio_id: string
          risk_per_trade: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          max_position_size?: number | null
          min_signal_quality?: number | null
          portfolio_id: string
          risk_per_trade?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          max_position_size?: number | null
          min_signal_quality?: number | null
          portfolio_id?: string
          risk_per_trade?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      adaptive_thresholds: {
        Row: {
          confidence_adaptive: number | null
          confluence_adaptive: number | null
          confluence_min: number | null
          created_at: string | null
          current_value: number | null
          edge_adaptive: number | null
          edge_min: number | null
          entropy_current: number | null
          entropy_max: number | null
          entropy_min: number | null
          id: string
          max_value: number | null
          min_value: number | null
          probability_buy: number | null
          probability_sell: number | null
          threshold_name: string
          updated_at: string | null
        }
        Insert: {
          confidence_adaptive?: number | null
          confluence_adaptive?: number | null
          confluence_min?: number | null
          created_at?: string | null
          current_value?: number | null
          edge_adaptive?: number | null
          edge_min?: number | null
          entropy_current?: number | null
          entropy_max?: number | null
          entropy_min?: number | null
          id?: string
          max_value?: number | null
          min_value?: number | null
          probability_buy?: number | null
          probability_sell?: number | null
          threshold_name: string
          updated_at?: string | null
        }
        Update: {
          confidence_adaptive?: number | null
          confluence_adaptive?: number | null
          confluence_min?: number | null
          created_at?: string | null
          current_value?: number | null
          edge_adaptive?: number | null
          edge_min?: number | null
          entropy_current?: number | null
          entropy_max?: number | null
          entropy_min?: number | null
          id?: string
          max_value?: number | null
          min_value?: number | null
          probability_buy?: number | null
          probability_sell?: number | null
          threshold_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      aggregated_candles: {
        Row: {
          close_price: number
          created_at: string
          high_price: number
          id: string
          is_complete: boolean | null
          low_price: number
          open_price: number
          symbol: string
          tick_count: number | null
          timeframe: string
          timestamp: string
          volume: number | null
        }
        Insert: {
          close_price: number
          created_at?: string
          high_price: number
          id?: string
          is_complete?: boolean | null
          low_price: number
          open_price: number
          symbol?: string
          tick_count?: number | null
          timeframe: string
          timestamp: string
          volume?: number | null
        }
        Update: {
          close_price?: number
          created_at?: string
          high_price?: number
          id?: string
          is_complete?: boolean | null
          low_price?: number
          open_price?: number
          symbol?: string
          tick_count?: number | null
          timeframe?: string
          timestamp?: string
          volume?: number | null
        }
        Relationships: []
      }
      correlations: {
        Row: {
          calculated_at: string | null
          correlation_coefficient: number | null
          id: string
          metadata: Json | null
          sample_size: number | null
          symbol_pair: string
          timeframe: string | null
        }
        Insert: {
          calculated_at?: string | null
          correlation_coefficient?: number | null
          id?: string
          metadata?: Json | null
          sample_size?: number | null
          symbol_pair: string
          timeframe?: string | null
        }
        Update: {
          calculated_at?: string | null
          correlation_coefficient?: number | null
          id?: string
          metadata?: Json | null
          sample_size?: number | null
          symbol_pair?: string
          timeframe?: string | null
        }
        Relationships: []
      }
      cot_reports: {
        Row: {
          change_long: number | null
          change_short: number | null
          created_at: string
          id: string
          long_positions: number | null
          metadata: Json | null
          net_position: number | null
          pair: string
          report_date: string
          short_positions: number | null
        }
        Insert: {
          change_long?: number | null
          change_short?: number | null
          created_at?: string
          id?: string
          long_positions?: number | null
          metadata?: Json | null
          net_position?: number | null
          pair: string
          report_date: string
          short_positions?: number | null
        }
        Update: {
          change_long?: number | null
          change_short?: number | null
          created_at?: string
          id?: string
          long_positions?: number | null
          metadata?: Json | null
          net_position?: number | null
          pair?: string
          report_date?: string
          short_positions?: number | null
        }
        Relationships: []
      }
      discovered_patterns: {
        Row: {
          confidence: number | null
          created_at: string
          deployed: boolean | null
          description: string | null
          frequency: number | null
          id: string
          is_active: boolean | null
          parameters: Json | null
          pattern_name: string | null
          pattern_type: string
          sample_size: number | null
          win_rate: number | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          deployed?: boolean | null
          description?: string | null
          frequency?: number | null
          id?: string
          is_active?: boolean | null
          parameters?: Json | null
          pattern_name?: string | null
          pattern_type: string
          sample_size?: number | null
          win_rate?: number | null
        }
        Update: {
          confidence?: number | null
          created_at?: string
          deployed?: boolean | null
          description?: string | null
          frequency?: number | null
          id?: string
          is_active?: boolean | null
          parameters?: Json | null
          pattern_name?: string | null
          pattern_type?: string
          sample_size?: number | null
          win_rate?: number | null
        }
        Relationships: []
      }
      economic_calendar: {
        Row: {
          actual: string | null
          actual_value: number | null
          country: string | null
          created_at: string
          currency: string | null
          event_name: string
          event_time: string
          forecast: string | null
          forecast_value: number | null
          id: string
          impact: string | null
          metadata: Json | null
          previous: string | null
          previous_value: number | null
        }
        Insert: {
          actual?: string | null
          actual_value?: number | null
          country?: string | null
          created_at?: string
          currency?: string | null
          event_name: string
          event_time: string
          forecast?: string | null
          forecast_value?: number | null
          id?: string
          impact?: string | null
          metadata?: Json | null
          previous?: string | null
          previous_value?: number | null
        }
        Update: {
          actual?: string | null
          actual_value?: number | null
          country?: string | null
          created_at?: string
          currency?: string | null
          event_name?: string
          event_time?: string
          forecast?: string | null
          forecast_value?: number | null
          id?: string
          impact?: string | null
          metadata?: Json | null
          previous?: string | null
          previous_value?: number | null
        }
        Relationships: []
      }
      exit_intelligence: {
        Row: {
          check_timestamp: string
          confidence: number | null
          factors: Json | null
          holding_time_minutes: number | null
          id: string
          overall_score: number | null
          reasoning: string | null
          recommendation: string | null
          trade_id: string | null
        }
        Insert: {
          check_timestamp?: string
          confidence?: number | null
          factors?: Json | null
          holding_time_minutes?: number | null
          id?: string
          overall_score?: number | null
          reasoning?: string | null
          recommendation?: string | null
          trade_id?: string | null
        }
        Update: {
          check_timestamp?: string
          confidence?: number | null
          factors?: Json | null
          holding_time_minutes?: number | null
          id?: string
          overall_score?: number | null
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
      function_execution_locks: {
        Row: {
          function_name: string
          id: string
          lock_id: string | null
          locked_at: string
        }
        Insert: {
          function_name: string
          id?: string
          lock_id?: string | null
          locked_at?: string
        }
        Update: {
          function_name?: string
          id?: string
          lock_id?: string | null
          locked_at?: string
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
          total_pnl: number
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
          total_pnl?: number
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
          total_pnl?: number
          total_swap?: number
          total_trades?: number
          updated_at?: string
          used_margin?: number
          win_rate?: number
          winning_trades?: number
        }
        Relationships: []
      }
      intelligence_backtests: {
        Row: {
          created_at: string | null
          end_date: string | null
          id: string
          max_drawdown: number | null
          parameters: Json | null
          profit_factor: number | null
          results: Json | null
          sharpe_ratio: number | null
          start_date: string | null
          strategy_name: string | null
          symbol: string | null
          timeframe: string | null
          total_pnl: number | null
          total_trades: number | null
          win_rate: number | null
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          max_drawdown?: number | null
          parameters?: Json | null
          profit_factor?: number | null
          results?: Json | null
          sharpe_ratio?: number | null
          start_date?: string | null
          strategy_name?: string | null
          symbol?: string | null
          timeframe?: string | null
          total_pnl?: number | null
          total_trades?: number | null
          win_rate?: number | null
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          max_drawdown?: number | null
          parameters?: Json | null
          profit_factor?: number | null
          results?: Json | null
          sharpe_ratio?: number | null
          start_date?: string | null
          strategy_name?: string | null
          symbol?: string | null
          timeframe?: string | null
          total_pnl?: number | null
          total_trades?: number | null
          win_rate?: number | null
        }
        Relationships: []
      }
      intelligent_targets: {
        Row: {
          actual_sl: number | null
          actual_tp: number | null
          confidence: number | null
          created_at: string | null
          entry_price: number | null
          factors: Json | null
          id: string
          key_levels: Json | null
          market_context: Json | null
          reasoning: string | null
          recommended_tp1: number | null
          recommended_tp2: number | null
          recommended_tp3: number | null
          risk_reward: number | null
          suggested_sl: number | null
          suggested_tp: number | null
          trade_id: string | null
          updated_at: string | null
        }
        Insert: {
          actual_sl?: number | null
          actual_tp?: number | null
          confidence?: number | null
          created_at?: string | null
          entry_price?: number | null
          factors?: Json | null
          id?: string
          key_levels?: Json | null
          market_context?: Json | null
          reasoning?: string | null
          recommended_tp1?: number | null
          recommended_tp2?: number | null
          recommended_tp3?: number | null
          risk_reward?: number | null
          suggested_sl?: number | null
          suggested_tp?: number | null
          trade_id?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_sl?: number | null
          actual_tp?: number | null
          confidence?: number | null
          created_at?: string | null
          entry_price?: number | null
          factors?: Json | null
          id?: string
          key_levels?: Json | null
          market_context?: Json | null
          reasoning?: string | null
          recommended_tp1?: number | null
          recommended_tp2?: number | null
          recommended_tp3?: number | null
          risk_reward?: number | null
          suggested_sl?: number | null
          suggested_tp?: number | null
          trade_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      learning_actions: {
        Row: {
          action_type: string
          created_at: string
          description: string | null
          id: string
          impact_score: number | null
          module: string | null
          parameters: Json | null
          result: Json | null
          success: boolean | null
          trigger_reason: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          description?: string | null
          id?: string
          impact_score?: number | null
          module?: string | null
          parameters?: Json | null
          result?: Json | null
          success?: boolean | null
          trigger_reason?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          description?: string | null
          id?: string
          impact_score?: number | null
          module?: string | null
          parameters?: Json | null
          result?: Json | null
          success?: boolean | null
          trigger_reason?: string | null
        }
        Relationships: []
      }
      market_data_enhanced: {
        Row: {
          close: number | null
          close_price: number | null
          created_at: string
          high: number | null
          id: string
          indicators: Json | null
          low: number | null
          open: number | null
          symbol: string
          timeframe: string
          timestamp: string
          volume: number | null
        }
        Insert: {
          close?: number | null
          close_price?: number | null
          created_at?: string
          high?: number | null
          id?: string
          indicators?: Json | null
          low?: number | null
          open?: number | null
          symbol?: string
          timeframe: string
          timestamp?: string
          volume?: number | null
        }
        Update: {
          close?: number | null
          close_price?: number | null
          created_at?: string
          high?: number | null
          id?: string
          indicators?: Json | null
          low?: number | null
          open?: number | null
          symbol?: string
          timeframe?: string
          timestamp?: string
          volume?: number | null
        }
        Relationships: []
      }
      market_data_feed: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          price: number
          source: string | null
          symbol: string
          timestamp: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          price: number
          source?: string | null
          symbol: string
          timestamp?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          price?: number
          source?: string | null
          symbol?: string
          timestamp?: string
        }
        Relationships: []
      }
      master_signals: {
        Row: {
          actual_outcome: string | null
          analysis_id: string | null
          confluence_score: number | null
          contributing_modules: string[] | null
          created_at: string
          final_confidence: number | null
          final_strength: number | null
          fusion_algorithm: string | null
          fusion_parameters: Json | null
          id: string
          market_data_snapshot: Json | null
          market_regime: string | null
          modular_signal_ids: string[] | null
          recommended_entry: number | null
          recommended_lot_size: number | null
          recommended_stop_loss: number | null
          recommended_take_profit: number | null
          rejection_reason: string | null
          risk_reward_ratio: number | null
          signal_hash: string | null
          signal_quality_score: number | null
          signal_type: string | null
          status: string | null
          symbol: string
          timeframe: string | null
          updated_at: string
        }
        Insert: {
          actual_outcome?: string | null
          analysis_id?: string | null
          confluence_score?: number | null
          contributing_modules?: string[] | null
          created_at?: string
          final_confidence?: number | null
          final_strength?: number | null
          fusion_algorithm?: string | null
          fusion_parameters?: Json | null
          id?: string
          market_data_snapshot?: Json | null
          market_regime?: string | null
          modular_signal_ids?: string[] | null
          recommended_entry?: number | null
          recommended_lot_size?: number | null
          recommended_stop_loss?: number | null
          recommended_take_profit?: number | null
          rejection_reason?: string | null
          risk_reward_ratio?: number | null
          signal_hash?: string | null
          signal_quality_score?: number | null
          signal_type?: string | null
          status?: string | null
          symbol?: string
          timeframe?: string | null
          updated_at?: string
        }
        Update: {
          actual_outcome?: string | null
          analysis_id?: string | null
          confluence_score?: number | null
          contributing_modules?: string[] | null
          created_at?: string
          final_confidence?: number | null
          final_strength?: number | null
          fusion_algorithm?: string | null
          fusion_parameters?: Json | null
          id?: string
          market_data_snapshot?: Json | null
          market_regime?: string | null
          modular_signal_ids?: string[] | null
          recommended_entry?: number | null
          recommended_lot_size?: number | null
          recommended_stop_loss?: number | null
          recommended_take_profit?: number | null
          rejection_reason?: string | null
          risk_reward_ratio?: number | null
          signal_hash?: string | null
          signal_quality_score?: number | null
          signal_type?: string | null
          status?: string | null
          symbol?: string
          timeframe?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      master_signals_fusion: {
        Row: {
          analysis_id: string | null
          confidence: number | null
          confidence_score: number | null
          contributing_signals: Json | null
          created_at: string
          fusion_decision: string | null
          fusion_details: Json | null
          fusion_method: string | null
          fusion_reasoning: string | null
          id: string
          input_signals: Json | null
          market_conditions: Json | null
          master_signal_id: string | null
          result: Json | null
          risk_assessment: Json | null
          signal_type: string | null
          symbol: string | null
          timeframe: string | null
          weighted_score: number | null
          weights: Json | null
        }
        Insert: {
          analysis_id?: string | null
          confidence?: number | null
          confidence_score?: number | null
          contributing_signals?: Json | null
          created_at?: string
          fusion_decision?: string | null
          fusion_details?: Json | null
          fusion_method?: string | null
          fusion_reasoning?: string | null
          id?: string
          input_signals?: Json | null
          market_conditions?: Json | null
          master_signal_id?: string | null
          result?: Json | null
          risk_assessment?: Json | null
          signal_type?: string | null
          symbol?: string | null
          timeframe?: string | null
          weighted_score?: number | null
          weights?: Json | null
        }
        Update: {
          analysis_id?: string | null
          confidence?: number | null
          confidence_score?: number | null
          contributing_signals?: Json | null
          created_at?: string
          fusion_decision?: string | null
          fusion_details?: Json | null
          fusion_method?: string | null
          fusion_reasoning?: string | null
          id?: string
          input_signals?: Json | null
          market_conditions?: Json | null
          master_signal_id?: string | null
          result?: Json | null
          risk_assessment?: Json | null
          signal_type?: string | null
          symbol?: string | null
          timeframe?: string | null
          weighted_score?: number | null
          weights?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "master_signals_fusion_master_signal_id_fkey"
            columns: ["master_signal_id"]
            isOneToOne: false
            referencedRelation: "master_signals"
            referencedColumns: ["id"]
          },
        ]
      }
      ml_exit_models: {
        Row: {
          accuracy: number | null
          created_at: string
          id: string
          is_active: boolean | null
          model_data: Json | null
          model_version: string
          training_metrics: Json | null
        }
        Insert: {
          accuracy?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          model_data?: Json | null
          model_version: string
          training_metrics?: Json | null
        }
        Update: {
          accuracy?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          model_data?: Json | null
          model_version?: string
          training_metrics?: Json | null
        }
        Relationships: []
      }
      modular_signals: {
        Row: {
          analysis_id: string | null
          calculation_parameters: Json | null
          confidence: number | null
          created_at: string
          id: string
          market_data_snapshot: Json | null
          market_session: string | null
          module_id: string
          module_version: string | null
          signal_type: string | null
          strength: number | null
          suggested_entry: number | null
          suggested_stop_loss: number | null
          suggested_take_profit: number | null
          symbol: string
          timeframe: string | null
          trend_context: string | null
          trigger_price: number | null
          volatility_regime: string | null
          weight: number | null
        }
        Insert: {
          analysis_id?: string | null
          calculation_parameters?: Json | null
          confidence?: number | null
          created_at?: string
          id?: string
          market_data_snapshot?: Json | null
          market_session?: string | null
          module_id: string
          module_version?: string | null
          signal_type?: string | null
          strength?: number | null
          suggested_entry?: number | null
          suggested_stop_loss?: number | null
          suggested_take_profit?: number | null
          symbol?: string
          timeframe?: string | null
          trend_context?: string | null
          trigger_price?: number | null
          volatility_regime?: string | null
          weight?: number | null
        }
        Update: {
          analysis_id?: string | null
          calculation_parameters?: Json | null
          confidence?: number | null
          created_at?: string
          id?: string
          market_data_snapshot?: Json | null
          market_session?: string | null
          module_id?: string
          module_version?: string | null
          signal_type?: string | null
          strength?: number | null
          suggested_entry?: number | null
          suggested_stop_loss?: number | null
          suggested_take_profit?: number | null
          symbol?: string
          timeframe?: string | null
          trend_context?: string | null
          trigger_price?: number | null
          volatility_regime?: string | null
          weight?: number | null
        }
        Relationships: []
      }
      module_health: {
        Row: {
          error_count: number | null
          health_score: number | null
          id: string
          last_run: string | null
          last_signal_time: string | null
          metadata: Json | null
          module_id: string | null
          module_name: string
          performance_score: number | null
          signals_generated_today: number | null
          status: string | null
          updated_at: string
          warning_count: number | null
        }
        Insert: {
          error_count?: number | null
          health_score?: number | null
          id?: string
          last_run?: string | null
          last_signal_time?: string | null
          metadata?: Json | null
          module_id?: string | null
          module_name: string
          performance_score?: number | null
          signals_generated_today?: number | null
          status?: string | null
          updated_at?: string
          warning_count?: number | null
        }
        Update: {
          error_count?: number | null
          health_score?: number | null
          id?: string
          last_run?: string | null
          last_signal_time?: string | null
          metadata?: Json | null
          module_id?: string | null
          module_name?: string
          performance_score?: number | null
          signals_generated_today?: number | null
          status?: string | null
          updated_at?: string
          warning_count?: number | null
        }
        Relationships: []
      }
      module_performance: {
        Row: {
          average_confidence: number | null
          average_return: number | null
          average_strength: number | null
          failed_signals: number | null
          id: string
          information_ratio: number | null
          last_updated: string | null
          max_drawdown: number | null
          module_id: string
          module_name: string | null
          recent_performance: Json | null
          reliability: number | null
          sharpe_ratio: number | null
          signals_generated: number | null
          status: string | null
          successful_signals: number | null
          total_signals: number | null
          trend: string | null
          win_rate: number | null
        }
        Insert: {
          average_confidence?: number | null
          average_return?: number | null
          average_strength?: number | null
          failed_signals?: number | null
          id?: string
          information_ratio?: number | null
          last_updated?: string | null
          max_drawdown?: number | null
          module_id: string
          module_name?: string | null
          recent_performance?: Json | null
          reliability?: number | null
          sharpe_ratio?: number | null
          signals_generated?: number | null
          status?: string | null
          successful_signals?: number | null
          total_signals?: number | null
          trend?: string | null
          win_rate?: number | null
        }
        Update: {
          average_confidence?: number | null
          average_return?: number | null
          average_strength?: number | null
          failed_signals?: number | null
          id?: string
          information_ratio?: number | null
          last_updated?: string | null
          max_drawdown?: number | null
          module_id?: string
          module_name?: string | null
          recent_performance?: Json | null
          reliability?: number | null
          sharpe_ratio?: number | null
          signals_generated?: number | null
          status?: string | null
          successful_signals?: number | null
          total_signals?: number | null
          trend?: string | null
          win_rate?: number | null
        }
        Relationships: []
      }
      news_events: {
        Row: {
          created_at: string
          headline: string
          id: string
          impact: string | null
          metadata: Json | null
          published_at: string | null
          relevance_score: number | null
          sentiment: number | null
          sentiment_score: number | null
          source: string | null
          symbol: string | null
          url: string | null
        }
        Insert: {
          created_at?: string
          headline: string
          id?: string
          impact?: string | null
          metadata?: Json | null
          published_at?: string | null
          relevance_score?: number | null
          sentiment?: number | null
          sentiment_score?: number | null
          source?: string | null
          symbol?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string
          headline?: string
          id?: string
          impact?: string | null
          metadata?: Json | null
          published_at?: string | null
          relevance_score?: number | null
          sentiment?: number | null
          sentiment_score?: number | null
          source?: string | null
          symbol?: string | null
          url?: string | null
        }
        Relationships: []
      }
      retail_positions: {
        Row: {
          created_at: string
          id: string
          long_percentage: number | null
          short_percentage: number | null
          source: string | null
          symbol: string
          timestamp: string
        }
        Insert: {
          created_at?: string
          id?: string
          long_percentage?: number | null
          short_percentage?: number | null
          source?: string | null
          symbol: string
          timestamp?: string
        }
        Update: {
          created_at?: string
          id?: string
          long_percentage?: number | null
          short_percentage?: number | null
          source?: string | null
          symbol?: string
          timestamp?: string
        }
        Relationships: []
      }
      shadow_trades: {
        Row: {
          comment: string | null
          commission: number | null
          contract_size: number | null
          created_at: string
          current_price: number | null
          entry_price: number
          entry_time: string
          execution_timestamp: string | null
          exit_check_count: number | null
          exit_intelligence_score: number | null
          exit_price: number | null
          exit_reason: string | null
          exit_time: string | null
          id: string
          intelligence_exit_triggered: boolean | null
          lot_size: number
          magic_number: number | null
          master_signal_id: string | null
          metadata: Json | null
          order_type: string | null
          pnl: number | null
          portfolio_id: string | null
          position_size: number | null
          price_source: string | null
          price_timestamp: string | null
          profit: number | null
          profit_pips: number | null
          signal_id: string | null
          status: string
          stop_loss: number | null
          swap: number | null
          symbol: string
          take_profit: number | null
          trade_type: string
          unrealized_pnl: number | null
          updated_at: string
        }
        Insert: {
          comment?: string | null
          commission?: number | null
          contract_size?: number | null
          created_at?: string
          current_price?: number | null
          entry_price: number
          entry_time?: string
          execution_timestamp?: string | null
          exit_check_count?: number | null
          exit_intelligence_score?: number | null
          exit_price?: number | null
          exit_reason?: string | null
          exit_time?: string | null
          id?: string
          intelligence_exit_triggered?: boolean | null
          lot_size?: number
          magic_number?: number | null
          master_signal_id?: string | null
          metadata?: Json | null
          order_type?: string | null
          pnl?: number | null
          portfolio_id?: string | null
          position_size?: number | null
          price_source?: string | null
          price_timestamp?: string | null
          profit?: number | null
          profit_pips?: number | null
          signal_id?: string | null
          status?: string
          stop_loss?: number | null
          swap?: number | null
          symbol?: string
          take_profit?: number | null
          trade_type: string
          unrealized_pnl?: number | null
          updated_at?: string
        }
        Update: {
          comment?: string | null
          commission?: number | null
          contract_size?: number | null
          created_at?: string
          current_price?: number | null
          entry_price?: number
          entry_time?: string
          execution_timestamp?: string | null
          exit_check_count?: number | null
          exit_intelligence_score?: number | null
          exit_price?: number | null
          exit_reason?: string | null
          exit_time?: string | null
          id?: string
          intelligence_exit_triggered?: boolean | null
          lot_size?: number
          magic_number?: number | null
          master_signal_id?: string | null
          metadata?: Json | null
          order_type?: string | null
          pnl?: number | null
          portfolio_id?: string | null
          position_size?: number | null
          price_source?: string | null
          price_timestamp?: string | null
          profit?: number | null
          profit_pips?: number | null
          signal_id?: string | null
          status?: string
          stop_loss?: number | null
          swap?: number | null
          symbol?: string
          take_profit?: number | null
          trade_type?: string
          unrealized_pnl?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shadow_trades_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "global_trading_account"
            referencedColumns: ["id"]
          },
        ]
      }
      signal_rejection_logs: {
        Row: {
          confluence_score: number | null
          created_at: string
          details: Json | null
          entropy: number | null
          factors_count: number | null
          id: string
          market_regime: string | null
          net_edge: number | null
          probability: number | null
          reason: string
          signal_id: string | null
          signal_type: string | null
          threshold: number | null
          value: number | null
        }
        Insert: {
          confluence_score?: number | null
          created_at?: string
          details?: Json | null
          entropy?: number | null
          factors_count?: number | null
          id?: string
          market_regime?: string | null
          net_edge?: number | null
          probability?: number | null
          reason: string
          signal_id?: string | null
          signal_type?: string | null
          threshold?: number | null
          value?: number | null
        }
        Update: {
          confluence_score?: number | null
          created_at?: string
          details?: Json | null
          entropy?: number | null
          factors_count?: number | null
          id?: string
          market_regime?: string | null
          net_edge?: number | null
          probability?: number | null
          reason?: string
          signal_id?: string | null
          signal_type?: string | null
          threshold?: number | null
          value?: number | null
        }
        Relationships: []
      }
      system_health: {
        Row: {
          created_at: string
          error_message: string | null
          execution_time_ms: number | null
          function_name: string
          id: string
          metadata: Json | null
          processed_items: number | null
          status: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          function_name: string
          id?: string
          metadata?: Json | null
          processed_items?: number | null
          status?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          function_name?: string
          id?: string
          metadata?: Json | null
          processed_items?: number | null
          status?: string | null
        }
        Relationships: []
      }
      system_learning_stats: {
        Row: {
          id: string
          last_optimization: string | null
          learning_rate: number | null
          metadata: Json | null
          model_accuracy: number | null
          modules_calibrated: number | null
          patterns_discovered: number | null
          timestamp: string
          total_adaptations: number | null
        }
        Insert: {
          id?: string
          last_optimization?: string | null
          learning_rate?: number | null
          metadata?: Json | null
          model_accuracy?: number | null
          modules_calibrated?: number | null
          patterns_discovered?: number | null
          timestamp?: string
          total_adaptations?: number | null
        }
        Update: {
          id?: string
          last_optimization?: string | null
          learning_rate?: number | null
          metadata?: Json | null
          model_accuracy?: number | null
          modules_calibrated?: number | null
          patterns_discovered?: number | null
          timestamp?: string
          total_adaptations?: number | null
        }
        Relationships: []
      }
      tick_data: {
        Row: {
          ask: number | null
          bid: number | null
          data_source: string | null
          id: string
          is_live: boolean | null
          price: number | null
          session_type: string | null
          source: string | null
          spread: number | null
          symbol: string
          tick_volume: number | null
          timestamp: string
          volume: number | null
        }
        Insert: {
          ask?: number | null
          bid?: number | null
          data_source?: string | null
          id?: string
          is_live?: boolean | null
          price?: number | null
          session_type?: string | null
          source?: string | null
          spread?: number | null
          symbol?: string
          tick_volume?: number | null
          timestamp?: string
          volume?: number | null
        }
        Update: {
          ask?: number | null
          bid?: number | null
          data_source?: string | null
          id?: string
          is_live?: boolean | null
          price?: number | null
          session_type?: string | null
          source?: string | null
          spread?: number | null
          symbol?: string
          tick_volume?: number | null
          timestamp?: string
          volume?: number | null
        }
        Relationships: []
      }
      trade_execution_log: {
        Row: {
          action: string
          created_at: string
          data_freshness_ms: number | null
          details: Json | null
          execution_path: string | null
          execution_timestamp: string
          id: string
          price_deviation_percent: number | null
          signal_id: string | null
          trade_id: string | null
          validation_results: Json | null
        }
        Insert: {
          action: string
          created_at?: string
          data_freshness_ms?: number | null
          details?: Json | null
          execution_path?: string | null
          execution_timestamp?: string
          id?: string
          price_deviation_percent?: number | null
          signal_id?: string | null
          trade_id?: string | null
          validation_results?: Json | null
        }
        Update: {
          action?: string
          created_at?: string
          data_freshness_ms?: number | null
          details?: Json | null
          execution_path?: string | null
          execution_timestamp?: string
          id?: string
          price_deviation_percent?: number | null
          signal_id?: string | null
          trade_id?: string | null
          validation_results?: Json | null
        }
        Relationships: []
      }
      trade_performance_summary: {
        Row: {
          average_loss: number | null
          average_win: number | null
          avg_loss_amount: number | null
          avg_loss_pips: number | null
          avg_trade_duration_hours: number | null
          avg_trade_duration_minutes: number | null
          avg_win_amount: number | null
          avg_win_pips: number | null
          best_trade: Json | null
          created_at: string | null
          id: string
          largest_loss: number | null
          largest_win: number | null
          losing_trades: number | null
          max_drawdown: number | null
          monthly_returns: Json | null
          profit_factor: number | null
          sharpe_ratio: number | null
          total_closed_trades: number | null
          total_open_trades: number | null
          total_pnl: number | null
          total_realized_pnl: number | null
          total_unrealized_pnl: number | null
          updated_at: string | null
          win_rate: number | null
          win_rate_percent: number | null
          winning_trades: number | null
          worst_trade: Json | null
        }
        Insert: {
          average_loss?: number | null
          average_win?: number | null
          avg_loss_amount?: number | null
          avg_loss_pips?: number | null
          avg_trade_duration_hours?: number | null
          avg_trade_duration_minutes?: number | null
          avg_win_amount?: number | null
          avg_win_pips?: number | null
          best_trade?: Json | null
          created_at?: string | null
          id?: string
          largest_loss?: number | null
          largest_win?: number | null
          losing_trades?: number | null
          max_drawdown?: number | null
          monthly_returns?: Json | null
          profit_factor?: number | null
          sharpe_ratio?: number | null
          total_closed_trades?: number | null
          total_open_trades?: number | null
          total_pnl?: number | null
          total_realized_pnl?: number | null
          total_unrealized_pnl?: number | null
          updated_at?: string | null
          win_rate?: number | null
          win_rate_percent?: number | null
          winning_trades?: number | null
          worst_trade?: Json | null
        }
        Update: {
          average_loss?: number | null
          average_win?: number | null
          avg_loss_amount?: number | null
          avg_loss_pips?: number | null
          avg_trade_duration_hours?: number | null
          avg_trade_duration_minutes?: number | null
          avg_win_amount?: number | null
          avg_win_pips?: number | null
          best_trade?: Json | null
          created_at?: string | null
          id?: string
          largest_loss?: number | null
          largest_win?: number | null
          losing_trades?: number | null
          max_drawdown?: number | null
          monthly_returns?: Json | null
          profit_factor?: number | null
          sharpe_ratio?: number | null
          total_closed_trades?: number | null
          total_open_trades?: number | null
          total_pnl?: number | null
          total_realized_pnl?: number | null
          total_unrealized_pnl?: number | null
          updated_at?: string | null
          win_rate?: number | null
          win_rate_percent?: number | null
          winning_trades?: number | null
          worst_trade?: Json | null
        }
        Relationships: []
      }
      trading_signals: {
        Row: {
          alert_level: string | null
          confidence: number | null
          confluence_score: number | null
          created_at: string
          description: string | null
          entry_price: number | null
          factors: Json | null
          id: string
          lot_size: number | null
          metadata: Json | null
          outcome: string | null
          pair: string | null
          pnl: number | null
          risk_reward_ratio: number | null
          signal_id: string | null
          signal_type: string | null
          stop_loss: number | null
          strength: number | null
          symbol: string | null
          take_profit: number | null
          was_executed: boolean | null
        }
        Insert: {
          alert_level?: string | null
          confidence?: number | null
          confluence_score?: number | null
          created_at?: string
          description?: string | null
          entry_price?: number | null
          factors?: Json | null
          id?: string
          lot_size?: number | null
          metadata?: Json | null
          outcome?: string | null
          pair?: string | null
          pnl?: number | null
          risk_reward_ratio?: number | null
          signal_id?: string | null
          signal_type?: string | null
          stop_loss?: number | null
          strength?: number | null
          symbol?: string | null
          take_profit?: number | null
          was_executed?: boolean | null
        }
        Update: {
          alert_level?: string | null
          confidence?: number | null
          confluence_score?: number | null
          created_at?: string
          description?: string | null
          entry_price?: number | null
          factors?: Json | null
          id?: string
          lot_size?: number | null
          metadata?: Json | null
          outcome?: string | null
          pair?: string | null
          pnl?: number | null
          risk_reward_ratio?: number | null
          signal_id?: string | null
          signal_type?: string | null
          stop_loss?: number | null
          strength?: number | null
          symbol?: string | null
          take_profit?: number | null
          was_executed?: boolean | null
        }
        Relationships: []
      }
      winning_patterns: {
        Row: {
          avg_pips: number | null
          avg_pnl: number | null
          avg_profit: number | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          pattern_criteria: Json | null
          pattern_type: string | null
          sample_size: number | null
          win_rate: number | null
        }
        Insert: {
          avg_pips?: number | null
          avg_pnl?: number | null
          avg_profit?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          pattern_criteria?: Json | null
          pattern_type?: string | null
          sample_size?: number | null
          win_rate?: number | null
        }
        Update: {
          avg_pips?: number | null
          avg_pnl?: number | null
          avg_profit?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          pattern_criteria?: Json | null
          pattern_type?: string | null
          sample_size?: number | null
          win_rate?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      analyze_trade_performance: { Args: never; Returns: Json }
      atomic_lock_signals: {
        Args: {
          p_limit?: number
          p_max_age_minutes?: number
          p_min_confluence_score?: number
        }
        Returns: {
          actual_outcome: string | null
          analysis_id: string | null
          confluence_score: number | null
          contributing_modules: string[] | null
          created_at: string
          final_confidence: number | null
          final_strength: number | null
          fusion_algorithm: string | null
          fusion_parameters: Json | null
          id: string
          market_data_snapshot: Json | null
          market_regime: string | null
          modular_signal_ids: string[] | null
          recommended_entry: number | null
          recommended_lot_size: number | null
          recommended_stop_loss: number | null
          recommended_take_profit: number | null
          rejection_reason: string | null
          risk_reward_ratio: number | null
          signal_hash: string | null
          signal_quality_score: number | null
          signal_type: string | null
          status: string | null
          symbol: string
          timeframe: string | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "master_signals"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      calculate_optimal_lot_size: {
        Args: {
          p_account_balance: number
          p_risk_percentage: number
          p_stop_loss_pips: number
        }
        Returns: number
      }
      close_shadow_trade: {
        Args: {
          p_close_lot_size?: number
          p_close_price: number
          p_close_reason?: string
          p_trade_id: string
        }
        Returns: Json
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
          total_pnl: number
          total_swap: number
          total_trades: number
          updated_at: string
          used_margin: number
          win_rate: number
          winning_trades: number
        }[]
        SetofOptions: {
          from: "*"
          to: "global_trading_account"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_ml_performance_analytics: { Args: never; Returns: Json }
      run_trading_diagnostics: { Args: never; Returns: Json }
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
