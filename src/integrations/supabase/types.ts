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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      account_defaults: {
        Row: {
          created_at: string | null
          default_lot_size: number | null
          default_stop_loss_pips: number | null
          default_take_profit_pips: number | null
          id: string
          max_daily_trades: number | null
          max_open_positions: number | null
          risk_percentage: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          default_lot_size?: number | null
          default_stop_loss_pips?: number | null
          default_take_profit_pips?: number | null
          id?: string
          max_daily_trades?: number | null
          max_open_positions?: number | null
          risk_percentage?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          default_lot_size?: number | null
          default_stop_loss_pips?: number | null
          default_take_profit_pips?: number | null
          id?: string
          max_daily_trades?: number | null
          max_open_positions?: number | null
          risk_percentage?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      adaptive_thresholds: {
        Row: {
          adjustment_rate: number | null
          confluence_adaptive: number | null
          confluence_min: number | null
          created_at: string | null
          current_threshold: number
          edge_adaptive: number | null
          edge_min: number | null
          entropy_current: number | null
          entropy_max: number | null
          entropy_min: number | null
          id: string
          last_adjusted: string | null
          max_threshold: number | null
          min_threshold: number | null
          module_name: string
          performance_trend: string | null
          probability_buy: number | null
          probability_sell: number | null
          updated_at: string | null
        }
        Insert: {
          adjustment_rate?: number | null
          confluence_adaptive?: number | null
          confluence_min?: number | null
          created_at?: string | null
          current_threshold?: number
          edge_adaptive?: number | null
          edge_min?: number | null
          entropy_current?: number | null
          entropy_max?: number | null
          entropy_min?: number | null
          id?: string
          last_adjusted?: string | null
          max_threshold?: number | null
          min_threshold?: number | null
          module_name: string
          performance_trend?: string | null
          probability_buy?: number | null
          probability_sell?: number | null
          updated_at?: string | null
        }
        Update: {
          adjustment_rate?: number | null
          confluence_adaptive?: number | null
          confluence_min?: number | null
          created_at?: string | null
          current_threshold?: number
          edge_adaptive?: number | null
          edge_min?: number | null
          entropy_current?: number | null
          entropy_max?: number | null
          entropy_min?: number | null
          id?: string
          last_adjusted?: string | null
          max_threshold?: number | null
          min_threshold?: number | null
          module_name?: string
          performance_trend?: string | null
          probability_buy?: number | null
          probability_sell?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      aggregated_candles: {
        Row: {
          close_price: number
          created_at: string | null
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
          created_at?: string | null
          high_price: number
          id?: string
          is_complete?: boolean | null
          low_price: number
          open_price: number
          symbol: string
          tick_count?: number | null
          timeframe: string
          timestamp: string
          volume?: number | null
        }
        Update: {
          close_price?: number
          created_at?: string | null
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
      candlestick_patterns: {
        Row: {
          body_size: number | null
          body_wick_ratio: number | null
          candle_timestamp: string
          close_price: number | null
          confidence: number | null
          created_at: string | null
          high_price: number | null
          id: string
          low_price: number | null
          metadata: Json | null
          open_price: number | null
          pattern_name: string
          pattern_type: string
          previous_trend: string | null
          signal: string | null
          strength: number | null
          support_resistance_nearby: boolean | null
          symbol: string
          timeframe: string
          wick_size: number | null
        }
        Insert: {
          body_size?: number | null
          body_wick_ratio?: number | null
          candle_timestamp: string
          close_price?: number | null
          confidence?: number | null
          created_at?: string | null
          high_price?: number | null
          id?: string
          low_price?: number | null
          metadata?: Json | null
          open_price?: number | null
          pattern_name: string
          pattern_type: string
          previous_trend?: string | null
          signal?: string | null
          strength?: number | null
          support_resistance_nearby?: boolean | null
          symbol: string
          timeframe: string
          wick_size?: number | null
        }
        Update: {
          body_size?: number | null
          body_wick_ratio?: number | null
          candle_timestamp?: string
          close_price?: number | null
          confidence?: number | null
          created_at?: string | null
          high_price?: number | null
          id?: string
          low_price?: number | null
          metadata?: Json | null
          open_price?: number | null
          pattern_name?: string
          pattern_type?: string
          previous_trend?: string | null
          signal?: string | null
          strength?: number | null
          support_resistance_nearby?: boolean | null
          symbol?: string
          timeframe?: string
          wick_size?: number | null
        }
        Relationships: []
      }
      correlations: {
        Row: {
          calculated_at: string | null
          correlation_coefficient: number
          id: string
          sample_size: number | null
          symbol_pair: string
          timeframe: string | null
        }
        Insert: {
          calculated_at?: string | null
          correlation_coefficient: number
          id?: string
          sample_size?: number | null
          symbol_pair: string
          timeframe?: string | null
        }
        Update: {
          calculated_at?: string | null
          correlation_coefficient?: number
          id?: string
          sample_size?: number | null
          symbol_pair?: string
          timeframe?: string | null
        }
        Relationships: []
      }
      cot_reports: {
        Row: {
          commercial_long: number | null
          commercial_short: number | null
          created_at: string | null
          id: string
          net_position: number | null
          non_commercial_long: number | null
          non_commercial_short: number | null
          report_date: string
          symbol: string
        }
        Insert: {
          commercial_long?: number | null
          commercial_short?: number | null
          created_at?: string | null
          id?: string
          net_position?: number | null
          non_commercial_long?: number | null
          non_commercial_short?: number | null
          report_date: string
          symbol: string
        }
        Update: {
          commercial_long?: number | null
          commercial_short?: number | null
          created_at?: string | null
          id?: string
          net_position?: number | null
          non_commercial_long?: number | null
          non_commercial_short?: number | null
          report_date?: string
          symbol?: string
        }
        Relationships: []
      }
      discovered_patterns: {
        Row: {
          conditions: Json
          confidence_level: number | null
          created_at: string | null
          deployed: boolean | null
          id: string
          is_validated: boolean | null
          last_seen: string | null
          pattern_name: string
          pattern_type: string | null
          sample_size: number | null
          success_rate: number | null
          win_rate: number | null
        }
        Insert: {
          conditions: Json
          confidence_level?: number | null
          created_at?: string | null
          deployed?: boolean | null
          id?: string
          is_validated?: boolean | null
          last_seen?: string | null
          pattern_name: string
          pattern_type?: string | null
          sample_size?: number | null
          success_rate?: number | null
          win_rate?: number | null
        }
        Update: {
          conditions?: Json
          confidence_level?: number | null
          created_at?: string | null
          deployed?: boolean | null
          id?: string
          is_validated?: boolean | null
          last_seen?: string | null
          pattern_name?: string
          pattern_type?: string | null
          sample_size?: number | null
          success_rate?: number | null
          win_rate?: number | null
        }
        Relationships: []
      }
      economic_calendar: {
        Row: {
          actual_value: number | null
          country: string | null
          created_at: string | null
          currency: string | null
          event_name: string
          event_time: string
          forecast_value: number | null
          id: string
          impact: string | null
          previous_value: number | null
        }
        Insert: {
          actual_value?: number | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          event_name: string
          event_time: string
          forecast_value?: number | null
          id?: string
          impact?: string | null
          previous_value?: number | null
        }
        Update: {
          actual_value?: number | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          event_name?: string
          event_time?: string
          forecast_value?: number | null
          id?: string
          impact?: string | null
          previous_value?: number | null
        }
        Relationships: []
      }
      economic_events: {
        Row: {
          actual_value: number | null
          country: string | null
          created_at: string | null
          currency: string | null
          event_name: string
          event_time: string
          forecast_value: number | null
          id: string
          impact: string | null
          previous_value: number | null
        }
        Insert: {
          actual_value?: number | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          event_name: string
          event_time: string
          forecast_value?: number | null
          id?: string
          impact?: string | null
          previous_value?: number | null
        }
        Update: {
          actual_value?: number | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          event_name?: string
          event_time?: string
          forecast_value?: number | null
          id?: string
          impact?: string | null
          previous_value?: number | null
        }
        Relationships: []
      }
      elliott_waves: {
        Row: {
          confidence: number | null
          created_at: string | null
          current_wave: string | null
          end_price: number | null
          id: string
          metadata: Json | null
          pattern_type: string | null
          projected_target: number | null
          start_price: number | null
          symbol: string
          timeframe: string
          wave_degree: string | null
          wave_label: string | null
          wave_pattern: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          current_wave?: string | null
          end_price?: number | null
          id?: string
          metadata?: Json | null
          pattern_type?: string | null
          projected_target?: number | null
          start_price?: number | null
          symbol: string
          timeframe: string
          wave_degree?: string | null
          wave_label?: string | null
          wave_pattern?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          current_wave?: string | null
          end_price?: number | null
          id?: string
          metadata?: Json | null
          pattern_type?: string | null
          projected_target?: number | null
          start_price?: number | null
          symbol?: string
          timeframe?: string
          wave_degree?: string | null
          wave_label?: string | null
          wave_pattern?: string | null
        }
        Relationships: []
      }
      exit_intelligence: {
        Row: {
          check_timestamp: string | null
          confidence: number | null
          created_at: string | null
          factors: Json | null
          holding_time_minutes: number | null
          id: string
          max_adverse_excursion: number | null
          max_favorable_excursion: number | null
          overall_score: number | null
          reasoning: string | null
          recommendation: string | null
          recommended_exit_price: number | null
          trade_id: string | null
        }
        Insert: {
          check_timestamp?: string | null
          confidence?: number | null
          created_at?: string | null
          factors?: Json | null
          holding_time_minutes?: number | null
          id?: string
          max_adverse_excursion?: number | null
          max_favorable_excursion?: number | null
          overall_score?: number | null
          reasoning?: string | null
          recommendation?: string | null
          recommended_exit_price?: number | null
          trade_id?: string | null
        }
        Update: {
          check_timestamp?: string | null
          confidence?: number | null
          created_at?: string | null
          factors?: Json | null
          holding_time_minutes?: number | null
          id?: string
          max_adverse_excursion?: number | null
          max_favorable_excursion?: number | null
          overall_score?: number | null
          reasoning?: string | null
          recommendation?: string | null
          recommended_exit_price?: number | null
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
          created_at: string | null
          function_name: string
          id: string
          lock_id: string
          locked_at: string | null
          started_at: string | null
        }
        Insert: {
          created_at?: string | null
          function_name: string
          id?: string
          lock_id: string
          locked_at?: string | null
          started_at?: string | null
        }
        Update: {
          created_at?: string | null
          function_name?: string
          id?: string
          lock_id?: string
          locked_at?: string | null
          started_at?: string | null
        }
        Relationships: []
      }
      global_trading_account: {
        Row: {
          auto_trading_enabled: boolean | null
          balance: number
          equity: number
          id: string
          losing_trades: number | null
          max_open_positions: number | null
          total_pnl: number | null
          total_trades: number | null
          updated_at: string | null
          win_rate: number | null
          winning_trades: number | null
        }
        Insert: {
          auto_trading_enabled?: boolean | null
          balance?: number
          equity?: number
          id?: string
          losing_trades?: number | null
          max_open_positions?: number | null
          total_pnl?: number | null
          total_trades?: number | null
          updated_at?: string | null
          win_rate?: number | null
          winning_trades?: number | null
        }
        Update: {
          auto_trading_enabled?: boolean | null
          balance?: number
          equity?: number
          id?: string
          losing_trades?: number | null
          max_open_positions?: number | null
          total_pnl?: number | null
          total_trades?: number | null
          updated_at?: string | null
          win_rate?: number | null
          winning_trades?: number | null
        }
        Relationships: []
      }
      harmonic_prz: {
        Row: {
          completed_at: string | null
          completion_level: number | null
          confidence: number | null
          created_at: string | null
          entry_price: number | null
          id: string
          pattern: string
          prz_high: number | null
          prz_low: number | null
          status: string | null
          stop_loss: number | null
          symbol: string
          targets: Json | null
          timeframe: string | null
        }
        Insert: {
          completed_at?: string | null
          completion_level?: number | null
          confidence?: number | null
          created_at?: string | null
          entry_price?: number | null
          id?: string
          pattern: string
          prz_high?: number | null
          prz_low?: number | null
          status?: string | null
          stop_loss?: number | null
          symbol: string
          targets?: Json | null
          timeframe?: string | null
        }
        Update: {
          completed_at?: string | null
          completion_level?: number | null
          confidence?: number | null
          created_at?: string | null
          entry_price?: number | null
          id?: string
          pattern?: string
          prz_high?: number | null
          prz_low?: number | null
          status?: string | null
          stop_loss?: number | null
          symbol?: string
          targets?: Json | null
          timeframe?: string | null
        }
        Relationships: []
      }
      intelligence_backtests: {
        Row: {
          backtest_name: string
          completed_at: string | null
          created_at: string | null
          end_date: string
          final_balance: number | null
          id: string
          initial_balance: number | null
          losing_trades: number | null
          max_drawdown: number | null
          profit_factor: number | null
          results: Json | null
          sharpe_ratio: number | null
          start_date: string
          strategy_config: Json
          symbol: string
          total_trades: number | null
          win_rate: number | null
          winning_trades: number | null
        }
        Insert: {
          backtest_name: string
          completed_at?: string | null
          created_at?: string | null
          end_date: string
          final_balance?: number | null
          id?: string
          initial_balance?: number | null
          losing_trades?: number | null
          max_drawdown?: number | null
          profit_factor?: number | null
          results?: Json | null
          sharpe_ratio?: number | null
          start_date: string
          strategy_config: Json
          symbol: string
          total_trades?: number | null
          win_rate?: number | null
          winning_trades?: number | null
        }
        Update: {
          backtest_name?: string
          completed_at?: string | null
          created_at?: string | null
          end_date?: string
          final_balance?: number | null
          id?: string
          initial_balance?: number | null
          losing_trades?: number | null
          max_drawdown?: number | null
          profit_factor?: number | null
          results?: Json | null
          sharpe_ratio?: number | null
          start_date?: string
          strategy_config?: Json
          symbol?: string
          total_trades?: number | null
          win_rate?: number | null
          winning_trades?: number | null
        }
        Relationships: []
      }
      intelligence_performance: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          metric_name: string
          metric_value: number | null
          model_type: string
          sample_size: number | null
          timeframe: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          metric_name: string
          metric_value?: number | null
          model_type: string
          sample_size?: number | null
          timeframe?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          metric_name?: string
          metric_value?: number | null
          model_type?: string
          sample_size?: number | null
          timeframe?: string | null
          updated_at?: string | null
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
          id: string
          key_levels: Json | null
          probability_of_success: number | null
          reasoning: string | null
          recommended_sl: number | null
          recommended_tp1: number | null
          recommended_tp2: number | null
          recommended_tp3: number | null
          risk_reward_ratio: number | null
          trade_id: string | null
        }
        Insert: {
          actual_sl?: number | null
          actual_tp?: number | null
          confidence?: number | null
          created_at?: string | null
          entry_price?: number | null
          id?: string
          key_levels?: Json | null
          probability_of_success?: number | null
          reasoning?: string | null
          recommended_sl?: number | null
          recommended_tp1?: number | null
          recommended_tp2?: number | null
          recommended_tp3?: number | null
          risk_reward_ratio?: number | null
          trade_id?: string | null
        }
        Update: {
          actual_sl?: number | null
          actual_tp?: number | null
          confidence?: number | null
          created_at?: string | null
          entry_price?: number | null
          id?: string
          key_levels?: Json | null
          probability_of_success?: number | null
          reasoning?: string | null
          recommended_sl?: number | null
          recommended_tp1?: number | null
          recommended_tp2?: number | null
          recommended_tp3?: number | null
          risk_reward_ratio?: number | null
          trade_id?: string | null
        }
        Relationships: [
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
          created_at: string | null
          id: string
          metadata: Json | null
          parameters_after: Json | null
          parameters_before: Json | null
          success: boolean | null
          trigger_reason: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          parameters_after?: Json | null
          parameters_before?: Json | null
          success?: boolean | null
          trigger_reason?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          parameters_after?: Json | null
          parameters_before?: Json | null
          success?: boolean | null
          trigger_reason?: string | null
        }
        Relationships: []
      }
      learning_outcomes: {
        Row: {
          created_at: string | null
          hold_time_minutes: number | null
          id: string
          lessons_learned: string[] | null
          market_conditions: Json | null
          outcome_type: string
          pips: number | null
          pnl: number
          signal_id: string | null
          signal_quality: Json | null
          trade_id: string | null
        }
        Insert: {
          created_at?: string | null
          hold_time_minutes?: number | null
          id?: string
          lessons_learned?: string[] | null
          market_conditions?: Json | null
          outcome_type: string
          pips?: number | null
          pnl: number
          signal_id?: string | null
          signal_quality?: Json | null
          trade_id?: string | null
        }
        Update: {
          created_at?: string | null
          hold_time_minutes?: number | null
          id?: string
          lessons_learned?: string[] | null
          market_conditions?: Json | null
          outcome_type?: string
          pips?: number | null
          pnl?: number
          signal_id?: string | null
          signal_quality?: Json | null
          trade_id?: string | null
        }
        Relationships: [
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
          created_at: string | null
          id: string
          is_default: boolean | null
          lot_size: number
          preset_name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          lot_size: number
          preset_name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          lot_size?: number
          preset_name?: string
        }
        Relationships: []
      }
      market_data_enhanced: {
        Row: {
          atr: number | null
          bollinger_lower: number | null
          bollinger_upper: number | null
          close_price: number | null
          created_at: string | null
          high_price: number | null
          id: string
          low_price: number | null
          macd: number | null
          open_price: number | null
          rsi: number | null
          symbol: string
          timestamp: string
          volume: number | null
        }
        Insert: {
          atr?: number | null
          bollinger_lower?: number | null
          bollinger_upper?: number | null
          close_price?: number | null
          created_at?: string | null
          high_price?: number | null
          id?: string
          low_price?: number | null
          macd?: number | null
          open_price?: number | null
          rsi?: number | null
          symbol: string
          timestamp: string
          volume?: number | null
        }
        Update: {
          atr?: number | null
          bollinger_lower?: number | null
          bollinger_upper?: number | null
          close_price?: number | null
          created_at?: string | null
          high_price?: number | null
          id?: string
          low_price?: number | null
          macd?: number | null
          open_price?: number | null
          rsi?: number | null
          symbol?: string
          timestamp?: string
          volume?: number | null
        }
        Relationships: []
      }
      market_data_feed: {
        Row: {
          ask: number | null
          bid: number | null
          created_at: string | null
          id: string
          metadata: Json | null
          price: number
          source: string | null
          spread: number | null
          symbol: string
          timestamp: string | null
        }
        Insert: {
          ask?: number | null
          bid?: number | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          price: number
          source?: string | null
          spread?: number | null
          symbol: string
          timestamp?: string | null
        }
        Update: {
          ask?: number | null
          bid?: number | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          price?: number
          source?: string | null
          spread?: number | null
          symbol?: string
          timestamp?: string | null
        }
        Relationships: []
      }
      market_snapshot: {
        Row: {
          change_percent: number | null
          change_percentage_24h: number | null
          created_at: string | null
          id: string
          last_price: number
          symbol: string
          timestamp: string | null
          volume: number | null
        }
        Insert: {
          change_percent?: number | null
          change_percentage_24h?: number | null
          created_at?: string | null
          id?: string
          last_price: number
          symbol: string
          timestamp?: string | null
          volume?: number | null
        }
        Update: {
          change_percent?: number | null
          change_percentage_24h?: number | null
          created_at?: string | null
          id?: string
          last_price?: number
          symbol?: string
          timestamp?: string | null
          volume?: number | null
        }
        Relationships: []
      }
      market_structure: {
        Row: {
          break_timestamp: string | null
          broken: boolean | null
          confirmed: boolean | null
          created_at: string | null
          id: string
          market_phase: string | null
          metadata: Json | null
          price_level: number
          strength: number | null
          structure_type: string
          symbol: string
          timeframe: string
          timestamp: string
          trend_direction: string | null
          updated_at: string | null
        }
        Insert: {
          break_timestamp?: string | null
          broken?: boolean | null
          confirmed?: boolean | null
          created_at?: string | null
          id?: string
          market_phase?: string | null
          metadata?: Json | null
          price_level: number
          strength?: number | null
          structure_type: string
          symbol: string
          timeframe: string
          timestamp: string
          trend_direction?: string | null
          updated_at?: string | null
        }
        Update: {
          break_timestamp?: string | null
          broken?: boolean | null
          confirmed?: boolean | null
          created_at?: string | null
          id?: string
          market_phase?: string | null
          metadata?: Json | null
          price_level?: number
          strength?: number | null
          structure_type?: string
          symbol?: string
          timeframe?: string
          timestamp?: string
          trend_direction?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      master_signals: {
        Row: {
          actual_outcome: string | null
          analysis_id: string | null
          confluence_score: number | null
          contributing_modules: Json | null
          created_at: string | null
          entry_price: number | null
          expires_at: string | null
          final_confidence: number
          final_strength: number | null
          fusion_algorithm: string | null
          fusion_parameters: Json | null
          id: string
          market_data_snapshot: Json | null
          market_regime: string | null
          metadata: Json | null
          modular_signal_ids: string[] | null
          recommended_entry: number | null
          recommended_lot_size: number | null
          recommended_stop_loss: number | null
          recommended_take_profit: number | null
          rejection_reason: string | null
          risk_reward: number | null
          risk_reward_ratio: number | null
          signal_quality_score: number | null
          signal_type: string
          status: string | null
          stop_loss: number | null
          symbol: string
          take_profit: number | null
          timeframe: string | null
        }
        Insert: {
          actual_outcome?: string | null
          analysis_id?: string | null
          confluence_score?: number | null
          contributing_modules?: Json | null
          created_at?: string | null
          entry_price?: number | null
          expires_at?: string | null
          final_confidence: number
          final_strength?: number | null
          fusion_algorithm?: string | null
          fusion_parameters?: Json | null
          id?: string
          market_data_snapshot?: Json | null
          market_regime?: string | null
          metadata?: Json | null
          modular_signal_ids?: string[] | null
          recommended_entry?: number | null
          recommended_lot_size?: number | null
          recommended_stop_loss?: number | null
          recommended_take_profit?: number | null
          rejection_reason?: string | null
          risk_reward?: number | null
          risk_reward_ratio?: number | null
          signal_quality_score?: number | null
          signal_type: string
          status?: string | null
          stop_loss?: number | null
          symbol: string
          take_profit?: number | null
          timeframe?: string | null
        }
        Update: {
          actual_outcome?: string | null
          analysis_id?: string | null
          confluence_score?: number | null
          contributing_modules?: Json | null
          created_at?: string | null
          entry_price?: number | null
          expires_at?: string | null
          final_confidence?: number
          final_strength?: number | null
          fusion_algorithm?: string | null
          fusion_parameters?: Json | null
          id?: string
          market_data_snapshot?: Json | null
          market_regime?: string | null
          metadata?: Json | null
          modular_signal_ids?: string[] | null
          recommended_entry?: number | null
          recommended_lot_size?: number | null
          recommended_stop_loss?: number | null
          recommended_take_profit?: number | null
          rejection_reason?: string | null
          risk_reward?: number | null
          risk_reward_ratio?: number | null
          signal_quality_score?: number | null
          signal_type?: string
          status?: string | null
          stop_loss?: number | null
          symbol?: string
          take_profit?: number | null
          timeframe?: string | null
        }
        Relationships: []
      }
      master_signals_fusion: {
        Row: {
          analysis_id: string | null
          confidence_score: number
          contributing_signals: Json | null
          created_at: string | null
          execution_quality: number | null
          final_signal: string | null
          fusion_decision: string | null
          fusion_method: string | null
          fusion_reasoning: string | null
          id: string
          market_conditions: Json | null
          metadata: Json | null
          risk_assessment: Json | null
          weighted_score: number | null
        }
        Insert: {
          analysis_id?: string | null
          confidence_score: number
          contributing_signals?: Json | null
          created_at?: string | null
          execution_quality?: number | null
          final_signal?: string | null
          fusion_decision?: string | null
          fusion_method?: string | null
          fusion_reasoning?: string | null
          id?: string
          market_conditions?: Json | null
          metadata?: Json | null
          risk_assessment?: Json | null
          weighted_score?: number | null
        }
        Update: {
          analysis_id?: string | null
          confidence_score?: number
          contributing_signals?: Json | null
          created_at?: string | null
          execution_quality?: number | null
          final_signal?: string | null
          fusion_decision?: string | null
          fusion_method?: string | null
          fusion_reasoning?: string | null
          id?: string
          market_conditions?: Json | null
          metadata?: Json | null
          risk_assessment?: Json | null
          weighted_score?: number | null
        }
        Relationships: []
      }
      ml_exit_models: {
        Row: {
          accuracy: number | null
          created_at: string | null
          f1_score: number | null
          features: Json | null
          hyperparameters: Json | null
          id: string
          is_active: boolean | null
          last_used: string | null
          metadata: Json | null
          model_version: string
          precision_score: number | null
          recall_score: number | null
          training_samples: number | null
        }
        Insert: {
          accuracy?: number | null
          created_at?: string | null
          f1_score?: number | null
          features?: Json | null
          hyperparameters?: Json | null
          id?: string
          is_active?: boolean | null
          last_used?: string | null
          metadata?: Json | null
          model_version: string
          precision_score?: number | null
          recall_score?: number | null
          training_samples?: number | null
        }
        Update: {
          accuracy?: number | null
          created_at?: string | null
          f1_score?: number | null
          features?: Json | null
          hyperparameters?: Json | null
          id?: string
          is_active?: boolean | null
          last_used?: string | null
          metadata?: Json | null
          model_version?: string
          precision_score?: number | null
          recall_score?: number | null
          training_samples?: number | null
        }
        Relationships: []
      }
      modular_signals: {
        Row: {
          calculation_parameters: Json | null
          confidence: number
          created_at: string | null
          id: string
          intermediate_values: Json | null
          market_data_snapshot: Json | null
          module_name: string
          signal_type: string
          strength: number | null
          suggested_entry: number | null
          suggested_stop_loss: number | null
          suggested_take_profit: number | null
          supporting_data: Json | null
          symbol: string
          timeframe: string | null
          trend_context: string | null
          trigger_price: number | null
          volatility_regime: string | null
        }
        Insert: {
          calculation_parameters?: Json | null
          confidence: number
          created_at?: string | null
          id?: string
          intermediate_values?: Json | null
          market_data_snapshot?: Json | null
          module_name: string
          signal_type: string
          strength?: number | null
          suggested_entry?: number | null
          suggested_stop_loss?: number | null
          suggested_take_profit?: number | null
          supporting_data?: Json | null
          symbol: string
          timeframe?: string | null
          trend_context?: string | null
          trigger_price?: number | null
          volatility_regime?: string | null
        }
        Update: {
          calculation_parameters?: Json | null
          confidence?: number
          created_at?: string | null
          id?: string
          intermediate_values?: Json | null
          market_data_snapshot?: Json | null
          module_name?: string
          signal_type?: string
          strength?: number | null
          suggested_entry?: number | null
          suggested_stop_loss?: number | null
          suggested_take_profit?: number | null
          supporting_data?: Json | null
          symbol?: string
          timeframe?: string | null
          trend_context?: string | null
          trigger_price?: number | null
          volatility_regime?: string | null
        }
        Relationships: []
      }
      module_health: {
        Row: {
          created_at: string | null
          error_count: number | null
          id: string
          last_execution: string | null
          last_run: string | null
          metadata: Json | null
          module_name: string
          performance_score: number | null
          signals_generated_today: number | null
          status: string
          success_rate: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          error_count?: number | null
          id?: string
          last_execution?: string | null
          last_run?: string | null
          metadata?: Json | null
          module_name: string
          performance_score?: number | null
          signals_generated_today?: number | null
          status?: string
          success_rate?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          error_count?: number | null
          id?: string
          last_execution?: string | null
          last_run?: string | null
          metadata?: Json | null
          module_name?: string
          performance_score?: number | null
          signals_generated_today?: number | null
          status?: string
          success_rate?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      module_performance: {
        Row: {
          accuracy: number | null
          average_confidence: number | null
          average_return: number | null
          average_strength: number | null
          avg_confidence: number | null
          consistency: number | null
          created_at: string | null
          error_rate: number | null
          f1_score: number | null
          failed_signals: number | null
          id: string
          information_ratio: number | null
          last_error: string | null
          last_error_time: string | null
          last_signal_at: string | null
          last_updated: string | null
          losing_signals: number | null
          max_drawdown: number | null
          module_id: string | null
          module_name: string
          precision: number | null
          profit_factor: number | null
          recall: number | null
          reliability: number | null
          response_time: number | null
          sharpe_ratio: number | null
          signals_generated: number | null
          successful_signals: number | null
          total_pnl: number | null
          total_profit: number | null
          total_signals: number | null
          updated_at: string | null
          uptime_percentage: number | null
          win_rate: number | null
          winning_signals: number | null
        }
        Insert: {
          accuracy?: number | null
          average_confidence?: number | null
          average_return?: number | null
          average_strength?: number | null
          avg_confidence?: number | null
          consistency?: number | null
          created_at?: string | null
          error_rate?: number | null
          f1_score?: number | null
          failed_signals?: number | null
          id?: string
          information_ratio?: number | null
          last_error?: string | null
          last_error_time?: string | null
          last_signal_at?: string | null
          last_updated?: string | null
          losing_signals?: number | null
          max_drawdown?: number | null
          module_id?: string | null
          module_name: string
          precision?: number | null
          profit_factor?: number | null
          recall?: number | null
          reliability?: number | null
          response_time?: number | null
          sharpe_ratio?: number | null
          signals_generated?: number | null
          successful_signals?: number | null
          total_pnl?: number | null
          total_profit?: number | null
          total_signals?: number | null
          updated_at?: string | null
          uptime_percentage?: number | null
          win_rate?: number | null
          winning_signals?: number | null
        }
        Update: {
          accuracy?: number | null
          average_confidence?: number | null
          average_return?: number | null
          average_strength?: number | null
          avg_confidence?: number | null
          consistency?: number | null
          created_at?: string | null
          error_rate?: number | null
          f1_score?: number | null
          failed_signals?: number | null
          id?: string
          information_ratio?: number | null
          last_error?: string | null
          last_error_time?: string | null
          last_signal_at?: string | null
          last_updated?: string | null
          losing_signals?: number | null
          max_drawdown?: number | null
          module_id?: string | null
          module_name?: string
          precision?: number | null
          profit_factor?: number | null
          recall?: number | null
          reliability?: number | null
          response_time?: number | null
          sharpe_ratio?: number | null
          signals_generated?: number | null
          successful_signals?: number | null
          total_pnl?: number | null
          total_profit?: number | null
          total_signals?: number | null
          updated_at?: string | null
          uptime_percentage?: number | null
          win_rate?: number | null
          winning_signals?: number | null
        }
        Relationships: []
      }
      news_events: {
        Row: {
          created_at: string | null
          headline: string
          id: string
          published_at: string | null
          relevance_score: number | null
          sentiment_score: number | null
          source: string | null
          symbols: string[] | null
        }
        Insert: {
          created_at?: string | null
          headline: string
          id?: string
          published_at?: string | null
          relevance_score?: number | null
          sentiment_score?: number | null
          source?: string | null
          symbols?: string[] | null
        }
        Update: {
          created_at?: string | null
          headline?: string
          id?: string
          published_at?: string | null
          relevance_score?: number | null
          sentiment_score?: number | null
          source?: string | null
          symbols?: string[] | null
        }
        Relationships: []
      }
      news_sentiment: {
        Row: {
          analyzed_at: string | null
          created_at: string | null
          headline: string
          id: string
          impact_level: string | null
          published_at: string | null
          relevance_score: number | null
          sentiment_score: number | null
          source: string | null
          symbols: string[] | null
        }
        Insert: {
          analyzed_at?: string | null
          created_at?: string | null
          headline: string
          id?: string
          impact_level?: string | null
          published_at?: string | null
          relevance_score?: number | null
          sentiment_score?: number | null
          source?: string | null
          symbols?: string[] | null
        }
        Update: {
          analyzed_at?: string | null
          created_at?: string | null
          headline?: string
          id?: string
          impact_level?: string | null
          published_at?: string | null
          relevance_score?: number | null
          sentiment_score?: number | null
          source?: string | null
          symbols?: string[] | null
        }
        Relationships: []
      }
      order_flow: {
        Row: {
          absorption: boolean | null
          ask_volume: number | null
          bid_volume: number | null
          created_at: string | null
          cumulative_delta: number | null
          delta: number | null
          exhaustion: boolean | null
          id: string
          metadata: Json | null
          price_level: number
          symbol: string
          timestamp: string
          trade_imbalance: number | null
        }
        Insert: {
          absorption?: boolean | null
          ask_volume?: number | null
          bid_volume?: number | null
          created_at?: string | null
          cumulative_delta?: number | null
          delta?: number | null
          exhaustion?: boolean | null
          id?: string
          metadata?: Json | null
          price_level: number
          symbol: string
          timestamp: string
          trade_imbalance?: number | null
        }
        Update: {
          absorption?: boolean | null
          ask_volume?: number | null
          bid_volume?: number | null
          created_at?: string | null
          cumulative_delta?: number | null
          delta?: number | null
          exhaustion?: boolean | null
          id?: string
          metadata?: Json | null
          price_level?: number
          symbol?: string
          timestamp?: string
          trade_imbalance?: number | null
        }
        Relationships: []
      }
      pattern_signals: {
        Row: {
          confidence: number | null
          created_at: string | null
          entry_price: number | null
          id: string
          pattern_type: string
          signal_type: string | null
          status: string | null
          stop_loss: number | null
          symbol: string
          take_profit: number | null
          timeframe: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          entry_price?: number | null
          id?: string
          pattern_type: string
          signal_type?: string | null
          status?: string | null
          stop_loss?: number | null
          symbol: string
          take_profit?: number | null
          timeframe?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          entry_price?: number | null
          id?: string
          pattern_type?: string
          signal_type?: string | null
          status?: string | null
          stop_loss?: number | null
          symbol?: string
          take_profit?: number | null
          timeframe?: string | null
        }
        Relationships: []
      }
      pending_orders: {
        Row: {
          created_at: string | null
          entry_price: number
          expiry_time: string | null
          id: string
          lot_size: number
          metadata: Json | null
          order_type: string
          status: string | null
          stop_loss: number | null
          symbol: string
          take_profit: number | null
          trade_type: string | null
          trigger_price: number | null
          triggered_at: string | null
        }
        Insert: {
          created_at?: string | null
          entry_price: number
          expiry_time?: string | null
          id?: string
          lot_size: number
          metadata?: Json | null
          order_type: string
          status?: string | null
          stop_loss?: number | null
          symbol: string
          take_profit?: number | null
          trade_type?: string | null
          trigger_price?: number | null
          triggered_at?: string | null
        }
        Update: {
          created_at?: string | null
          entry_price?: number
          expiry_time?: string | null
          id?: string
          lot_size?: number
          metadata?: Json | null
          order_type?: string
          status?: string | null
          stop_loss?: number | null
          symbol?: string
          take_profit?: number | null
          trade_type?: string | null
          trigger_price?: number | null
          triggered_at?: string | null
        }
        Relationships: []
      }
      retail_positions: {
        Row: {
          created_at: string | null
          id: string
          long_percentage: number
          short_percentage: number
          snapshot_time: string | null
          source: string | null
          symbol: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          long_percentage: number
          short_percentage: number
          snapshot_time?: string | null
          source?: string | null
          symbol: string
        }
        Update: {
          created_at?: string | null
          id?: string
          long_percentage?: number
          short_percentage?: number
          snapshot_time?: string | null
          source?: string | null
          symbol?: string
        }
        Relationships: []
      }
      shadow_portfolios: {
        Row: {
          balance: number
          created_at: string | null
          equity: number
          free_margin: number | null
          id: string
          is_active: boolean | null
          margin_level: number | null
          margin_used: number | null
          name: string
          updated_at: string | null
        }
        Insert: {
          balance?: number
          created_at?: string | null
          equity?: number
          free_margin?: number | null
          id?: string
          is_active?: boolean | null
          margin_level?: number | null
          margin_used?: number | null
          name: string
          updated_at?: string | null
        }
        Update: {
          balance?: number
          created_at?: string | null
          equity?: number
          free_margin?: number | null
          id?: string
          is_active?: boolean | null
          margin_level?: number | null
          margin_used?: number | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      shadow_trades: {
        Row: {
          comment: string | null
          commission: number | null
          created_at: string | null
          entry_price: number
          entry_time: string | null
          exit_confidence: number | null
          exit_intelligence_score: number | null
          exit_price: number | null
          exit_reason: string | null
          exit_reasoning: string | null
          exit_time: string | null
          id: string
          intelligence_exit_triggered: boolean | null
          lot_size: number
          metadata: Json | null
          order_type: string | null
          pnl: number | null
          portfolio_id: string | null
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
          updated_at: string | null
        }
        Insert: {
          comment?: string | null
          commission?: number | null
          created_at?: string | null
          entry_price: number
          entry_time?: string | null
          exit_confidence?: number | null
          exit_intelligence_score?: number | null
          exit_price?: number | null
          exit_reason?: string | null
          exit_reasoning?: string | null
          exit_time?: string | null
          id?: string
          intelligence_exit_triggered?: boolean | null
          lot_size: number
          metadata?: Json | null
          order_type?: string | null
          pnl?: number | null
          portfolio_id?: string | null
          price_source?: string | null
          price_timestamp?: string | null
          profit?: number | null
          profit_pips?: number | null
          signal_id?: string | null
          status?: string
          stop_loss?: number | null
          swap?: number | null
          symbol: string
          take_profit?: number | null
          trade_type: string
          updated_at?: string | null
        }
        Update: {
          comment?: string | null
          commission?: number | null
          created_at?: string | null
          entry_price?: number
          entry_time?: string | null
          exit_confidence?: number | null
          exit_intelligence_score?: number | null
          exit_price?: number | null
          exit_reason?: string | null
          exit_reasoning?: string | null
          exit_time?: string | null
          id?: string
          intelligence_exit_triggered?: boolean | null
          lot_size?: number
          metadata?: Json | null
          order_type?: string | null
          pnl?: number | null
          portfolio_id?: string | null
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
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shadow_trades_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "shadow_portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      signal_rejection_logs: {
        Row: {
          created_at: string | null
          id: string
          reason: string
          rejection_type: string | null
          signal_data: Json
        }
        Insert: {
          created_at?: string | null
          id?: string
          reason: string
          rejection_type?: string | null
          signal_data: Json
        }
        Update: {
          created_at?: string | null
          id?: string
          reason?: string
          rejection_type?: string | null
          signal_data?: Json
        }
        Relationships: []
      }
      support_resistance: {
        Row: {
          created_at: string | null
          id: string
          last_tested: string | null
          level_type: string
          price_level: number
          strength: number | null
          symbol: string
          timeframe: string | null
          touches: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_tested?: string | null
          level_type: string
          price_level: number
          strength?: number | null
          symbol: string
          timeframe?: string | null
          touches?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_tested?: string | null
          level_type?: string
          price_level?: number
          strength?: number | null
          symbol?: string
          timeframe?: string | null
          touches?: number | null
        }
        Relationships: []
      }
      system_config: {
        Row: {
          config_value: string | null
          created_at: string | null
          description: string | null
          id: string
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          config_value?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          config_value?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      system_health: {
        Row: {
          active_modules: number | null
          created_at: string | null
          error_message: string | null
          error_rate: number | null
          execution_time_ms: number | null
          function_name: string | null
          id: string
          last_check: string | null
          overall_status: string
          processed_items: number | null
          status: string | null
          uptime_percentage: number | null
        }
        Insert: {
          active_modules?: number | null
          created_at?: string | null
          error_message?: string | null
          error_rate?: number | null
          execution_time_ms?: number | null
          function_name?: string | null
          id?: string
          last_check?: string | null
          overall_status?: string
          processed_items?: number | null
          status?: string | null
          uptime_percentage?: number | null
        }
        Update: {
          active_modules?: number | null
          created_at?: string | null
          error_message?: string | null
          error_rate?: number | null
          execution_time_ms?: number | null
          function_name?: string | null
          id?: string
          last_check?: string | null
          overall_status?: string
          processed_items?: number | null
          status?: string | null
          uptime_percentage?: number | null
        }
        Relationships: []
      }
      system_learning_stats: {
        Row: {
          adaptations_made: number | null
          created_at: string | null
          current_accuracy: number | null
          id: string
          improvement_rate: number | null
          last_learning_cycle: string | null
          patterns_discovered: number | null
          total_lessons: number | null
          updated_at: string | null
        }
        Insert: {
          adaptations_made?: number | null
          created_at?: string | null
          current_accuracy?: number | null
          id?: string
          improvement_rate?: number | null
          last_learning_cycle?: string | null
          patterns_discovered?: number | null
          total_lessons?: number | null
          updated_at?: string | null
        }
        Update: {
          adaptations_made?: number | null
          created_at?: string | null
          current_accuracy?: number | null
          id?: string
          improvement_rate?: number | null
          last_learning_cycle?: string | null
          patterns_discovered?: number | null
          total_lessons?: number | null
          updated_at?: string | null
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
          source: string | null
          spread: number | null
          symbol: string
          tick_volume: number | null
          timestamp: string
          volume: number | null
        }
        Insert: {
          ask: number
          bid: number
          created_at?: string | null
          data_source?: string | null
          id?: string
          is_live?: boolean | null
          source?: string | null
          spread?: number | null
          symbol: string
          tick_volume?: number | null
          timestamp: string
          volume?: number | null
        }
        Update: {
          ask?: number
          bid?: number
          created_at?: string | null
          data_source?: string | null
          id?: string
          is_live?: boolean | null
          source?: string | null
          spread?: number | null
          symbol?: string
          tick_volume?: number | null
          timestamp?: string
          volume?: number | null
        }
        Relationships: []
      }
      trade_decision_log: {
        Row: {
          confidence_score: number | null
          contributing_factors: Json | null
          decision: string
          decision_reason: string | null
          id: string
          signal_id: string | null
          timestamp: string | null
        }
        Insert: {
          confidence_score?: number | null
          contributing_factors?: Json | null
          decision: string
          decision_reason?: string | null
          id?: string
          signal_id?: string | null
          timestamp?: string | null
        }
        Update: {
          confidence_score?: number | null
          contributing_factors?: Json | null
          decision?: string
          decision_reason?: string | null
          id?: string
          signal_id?: string | null
          timestamp?: string | null
        }
        Relationships: []
      }
      trade_execution_log: {
        Row: {
          action: string
          data_freshness_ms: number | null
          details: Json | null
          error_message: string | null
          execution_path: string | null
          execution_timestamp: string | null
          id: string
          price_deviation_percent: number | null
          signal_id: string | null
          success: boolean | null
          timestamp: string | null
          trade_id: string | null
          validation_results: Json | null
        }
        Insert: {
          action: string
          data_freshness_ms?: number | null
          details?: Json | null
          error_message?: string | null
          execution_path?: string | null
          execution_timestamp?: string | null
          id?: string
          price_deviation_percent?: number | null
          signal_id?: string | null
          success?: boolean | null
          timestamp?: string | null
          trade_id?: string | null
          validation_results?: Json | null
        }
        Update: {
          action?: string
          data_freshness_ms?: number | null
          details?: Json | null
          error_message?: string | null
          execution_path?: string | null
          execution_timestamp?: string | null
          id?: string
          price_deviation_percent?: number | null
          signal_id?: string | null
          success?: boolean | null
          timestamp?: string | null
          trade_id?: string | null
          validation_results?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "trade_execution_log_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "shadow_trades"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_history: {
        Row: {
          action_type: string
          balance_after: number | null
          balance_before: number | null
          commission: number | null
          equity_after: number | null
          equity_before: number | null
          execution_price: number
          execution_time: string | null
          id: string
          lot_size: number
          metadata: Json | null
          original_trade_id: string | null
          portfolio_id: string | null
          profit: number | null
          profit_pips: number | null
          swap: number | null
          symbol: string
          trade_type: string
        }
        Insert: {
          action_type: string
          balance_after?: number | null
          balance_before?: number | null
          commission?: number | null
          equity_after?: number | null
          equity_before?: number | null
          execution_price: number
          execution_time?: string | null
          id?: string
          lot_size: number
          metadata?: Json | null
          original_trade_id?: string | null
          portfolio_id?: string | null
          profit?: number | null
          profit_pips?: number | null
          swap?: number | null
          symbol: string
          trade_type: string
        }
        Update: {
          action_type?: string
          balance_after?: number | null
          balance_before?: number | null
          commission?: number | null
          equity_after?: number | null
          equity_before?: number | null
          execution_price?: number
          execution_time?: string | null
          id?: string
          lot_size?: number
          metadata?: Json | null
          original_trade_id?: string | null
          portfolio_id?: string | null
          profit?: number | null
          profit_pips?: number | null
          swap?: number | null
          symbol?: string
          trade_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_history_original_trade_id_fkey"
            columns: ["original_trade_id"]
            isOneToOne: false
            referencedRelation: "shadow_trades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_history_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "shadow_portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_performance_summary: {
        Row: {
          average_hold_time_minutes: number | null
          average_profit: number | null
          avg_loss_amount: number | null
          avg_loss_pips: number | null
          avg_trade_duration_hours: number | null
          avg_trade_duration_minutes: number | null
          avg_win_amount: number | null
          avg_win_pips: number | null
          best_trade: number | null
          consecutive_losses: number | null
          consecutive_wins: number | null
          created_at: string | null
          expectancy: number | null
          id: string
          largest_loss: number | null
          largest_win: number | null
          losing_trades: number | null
          max_consecutive_losses: number | null
          max_consecutive_wins: number | null
          max_drawdown: number | null
          profit_factor: number | null
          recovery_factor: number | null
          sharpe_ratio: number | null
          total_closed_trades: number | null
          total_open_trades: number | null
          total_profit: number | null
          total_realized_pnl: number | null
          total_unrealized_pnl: number | null
          updated_at: string | null
          win_rate: number | null
          win_rate_percent: number | null
          winning_trades: number | null
          worst_trade: number | null
        }
        Insert: {
          average_hold_time_minutes?: number | null
          average_profit?: number | null
          avg_loss_amount?: number | null
          avg_loss_pips?: number | null
          avg_trade_duration_hours?: number | null
          avg_trade_duration_minutes?: number | null
          avg_win_amount?: number | null
          avg_win_pips?: number | null
          best_trade?: number | null
          consecutive_losses?: number | null
          consecutive_wins?: number | null
          created_at?: string | null
          expectancy?: number | null
          id?: string
          largest_loss?: number | null
          largest_win?: number | null
          losing_trades?: number | null
          max_consecutive_losses?: number | null
          max_consecutive_wins?: number | null
          max_drawdown?: number | null
          profit_factor?: number | null
          recovery_factor?: number | null
          sharpe_ratio?: number | null
          total_closed_trades?: number | null
          total_open_trades?: number | null
          total_profit?: number | null
          total_realized_pnl?: number | null
          total_unrealized_pnl?: number | null
          updated_at?: string | null
          win_rate?: number | null
          win_rate_percent?: number | null
          winning_trades?: number | null
          worst_trade?: number | null
        }
        Update: {
          average_hold_time_minutes?: number | null
          average_profit?: number | null
          avg_loss_amount?: number | null
          avg_loss_pips?: number | null
          avg_trade_duration_hours?: number | null
          avg_trade_duration_minutes?: number | null
          avg_win_amount?: number | null
          avg_win_pips?: number | null
          best_trade?: number | null
          consecutive_losses?: number | null
          consecutive_wins?: number | null
          created_at?: string | null
          expectancy?: number | null
          id?: string
          largest_loss?: number | null
          largest_win?: number | null
          losing_trades?: number | null
          max_consecutive_losses?: number | null
          max_consecutive_wins?: number | null
          max_drawdown?: number | null
          profit_factor?: number | null
          recovery_factor?: number | null
          sharpe_ratio?: number | null
          total_closed_trades?: number | null
          total_open_trades?: number | null
          total_profit?: number | null
          total_realized_pnl?: number | null
          total_unrealized_pnl?: number | null
          updated_at?: string | null
          win_rate?: number | null
          win_rate_percent?: number | null
          winning_trades?: number | null
          worst_trade?: number | null
        }
        Relationships: []
      }
      trading_diagnostics: {
        Row: {
          check_type: string
          created_at: string | null
          details: Json | null
          id: string
          message: string | null
          status: string
        }
        Insert: {
          check_type: string
          created_at?: string | null
          details?: Json | null
          id?: string
          message?: string | null
          status: string
        }
        Update: {
          check_type?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          message?: string | null
          status?: string
        }
        Relationships: []
      }
      trading_instruments: {
        Row: {
          contract_size: number | null
          created_at: string | null
          display_name: string
          id: string
          instrument_type: string
          is_active: boolean | null
          lot_step: number | null
          margin_percentage: number | null
          margin_requirement: number | null
          max_lot_size: number | null
          min_lot_size: number | null
          pip_size: number
          symbol: string
          typical_spread: number | null
        }
        Insert: {
          contract_size?: number | null
          created_at?: string | null
          display_name: string
          id?: string
          instrument_type: string
          is_active?: boolean | null
          lot_step?: number | null
          margin_percentage?: number | null
          margin_requirement?: number | null
          max_lot_size?: number | null
          min_lot_size?: number | null
          pip_size: number
          symbol: string
          typical_spread?: number | null
        }
        Update: {
          contract_size?: number | null
          created_at?: string | null
          display_name?: string
          id?: string
          instrument_type?: string
          is_active?: boolean | null
          lot_step?: number | null
          margin_percentage?: number | null
          margin_requirement?: number | null
          max_lot_size?: number | null
          min_lot_size?: number | null
          pip_size?: number
          symbol?: string
          typical_spread?: number | null
        }
        Relationships: []
      }
      trading_signals: {
        Row: {
          alert_level: string | null
          confidence: number
          confluence_score: number | null
          created_at: string | null
          description: string | null
          entry_price: number | null
          expires_at: string | null
          factors: Json | null
          id: string
          metadata: Json | null
          pair: string
          risk_reward_ratio: number | null
          signal_id: string | null
          signal_type: string
          status: string | null
          stop_loss: number | null
          strength: number | null
          take_profit: number | null
          timeframe: string | null
          was_executed: boolean | null
        }
        Insert: {
          alert_level?: string | null
          confidence: number
          confluence_score?: number | null
          created_at?: string | null
          description?: string | null
          entry_price?: number | null
          expires_at?: string | null
          factors?: Json | null
          id?: string
          metadata?: Json | null
          pair: string
          risk_reward_ratio?: number | null
          signal_id?: string | null
          signal_type: string
          status?: string | null
          stop_loss?: number | null
          strength?: number | null
          take_profit?: number | null
          timeframe?: string | null
          was_executed?: boolean | null
        }
        Update: {
          alert_level?: string | null
          confidence?: number
          confluence_score?: number | null
          created_at?: string | null
          description?: string | null
          entry_price?: number | null
          expires_at?: string | null
          factors?: Json | null
          id?: string
          metadata?: Json | null
          pair?: string
          risk_reward_ratio?: number | null
          signal_id?: string | null
          signal_type?: string
          status?: string | null
          stop_loss?: number | null
          strength?: number | null
          take_profit?: number | null
          timeframe?: string | null
          was_executed?: boolean | null
        }
        Relationships: []
      }
      volatility_metrics: {
        Row: {
          atr: number | null
          calculated_at: string | null
          created_at: string | null
          historical_volatility: number | null
          id: string
          implied_volatility: number | null
          std_dev: number | null
          symbol: string
          timeframe: string
        }
        Insert: {
          atr?: number | null
          calculated_at?: string | null
          created_at?: string | null
          historical_volatility?: number | null
          id?: string
          implied_volatility?: number | null
          std_dev?: number | null
          symbol: string
          timeframe: string
        }
        Update: {
          atr?: number | null
          calculated_at?: string | null
          created_at?: string | null
          historical_volatility?: number | null
          id?: string
          implied_volatility?: number | null
          std_dev?: number | null
          symbol?: string
          timeframe?: string
        }
        Relationships: []
      }
      volume_profile: {
        Row: {
          created_at: string | null
          id: string
          is_poc: boolean | null
          is_value_area: boolean | null
          period_end: string
          period_start: string
          poc_price: number | null
          price_level: number
          symbol: string
          timeframe: string
          value_area_high: number | null
          value_area_low: number | null
          volume: number | null
          volume_percentage: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_poc?: boolean | null
          is_value_area?: boolean | null
          period_end: string
          period_start: string
          poc_price?: number | null
          price_level: number
          symbol: string
          timeframe: string
          value_area_high?: number | null
          value_area_low?: number | null
          volume?: number | null
          volume_percentage?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_poc?: boolean | null
          is_value_area?: boolean | null
          period_end?: string
          period_start?: string
          poc_price?: number | null
          price_level?: number
          symbol?: string
          timeframe?: string
          value_area_high?: number | null
          value_area_low?: number | null
          volume?: number | null
          volume_percentage?: number | null
        }
        Relationships: []
      }
      winning_patterns: {
        Row: {
          avg_pips: number | null
          avg_profit: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          pattern_criteria: Json
          pattern_type: string
          sample_size: number
          updated_at: string | null
          win_rate: number
        }
        Insert: {
          avg_pips?: number | null
          avg_profit?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          pattern_criteria: Json
          pattern_type: string
          sample_size: number
          updated_at?: string | null
          win_rate: number
        }
        Update: {
          avg_pips?: number | null
          avg_profit?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          pattern_criteria?: Json
          pattern_type?: string
          sample_size?: number
          updated_at?: string | null
          win_rate?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      analyze_ml_exit_timing: { Args: { p_days_back?: number }; Returns: Json }
      analyze_trade_performance: {
        Args: never
        Returns: {
          performance_patterns: Json
        }[]
      }
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
          metadata: Json
          recommended_entry: number
          recommended_lot_size: number
          recommended_stop_loss: number
          recommended_take_profit: number
          signal_type: string
          symbol: string
        }[]
      }
      auto_detect_support_resistance: {
        Args: {
          p_lookback_periods?: number
          p_symbol: string
          p_timeframe?: string
        }
        Returns: Json
      }
      calculate_global_performance_metrics: { Args: never; Returns: undefined }
      calculate_optimal_lot_size: {
        Args: {
          p_account_balance: number
          p_risk_percentage: number
          p_stop_loss_pips: number
        }
        Returns: number
      }
      calculate_trade_pnl: {
        Args: { p_current_price: number; p_trade_id: string }
        Returns: {
          commission: number
          pips: number
          pnl: number
        }[]
      }
      calculate_trade_quality_score: {
        Args: {
          p_confluence_score: number
          p_market_regime: string
          p_signal_id: string
          p_volatility_percentile: number
        }
        Returns: number
      }
      close_shadow_trade: {
        Args: {
          p_close_lot_size: number
          p_close_price: number
          p_close_reason?: string
          p_trade_id: string
        }
        Returns: Json
      }
      detect_candlestick_patterns: {
        Args: { p_limit?: number; p_symbol: string; p_timeframe: string }
        Returns: {
          candle_timestamp: string
          confidence: number
          pattern_name: string
          pattern_type: string
          signal: string
        }[]
      }
      execute_advanced_order: {
        Args: { p_current_price: number; p_order_id: string }
        Returns: Json
      }
      get_global_trading_account: {
        Args: never
        Returns: {
          balance: number
          equity: number
          id: string
          losing_trades: number
          total_pnl: number
          total_trades: number
          updated_at: string
          win_rate: number
          winning_trades: number
        }[]
      }
      get_ml_model_versions_performance: {
        Args: { p_days_back?: number }
        Returns: Json
      }
      get_ml_performance_analytics: { Args: never; Returns: Json }
      manage_break_even: {
        Args: {
          p_current_price: number
          p_profit_threshold_pips?: number
          p_symbol?: string
        }
        Returns: Json
      }
      run_trading_diagnostics: { Args: never; Returns: Json }
      update_eurusd_pnl: { Args: never; Returns: undefined }
      update_trailing_stops: {
        Args: { p_current_price: number; p_symbol?: string }
        Returns: Json
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
