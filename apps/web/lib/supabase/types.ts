export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type Table<TRow, TInsert, TUpdate = Partial<TInsert>> = {
  Row: TRow
  Insert: TInsert
  Update: TUpdate
  Relationships: []
}

type TimestampColumns = {
  created_at: string | null
  updated_at: string | null
}

type InsertTimestampColumns = {
  created_at?: string | null
  updated_at?: string | null
}

export type SyncLogStatus = "success" | "failed"

export type Database = {
  public: {
    Tables: {
      funds: Table<
        {
          fund_code: string
          fund_name: string | null
          fund_type: string | null
          manager: string | null
          company: string | null
          data_source: string | null
          last_synced_at: string | null
        } & TimestampColumns,
        {
          fund_code: string
          fund_name?: string | null
          fund_type?: string | null
          manager?: string | null
          company?: string | null
          data_source?: string | null
          last_synced_at?: string | null
        } & InsertTimestampColumns
      >
      fund_navs: Table<
        {
          id: string
          fund_code: string
          nav_date: string
          nav: number | null
          accumulated_nav: number | null
          nav_change_pct: number | null
          data_source: string | null
          last_synced_at: string | null
          created_at: string | null
        },
        {
          id?: string
          fund_code: string
          nav_date: string
          nav?: number | null
          accumulated_nav?: number | null
          nav_change_pct?: number | null
          data_source?: string | null
          last_synced_at?: string | null
          created_at?: string | null
        }
      >
      tracked_funds: Table<
        {
          id: string
          user_id: string | null
          fund_code: string
          fund_name: string | null
          fund_type: string | null
          manager: string | null
          company: string | null
          latest_nav: number | null
          latest_nav_date: string | null
          latest_nav_change_pct: number | null
          source: string | null
          last_synced_at: string | null
        } & TimestampColumns,
        {
          id?: string
          user_id?: string | null
          fund_code: string
          fund_name?: string | null
          fund_type?: string | null
          manager?: string | null
          company?: string | null
          latest_nav?: number | null
          latest_nav_date?: string | null
          latest_nav_change_pct?: number | null
          source?: string | null
          last_synced_at?: string | null
        } & InsertTimestampColumns
      >
      user_tracked_funds: Table<
        {
          id: string
          user_id: string
          fund_code: string
        } & TimestampColumns,
        {
          id?: string
          user_id: string
          fund_code: string
        } & InsertTimestampColumns
      >
      fund_holdings: Table<
        {
          id: string
          fund_code: string
          report_period: string
          asset_type: string
          market: string | null
          symbol: string
          name: string | null
          weight_pct: number
          shares: number | null
          market_value: number | null
          source: string | null
          data_source: string | null
          source_report_date: string | null
          last_synced_at: string | null
        } & TimestampColumns,
        {
          id?: string
          fund_code: string
          report_period: string
          asset_type: string
          market?: string | null
          symbol: string
          name?: string | null
          weight_pct: number
          shares?: number | null
          market_value?: number | null
          source?: string | null
          data_source?: string | null
          source_report_date?: string | null
          last_synced_at?: string | null
        } & InsertTimestampColumns
      >
      fund_asset_allocations: Table<
        {
          id: string
          fund_code: string
          report_period: string
          asset_type: string
          weight_pct: number
          amount: number | null
          data_source: string | null
          source_report_date: string | null
          last_synced_at: string | null
        } & TimestampColumns,
        {
          id?: string
          fund_code: string
          report_period: string
          asset_type: string
          weight_pct?: number
          amount?: number | null
          data_source?: string | null
          source_report_date?: string | null
          last_synced_at?: string | null
        } & InsertTimestampColumns
      >
      market_quotes: Table<
        {
          id: string
          market: string
          symbol: string
          name: string | null
          price: number | null
          previous_close: number | null
          change_pct: number | null
          currency: string | null
          quote_time: string | null
          source: string | null
          data_source: string | null
          last_synced_at: string | null
          raw: Json | null
        } & TimestampColumns,
        {
          id?: string
          market: string
          symbol: string
          name?: string | null
          price?: number | null
          previous_close?: number | null
          change_pct?: number | null
          currency?: string | null
          quote_time?: string | null
          source?: string | null
          data_source?: string | null
          last_synced_at?: string | null
          raw?: Json | null
        } & InsertTimestampColumns
      >
      data_sync_logs: Table<
        {
          id: string
          source: string
          task: string
          status: SyncLogStatus
          target: string | null
          item_count: number | null
          duration_ms: number | null
          error_code: string | null
          error_message: string | null
          created_at: string | null
        },
        {
          id?: string
          source: string
          task: string
          status: string
          target?: string | null
          item_count?: number | null
          duration_ms?: number | null
          error_code?: string | null
          error_message?: string | null
          created_at?: string | null
        }
      >
      user_positions: Table<
        {
          id: string
          user_id: string | null
          fund_code: string
          holding_amount: number | null
          holding_shares: number | null
          cost_amount: number | null
          daily_invest_amount: number | null
          note: string | null
        } & TimestampColumns,
        {
          id?: string
          user_id?: string | null
          fund_code: string
          holding_amount?: number | null
          holding_shares?: number | null
          cost_amount?: number | null
          daily_invest_amount?: number | null
          note?: string | null
        } & InsertTimestampColumns
      >
      user_investment_plans: Table<
        {
          id: string
          user_id: string
          fund_code: string
          daily_invest_amount: number | null
          is_active: boolean | null
          note: string | null
        } & TimestampColumns,
        {
          id?: string
          user_id: string
          fund_code: string
          daily_invest_amount?: number | null
          is_active?: boolean | null
          note?: string | null
        } & InsertTimestampColumns
      >
      user_investment_orders: Table<
        {
          id: string
          user_id: string
          fund_code: string
          trade_date: string
          amount: number
          status: string
          estimated_nav: number | null
          estimated_shares: number | null
          official_nav: number | null
          confirmed_shares: number | null
          confirmed_at: string | null
        } & TimestampColumns,
        {
          id?: string
          user_id: string
          fund_code: string
          trade_date: string
          amount: number
          status?: InvestmentOrderStatus
          estimated_nav?: number | null
          estimated_shares?: number | null
          official_nav?: number | null
          confirmed_shares?: number | null
          confirmed_at?: string | null
        } & InsertTimestampColumns
      >
      estimate_snapshots: Table<
        {
          id: string
          user_id: string | null
          fund_code: string
          estimate_date: string
          estimated_change_pct: number | null
          estimated_profit_amount: number | null
          covered_weight_pct: number | null
          top_contributors: Json | null
          warnings: Json | null
          created_at: string | null
        },
        {
          id?: string
          user_id?: string | null
          fund_code: string
          estimate_date: string
          estimated_change_pct?: number | null
          estimated_profit_amount?: number | null
          covered_weight_pct?: number | null
          top_contributors?: Json | null
          warnings?: Json | null
          created_at?: string | null
        }
      >
      insight_sources: Table<
        {
          id: string
          user_id: string | null
          title: string
          source_type: string
          url: string | null
          content: string | null
          related_markets: string[] | null
          related_symbols: string[] | null
          related_fund_codes: string[] | null
          sentiment: string | null
          importance: number | null
          collected_at: string | null
          created_at: string | null
        },
        {
          id?: string
          user_id?: string | null
          title: string
          source_type: string
          url?: string | null
          content?: string | null
          related_markets?: string[] | null
          related_symbols?: string[] | null
          related_fund_codes?: string[] | null
          sentiment?: string | null
          importance?: number | null
          collected_at?: string | null
          created_at?: string | null
        }
      >
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type InvestmentOrderStatus =
  | "pending_nav"
  | "confirmed"
  | "failed"
  | "cancelled"
