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
          created_at: string
          default_lot_size: number
          default_sl_pips: number
          default_tp_pips: number
          id: string
          max_open_trades: number
          max_spread_pips: number
          portfolio_id: string
          risk_per_trade_percent: number
          trading_end_hour: number
          trading_hours_enabled: boolean
          trading_start_hour: number
          updated_at: string
        }
        Insert: {
          allowed_symbols?: string[]
          auto_lot_sizing?: boolean
          auto_sl_tp?: boolean
          blacklist_symbols?: string[]
          created_at?: string
          default_lot_size?: number
          default_sl_pips?: number
          default_tp_pips?: number
          id?: string
          max_open_trades?: number
          max_spread_pips?: number
          portfolio_id: string
          risk_per_trade_percent?: number
          trading_end_hour?: number
          trading_hours_enabled?: boolean
          trading_start_hour?: number
          updated_at?: string
        }
        Update: {
          allowed_symbols?: string[]
          auto_lot_sizing?: boolean
          auto_sl_tp?: boolean
          blacklist_symbols?: string[]
          created_at?: string
          default_lot_size?: number
          default_sl_pips?: number
          default_tp_pips?: number
          id?: string
          max_open_trades?: number
          max_spread_pips?: number
          portfolio_id?: string
          risk_per_trade_percent?: number
          trading_end_hour?: number
          trading_hours_enabled?: boolean
          trading_start_hour?: number
          updated_at?: string
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
          portfolio_id: string
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
          portfolio_id: string
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
          portfolio_id?: string
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
          impact_level?: string
          is_active?: boolean | null
          previous_value?: string | null
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
        Relationships: [
          {
            foreignKeyName: "lot_size_presets_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "shadow_portfolios"
            referencedColumns: ["id"]
          },
        ]
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
          holding_duration: unknown | null
          id: string
          market_data_snapshot: Json
          market_regime: string | null
          modular_signal_ids: string[]
          notes: string | null
          recommended_entry: number
          recommended_lot_size: number
          recommended_stop_loss: number
          recommended_take_profit: number
          risk_reward_ratio: number | null
          signal_hash: string
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
          holding_duration?: unknown | null
          id?: string
          market_data_snapshot: Json
          market_regime?: string | null
          modular_signal_ids: string[]
          notes?: string | null
          recommended_entry: number
          recommended_lot_size?: number
          recommended_stop_loss: number
          recommended_take_profit: number
          risk_reward_ratio?: number | null
          signal_hash: string
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
          holding_duration?: unknown | null
          id?: string
          market_data_snapshot?: Json
          market_regime?: string | null
          modular_signal_ids?: string[]
          notes?: string | null
          recommended_entry?: number
          recommended_lot_size?: number
          recommended_stop_loss?: number
          recommended_take_profit?: number
          risk_reward_ratio?: number | null
          signal_hash?: string
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
      module_performance: {
        Row: {
          average_confidence: number | null
          average_return: number | null
          average_strength: number | null
          created_at: string | null
          failed_signals: number | null
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
          portfolio_id: string
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
          portfolio_id: string
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
          portfolio_id?: string
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
        Relationships: [
          {
            foreignKeyName: "performance_snapshots_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "shadow_portfolios"
            referencedColumns: ["id"]
          },
        ]
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
      shadow_portfolios: {
        Row: {
          account_company: string | null
          account_currency: string
          account_name: string | null
          account_number: number | null
          account_server: string | null
          account_type: string
          auto_trading_enabled: boolean
          average_loss: number
          average_win: number
          balance: number
          bonus: number | null
          commission_per_lot: number | null
          consecutive_losses: number | null
          consecutive_wins: number | null
          created_at: string
          credit: number | null
          current_drawdown: number | null
          custom_lot_multiplier: number
          daily_loss_limit: number
          daily_pnl_today: number
          deposits_total: number
          dll_allowed: boolean | null
          ea_allowed: boolean | null
          equity: number
          expectancy: number
          fifo_mode: boolean | null
          floating_pnl: number | null
          free_margin: number
          hedge_mode: boolean | null
          id: string
          initial_deposit: number
          is_active: boolean
          largest_loss: number | null
          largest_win: number | null
          last_daily_reset: string | null
          last_trade_time: string | null
          leverage: number
          losing_trades: number
          lot_size_type: string
          margin: number
          margin_call_level: number
          margin_level: number
          margin_percentage: number | null
          max_drawdown: number
          max_drawdown_amount: number | null
          max_drawdown_limit: number
          max_equity: number | null
          max_open_positions: number
          max_orders: number | null
          peak_balance: number | null
          profit_factor: number
          risk_per_trade: number
          session_id: string | null
          sharpe_ratio: number
          spread_multiplier: number | null
          stop_out_level: number
          swap_free: boolean | null
          symbols_list: string[] | null
          symbols_total: number | null
          total_commission: number | null
          total_swap: number | null
          total_trades: number
          trade_context_busy: boolean | null
          trading_allowed: boolean | null
          trading_days: number | null
          updated_at: string
          used_margin: number | null
          user_id: string | null
          win_rate: number
          winning_trades: number
          withdrawals_total: number
        }
        Insert: {
          account_company?: string | null
          account_currency?: string
          account_name?: string | null
          account_number?: number | null
          account_server?: string | null
          account_type?: string
          auto_trading_enabled?: boolean
          average_loss?: number
          average_win?: number
          balance?: number
          bonus?: number | null
          commission_per_lot?: number | null
          consecutive_losses?: number | null
          consecutive_wins?: number | null
          created_at?: string
          credit?: number | null
          current_drawdown?: number | null
          custom_lot_multiplier?: number
          daily_loss_limit?: number
          daily_pnl_today?: number
          deposits_total?: number
          dll_allowed?: boolean | null
          ea_allowed?: boolean | null
          equity?: number
          expectancy?: number
          fifo_mode?: boolean | null
          floating_pnl?: number | null
          free_margin?: number
          hedge_mode?: boolean | null
          id?: string
          initial_deposit?: number
          is_active?: boolean
          largest_loss?: number | null
          largest_win?: number | null
          last_daily_reset?: string | null
          last_trade_time?: string | null
          leverage?: number
          losing_trades?: number
          lot_size_type?: string
          margin?: number
          margin_call_level?: number
          margin_level?: number
          margin_percentage?: number | null
          max_drawdown?: number
          max_drawdown_amount?: number | null
          max_drawdown_limit?: number
          max_equity?: number | null
          max_open_positions?: number
          max_orders?: number | null
          peak_balance?: number | null
          profit_factor?: number
          risk_per_trade?: number
          session_id?: string | null
          sharpe_ratio?: number
          spread_multiplier?: number | null
          stop_out_level?: number
          swap_free?: boolean | null
          symbols_list?: string[] | null
          symbols_total?: number | null
          total_commission?: number | null
          total_swap?: number | null
          total_trades?: number
          trade_context_busy?: boolean | null
          trading_allowed?: boolean | null
          trading_days?: number | null
          updated_at?: string
          used_margin?: number | null
          user_id?: string | null
          win_rate?: number
          winning_trades?: number
          withdrawals_total?: number
        }
        Update: {
          account_company?: string | null
          account_currency?: string
          account_name?: string | null
          account_number?: number | null
          account_server?: string | null
          account_type?: string
          auto_trading_enabled?: boolean
          average_loss?: number
          average_win?: number
          balance?: number
          bonus?: number | null
          commission_per_lot?: number | null
          consecutive_losses?: number | null
          consecutive_wins?: number | null
          created_at?: string
          credit?: number | null
          current_drawdown?: number | null
          custom_lot_multiplier?: number
          daily_loss_limit?: number
          daily_pnl_today?: number
          deposits_total?: number
          dll_allowed?: boolean | null
          ea_allowed?: boolean | null
          equity?: number
          expectancy?: number
          fifo_mode?: boolean | null
          floating_pnl?: number | null
          free_margin?: number
          hedge_mode?: boolean | null
          id?: string
          initial_deposit?: number
          is_active?: boolean
          largest_loss?: number | null
          largest_win?: number | null
          last_daily_reset?: string | null
          last_trade_time?: string | null
          leverage?: number
          losing_trades?: number
          lot_size_type?: string
          margin?: number
          margin_call_level?: number
          margin_level?: number
          margin_percentage?: number | null
          max_drawdown?: number
          max_drawdown_amount?: number | null
          max_drawdown_limit?: number
          max_equity?: number | null
          max_open_positions?: number
          max_orders?: number | null
          peak_balance?: number | null
          profit_factor?: number
          risk_per_trade?: number
          session_id?: string | null
          sharpe_ratio?: number
          spread_multiplier?: number | null
          stop_out_level?: number
          swap_free?: boolean | null
          symbols_list?: string[] | null
          symbols_total?: number | null
          total_commission?: number | null
          total_swap?: number | null
          total_trades?: number
          trade_context_busy?: boolean | null
          trading_allowed?: boolean | null
          trading_days?: number | null
          updated_at?: string
          used_margin?: number | null
          user_id?: string | null
          win_rate?: number
          winning_trades?: number
          withdrawals_total?: number
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
          execution_price: number | null
          exit_price: number | null
          exit_reason: string | null
          exit_time: string | null
          expert_advisor: string | null
          holding_time_minutes: number | null
          id: string
          lot_size: number
          magic_number: number | null
          margin_required: number | null
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
          portfolio_id: string
          position_size: number
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
          execution_price?: number | null
          exit_price?: number | null
          exit_reason?: string | null
          exit_time?: string | null
          expert_advisor?: string | null
          holding_time_minutes?: number | null
          id?: string
          lot_size?: number
          magic_number?: number | null
          margin_required?: number | null
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
          portfolio_id: string
          position_size: number
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
          execution_price?: number | null
          exit_price?: number | null
          exit_reason?: string | null
          exit_time?: string | null
          expert_advisor?: string | null
          holding_time_minutes?: number | null
          id?: string
          lot_size?: number
          magic_number?: number | null
          margin_required?: number | null
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
          portfolio_id?: string
          position_size?: number
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
          tick_value?: number | null
          trade_type?: string
          trailing_stop_distance?: number | null
          trailing_stop_triggered?: boolean | null
          unrealized_pnl?: number | null
          updated_at?: string
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
          id: string
          lot_size: number
          margin_used: number | null
          original_trade_id: string | null
          portfolio_id: string
          profit: number | null
          profit_pips: number | null
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
          id?: string
          lot_size: number
          margin_used?: number | null
          original_trade_id?: string | null
          portfolio_id: string
          profit?: number | null
          profit_pips?: number | null
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
          id?: string
          lot_size?: number
          margin_used?: number | null
          original_trade_id?: string | null
          portfolio_id?: string
          profit?: number | null
          profit_pips?: number | null
          slippage_pips?: number | null
          stop_loss?: number | null
          swap?: number | null
          symbol?: string
          take_profit?: number | null
          trade_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_history_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "shadow_portfolios"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      archive_old_trades: {
        Args: Record<PropertyKey, never>
        Returns: undefined
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
      calculate_trade_pnl: {
        Args: { p_current_price: number; p_trade_id: string }
        Returns: {
          profit: number
          profit_pips: number
          unrealized_pnl: number
        }[]
      }
      cleanup_anonymous_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_stuck_jobs: {
        Args: Record<PropertyKey, never>
        Returns: undefined
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
      create_daily_performance_snapshot: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      execute_advanced_order: {
        Args: { p_order_data: Json; p_portfolio_id: string }
        Returns: Json
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
      manage_break_even: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      run_trading_diagnostics: {
        Args: Record<PropertyKey, never>
        Returns: {
          check_name: string
          message: string
          status: string
          value: number
        }[]
      }
      update_eurusd_pnl: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_trailing_stops: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      validate_signal_reproducibility: {
        Args: { p_analysis_id: string; p_signal_table?: string }
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
