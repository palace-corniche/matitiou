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
          star