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
          account_currency: string
          account_type: string
          auto_trading_enabled: boolean
          average_loss: number
          average_win: number
          balance: number
          created_at: string
          custom_lot_multiplier: number
          daily_loss_limit: number
          daily_pnl_today: number
          deposits_total: number
          equity: number
          expectancy: number
          free_margin: number
          id: string
          initial_deposit: number
          is_active: boolean
          last_daily_reset: string | null
          leverage: number
          losing_trades: number
          lot_size_type: string
          margin: number
          margin_call_level: number
          margin_level: number
          max_drawdown: number
          max_drawdown_limit: number
          max_open_positions: number
          profit_factor: number
          risk_per_trade: number
          session_id: string | null
          sharpe_ratio: number
          stop_out_level: number
          total_trades: number
          updated_at: string
          user_id: string | null
          win_rate: number
          winning_trades: number
          withdrawals_total: number
        }
        Insert: {
          account_currency?: string
          account_type?: string
          auto_trading_enabled?: boolean
          average_loss?: number
          average_win?: number
          balance?: number
          created_at?: string
          custom_lot_multiplier?: number
          daily_loss_limit?: number
          daily_pnl_today?: number
          deposits_total?: number
          equity?: number
          expectancy?: number
          free_margin?: number
          id?: string
          initial_deposit?: number
          is_active?: boolean
          last_daily_reset?: string | null
          leverage?: number
          losing_trades?: number
          lot_size_type?: string
          margin?: number
          margin_call_level?: number
          margin_level?: number
          max_drawdown?: number
          max_drawdown_limit?: number
          max_open_positions?: number
          profit_factor?: number
          risk_per_trade?: number
          session_id?: string | null
          sharpe_ratio?: number
          stop_out_level?: number
          total_trades?: number
          updated_at?: string
          user_id?: string | null
          win_rate?: number
          winning_trades?: number
          withdrawals_total?: number
        }
        Update: {
          account_currency?: string
          account_type?: string
          auto_trading_enabled?: boolean
          average_loss?: number
          average_win?: number
          balance?: number
          created_at?: string
          custom_lot_multiplier?: number
          daily_loss_limit?: number
          daily_pnl_today?: number
          deposits_total?: number
          equity?: number
          expectancy?: number
          free_margin?: number
          id?: string
          initial_deposit?: number
          is_active?: boolean
          last_daily_reset?: string | null
          leverage?: number
          losing_trades?: number
          lot_size_type?: string
          margin?: number
          margin_call_level?: number
          margin_level?: number
          max_drawdown?: number
          max_drawdown_limit?: number
          max_open_positions?: number
          profit_factor?: number
          risk_per_trade?: number
          session_id?: string | null
          sharpe_ratio?: number
          stop_out_level?: number
          total_trades?: number
          updated_at?: string
          user_id?: string | null
          win_rate?: number
          winning_trades?: number
          withdrawals_total?: number
        }
        Relationships: []
      }
      shadow_trades: {
        Row: {
          confluence_score: number
          contract_size: number
          created_at: string
          entry_price: number
          entry_time: string
          exit_price: number | null
          exit_reason: string | null
          exit_time: string | null
          holding_time_minutes: number | null
          id: string
          lot_size: number
          margin_required: number | null
          pip_pnl: number | null
          pip_value: number | null
          pnl: number | null
          pnl_percent: number | null
          portfolio_id: string
          position_size: number
          risk_reward_ratio: number | null
          signal_id: string | null
          status: string
          stop_loss: number
          symbol: string
          take_profit: number
          trade_type: string
          updated_at: string
        }
        Insert: {
          confluence_score?: number
          contract_size?: number
          created_at?: string
          entry_price: number
          entry_time?: string
          exit_price?: number | null
          exit_reason?: string | null
          exit_time?: string | null
          holding_time_minutes?: number | null
          id?: string
          lot_size?: number
          margin_required?: number | null
          pip_pnl?: number | null
          pip_value?: number | null
          pnl?: number | null
          pnl_percent?: number | null
          portfolio_id: string
          position_size: number
          risk_reward_ratio?: number | null
          signal_id?: string | null
          status?: string
          stop_loss: number
          symbol?: string
          take_profit: number
          trade_type: string
          updated_at?: string
        }
        Update: {
          confluence_score?: number
          contract_size?: number
          created_at?: string
          entry_price?: number
          entry_time?: string
          exit_price?: number | null
          exit_reason?: string | null
          exit_time?: string | null
          holding_time_minutes?: number | null
          id?: string
          lot_size?: number
          margin_required?: number | null
          pip_pnl?: number | null
          pip_value?: number | null
          pnl?: number | null
          pnl_percent?: number | null
          portfolio_id?: string
          position_size?: number
          risk_reward_ratio?: number | null
          signal_id?: string | null
          status?: string
          stop_loss?: number
          symbol?: string
          take_profit?: number
          trade_type?: string
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
      cleanup_anonymous_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_stuck_jobs: {
        Args: Record<PropertyKey, never>
        Returns: undefined
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
