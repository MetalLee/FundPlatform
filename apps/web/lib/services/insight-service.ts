import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import type { Database } from "@/lib/supabase/types"
import {
  failure,
  success,
  toFailure,
  type ApiResponse,
} from "@/lib/utils/api-response"
import {
  normalizeFundCode,
  normalizeMarket,
  normalizeSymbol,
} from "@/lib/utils/code-normalizer"

type InsightSourceRow = Database["public"]["Tables"]["insight_sources"]["Row"]

export type CreateInsightSourceInput = {
  title: string
  sourceType: string
  url?: string | null
  content?: string | null
  relatedMarkets?: string[]
  relatedSymbols?: string[]
  relatedFundCodes?: string[]
  sentiment?: string | null
  importance?: number
}

export async function createInsightSource(
  userId: string | null,
  input: CreateInsightSourceInput,
): Promise<ApiResponse<InsightSourceRow>> {
  try {
    if (!input.title.trim()) {
      return failure("VALIDATION_ERROR", "title is required")
    }

    if (!input.sourceType.trim()) {
      return failure("VALIDATION_ERROR", "sourceType is required")
    }

    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from("insight_sources")
      .insert({
        user_id: userId,
        title: input.title.trim(),
        source_type: input.sourceType.trim(),
        url: input.url ?? null,
        content: input.content ?? null,
        related_markets: input.relatedMarkets?.map(normalizeMarket) ?? null,
        related_symbols: input.relatedSymbols?.map(normalizeSymbol) ?? null,
        related_fund_codes:
          input.relatedFundCodes?.map(normalizeFundCode) ?? null,
        sentiment: input.sentiment ?? null,
        importance: input.importance ?? 3,
      })
      .select()
      .single()

    if (error) {
      return failure(
        "SUPABASE_INSIGHT_SOURCE_INSERT_FAILED",
        error.message,
        error,
      )
    }

    return success(data)
  } catch (error) {
    return toFailure("CREATE_INSIGHT_SOURCE_FAILED", error)
  }
}

export async function getInsightSources(
  userId: string | null,
): Promise<ApiResponse<InsightSourceRow[]>> {
  try {
    const supabase = createSupabaseAdminClient()
    const query = supabase
      .from("insight_sources")
      .select()
      .order("collected_at", { ascending: false })
      .order("created_at", { ascending: false })

    const { data, error } =
      userId === null
        ? await query.is("user_id", null)
        : await query.eq("user_id", userId)

    if (error) {
      return failure(
        "SUPABASE_INSIGHT_SOURCES_READ_FAILED",
        error.message,
        error,
      )
    }

    return success(data ?? [])
  } catch (error) {
    return toFailure("GET_INSIGHT_SOURCES_FAILED", error)
  }
}
