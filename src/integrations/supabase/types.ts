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
          created_at: string | null
          current_threshold: number
          id: string
          last_adjusted: string | null
          max_threshold: number | null
          min_threshold: number | null
          module_name: string
          performance_trend: string | null
          updated_at: string | null
        }
        Insert: {
          adjustment_rate?: number | null
          created_at?: string | null
          current_threshold?: number
          id?: string
          last_adjusted?: string | null
          max_threshold?: number | null
          min_threshold?: number | null
          module_name: string
          performance_trend?: string | null
          updated_at?: string | null
        }
        Update: {
          adjustment_rate?: number | null
          created_at?: string | null
          current_threshold?: number
          id?: string
          last_adjusted?: string | null
          max_threshold?: number | null
          min_threshold?: number | null
          module_name?: string
          performance_trend?: string | null
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
      global_trading_account: {
        Row: {
          balance: number
          equity: number
          id: string
          losing_trades: number | null
          total_pnl: number | null
          total_trades: number | null
          updated_at: string | null
          win_rate: number | null
          winning_trades: number | null
        }
        Insert: {
          balance?: number
          equity?: number
          id?: string
          losing_trades?: number | null
          total_pnl?: number | null
          total_trades?: number | null
          updated_at?: string | null
          win_rate?: number | null
          winning_trades?: number | null
        }
        Update: {
          balance?: number
          equity?: number
          id?: string
          losing_trades?: number | null
          total_pnl?: number | null
          total_trades?: number | null
          updated_at?: string | null
          win_rate?: number | null
          winning_trades?: number | null
        }
        Relationships: []
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
      market_data_feed: {
        Row: {
          ask: number | null
          bid: number | null
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
          id: string
          metadata: Json | null
          recommended_entry: number | null
          recommended_stop_loss: number | null
          recommended_take_profit: number | null
          risk_reward: number | null
          risk_reward_ratio: number | null
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
          id?: string
          metadata?: Json | null
          recommended_entry?: number | null
          recommended_stop_loss?: number | null
          recommended_take_profit?: number | null
          risk_reward?: number | null
          risk_reward_ratio?: number | null
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
          id?: string
          metadata?: Json | null
          recommended_entry?: number | null
          recommended_stop_loss?: number | null
          recommended_take_profit?: number | null
          risk_reward?: number | null
          risk_reward_ratio?: number | null
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
      modular_signals: {
        Row: {
          confidence: number
          created_at: string | null
          id: string
          intermediate_values: Json | null
          module_name: string
          signal_type: string
          strength: number | null
          suggested_entry: number | null
          suggested_stop_loss: number | null
          suggested_take_profit: number | null
          supporting_data: Json | null
          symbol: string
          timeframe: string | null
        }
        Insert: {
          confidence: number
          created_at?: string | null
          id?: string
          intermediate_values?: Json | null
          module_name: string
          signal_type: string
          strength?: number | null
          suggested_entry?: number | null
          suggested_stop_loss?: number | null
          suggested_take_profit?: number | null
          supporting_data?: Json | null
          symbol: string
          timeframe?: string | null
        }
        Update: {
          confidence?: number
          created_at?: string | null
          id?: string
          intermediate_values?: Json | null
          module_name?: string
          signal_type?: string
          strength?: number | null
          suggested_entry?: number | null
          suggested_stop_loss?: number | null
          suggested_take_profit?: number | null
          supporting_data?: Json | null
          symbol?: string
          timeframe?: string | null
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
          avg_confidence: number | null
          consistency: number | null
          created_at: string | null
          error_rate: number | null
          f1_score: number | null
          id: string
          last_error: string | null
          last_error_time: string | null
          last_signal_at: string | null
          last_updated: string | null
          losing_signals: number | null
          module_id: string | null
          module_name: string
          precision: number | null
          recall: number | null
          reliability: number | null
          response_time: number | null
          sharpe_ratio: number | null
          signals_generated: number | null
          total_pnl: number | null
          total_signals: number | null
          updated_at: string | null
          uptime_percentage: number | null
          win_rate: number | null
          winning_signals: number | null
        }
        Insert: {
          accuracy?: number | null
          avg_confidence?: number | null
          consistency?: number | null
          created_at?: string | null
          error_rate?: number | null
          f1_score?: number | null
          id?: string
          last_error?: string | null
          last_error_time?: string | null
          last_signal_at?: string | null
          last_updated?: string | null
          losing_signals?: number | null
          module_id?: string | null
          module_name: string
          precision?: number | null
          recall?: number | null
          reliability?: number | null
          response_time?: number | null
          sharpe_ratio?: number | null
          signals_generated?: number | null
          total_pnl?: number | null
          total_signals?: number | null
          updated_at?: string | null
          uptime_percentage?: number | null
          win_rate?: number | null
          winning_signals?: number | null
        }
        Update: {
          accuracy?: number | null
          avg_confidence?: number | null
          consistency?: number | null
          created_at?: string | null
          error_rate?: number | null
          f1_score?: number | null
          id?: string
          last_error?: string | null
          last_error_time?: string | null
          last_signal_at?: string | null
          last_updated?: string | null
          losing_signals?: number | null
          module_id?: string | null
          module_name?: string
          precision?: number | null
          recall?: number | null
          reliability?: number | null
          response_time?: number | null
          sharpe_ratio?: number | null
          signals_generated?: number | null
          total_pnl?: number | null
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
          commission: number | null
          created_at: string | null
          entry_price: number
          entry_time: string | null
          exit_price: number | null
          exit_reason: string | null
          exit_time: string | null
          id: string
          lot_size: number
          metadata: Json | null
          pnl: number | null
          portfolio_id: string | null
          price_source: string | null
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
          commission?: number | null
          created_at?: string | null
          entry_price: number
          entry_time?: string | null
          exit_price?: number | null
          exit_reason?: string | null
          exit_time?: string | null
          id?: string
          lot_size: number
          metadata?: Json | null
          pnl?: number | null
          portfolio_id?: string | null
          price_source?: string | null
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
          commission?: number | null
          created_at?: string | null
          entry_price?: number
          entry_time?: string | null
          exit_price?: number | null
          exit_reason?: string | null
          exit_time?: string | null
          id?: string
          lot_size?: number
          metadata?: Json | null
          pnl?: number | null
          portfolio_id?: string | null
          price_source?: string | null
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
          created_at: string | null
          description: string | null
          id: string
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
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
          id: string
          last_check: string | null
          overall_status: string
          status: string | null
          uptime_percentage: number | null
        }
        Insert: {
          active_modules?: number | null
          created_at?: string | null
          error_message?: string | null
          error_rate?: number | null
          id?: string
          last_check?: string | null
          overall_status?: string
          status?: string | null
          uptime_percentage?: number | null
        }
        Update: {
          active_modules?: number | null
          created_at?: string | null
          error_message?: string | null
          error_rate?: number | null
          id?: string
          last_check?: string | null
          overall_status?: string
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
          id: string
          is_live: boolean | null
          source: string | null
          symbol: string
          timestamp: string
          volume: number | null
        }
        Insert: {
          ask: number
          bid: number
          created_at?: string | null
          id?: string
          is_live?: boolean | null
          source?: string | null
          symbol: string
          timestamp: string
          volume?: number | null
        }
        Update: {
          ask?: number
          bid?: number
          created_at?: string | null
          id?: string
          is_live?: boolean | null
          source?: string | null
          symbol?: string
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
          details: Json | null
          error_message: string | null
          execution_timestamp: string | null
          id: string
          success: boolean | null
          timestamp: string | null
          trade_id: string | null
        }
        Insert: {
          action: string
          details?: Json | null
          error_message?: string | null
          execution_timestamp?: string | null
          id?: string
          success?: boolean | null
          timestamp?: string | null
          trade_id?: string | null
        }
        Update: {
          action?: string
          details?: Json | null
          error_message?: string | null
          execution_timestamp?: string | null
          id?: string
          success?: boolean | null
          timestamp?: string | null
          trade_id?: string | null
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
      trading_signals: {
        Row: {
          confidence: number
          confluence_score: number | null
          created_at: string | null
          entry_price: number | null
          expires_at: string | null
          id: string
          metadata: Json | null
          pair: string
          signal_type: string
          status: string | null
          stop_loss: number | null
          strength: number | null
          take_profit: number | null
          timeframe: string | null
        }
        Insert: {
          confidence: number
          confluence_score?: number | null
          created_at?: string | null
          entry_price?: number | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          pair: string
          signal_type: string
          status?: string | null
          stop_loss?: number | null
          strength?: number | null
          take_profit?: number | null
          timeframe?: string | null
        }
        Update: {
          confidence?: number
          confluence_score?: number | null
          created_at?: string | null
          entry_price?: number | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          pair?: string
          signal_type?: string
          status?: string | null
          stop_loss?: number | null
          strength?: number | null
          take_profit?: number | null
          timeframe?: string | null
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
      calculate_global_performance_metrics: { Args: never; Returns: undefined }
      calculate_trade_pnl: {
        Args: { p_current_price: number; p_trade_id: string }
        Returns: {
          commission: number
          pips: number
          pnl: number
        }[]
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
