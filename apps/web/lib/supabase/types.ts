export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      tracked_funds: {
        Row: {
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
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
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
          created_at?: string | null
          updated_at?: string | null
        }
        Update: Partial<Database["public"]["Tables"]["tracked_funds"]["Insert"]>
        Relationships: []
      }
      fund_holdings: {
        Row: {
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
          source_report_date: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
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
          source_report_date?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: Partial<Database["public"]["Tables"]["fund_holdings"]["Insert"]>
        Relationships: []
      }
      market_quotes: {
        Row: {
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
          raw: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
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
          raw?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: Partial<Database["public"]["Tables"]["market_quotes"]["Insert"]>
        Relationships: []
      }
      user_positions: {
        Row: {
          id: string
          user_id: string | null
          fund_code: string
          holding_amount: number | null
          holding_shares: number | null
          cost_amount: number | null
          daily_invest_amount: number | null
          note: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          fund_code: string
          holding_amount?: number | null
          holding_shares?: number | null
          cost_amount?: number | null
          daily_invest_amount?: number | null
          note?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: Partial<
          Database["public"]["Tables"]["user_positions"]["Insert"]
        >
        Relationships: []
      }
      estimate_snapshots: {
        Row: {
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
        }
        Insert: {
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
        Update: Partial<
          Database["public"]["Tables"]["estimate_snapshots"]["Insert"]
        >
        Relationships: []
      }
      insight_sources: {
        Row: {
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
        }
        Insert: {
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
        Update: Partial<
          Database["public"]["Tables"]["insight_sources"]["Insert"]
        >
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
