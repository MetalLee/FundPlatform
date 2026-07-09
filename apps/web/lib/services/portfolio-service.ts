import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import type { Database } from "@/lib/supabase/types"
import {
  failure,
  success,
  toFailure,
  type ApiResponse,
} from "@/lib/utils/api-response"
import { normalizeFundCode } from "@/lib/utils/code-normalizer"

type UserPositionRow = Database["public"]["Tables"]["user_positions"]["Row"]
type UserInvestmentPlanRow =
  Database["public"]["Tables"]["user_investment_plans"]["Row"]

export type UpsertUserPositionInput = {
  fundCode: string
  holdingAmount?: number
  holdingShares?: number
  costAmount?: number
  dailyInvestAmount?: number
  note?: string | null
}

export async function upsertUserPosition(
  userId: string | null,
  input: UpsertUserPositionInput,
): Promise<ApiResponse<UserPositionRow>> {
  try {
    const fundCode = normalizeFundCode(input.fundCode)
    const supabase = createSupabaseAdminClient()
    const { position, plan } = buildPositionPersistenceInput(userId, {
      ...input,
      fundCode,
    })
    const positionInput = {
      ...position,
      updated_at: new Date().toISOString(),
    }

    if (userId === null) {
      const { data: existingRows, error: existingError } = await supabase
        .from("user_positions")
        .select("id")
        .eq("fund_code", fundCode)
        .is("user_id", null)
        .order("created_at", { ascending: false })
        .limit(1)

      if (existingError) {
        return failure(
          "SUPABASE_POSITION_READ_FAILED",
          existingError.message,
          existingError,
        )
      }

      const existingId = existingRows?.[0]?.id

      if (existingId) {
        const { data, error } = await supabase
          .from("user_positions")
          .update(positionInput)
          .eq("id", existingId)
          .select()
          .single()

        if (error) {
          return failure("SUPABASE_POSITION_UPSERT_FAILED", error.message, error)
        }

        const planResponse = await upsertInvestmentPlan(supabase, plan)

        if (!planResponse.ok) {
          return planResponse
        }

        return success(withPlanAmount(data, planResponse.data))
      }

      const { data, error } = await supabase
        .from("user_positions")
        .insert(positionInput)
        .select()
        .single()

      if (error) {
        return failure("SUPABASE_POSITION_UPSERT_FAILED", error.message, error)
      }

      const planResponse = await upsertInvestmentPlan(supabase, plan)

      if (!planResponse.ok) {
        return planResponse
      }

      return success(withPlanAmount(data, planResponse.data))
    }

    const { data, error } = await supabase
      .from("user_positions")
      .upsert(positionInput, { onConflict: "user_id,fund_code" })
      .select()
      .single()

    if (error) {
      return failure("SUPABASE_POSITION_UPSERT_FAILED", error.message, error)
    }

    const planResponse = await upsertInvestmentPlan(supabase, plan)

    if (!planResponse.ok) {
      return planResponse
    }

    return success(withPlanAmount(data, planResponse.data))
  } catch (error) {
    return toFailure("UPSERT_USER_POSITION_FAILED", error)
  }
}

export function buildPositionPersistenceInput(
  userId: string | null,
  input: UpsertUserPositionInput,
) {
  const fundCode = normalizeFundCode(input.fundCode)

  return {
    position: {
      user_id: userId,
      fund_code: fundCode,
      holding_amount: input.holdingAmount ?? 0,
      holding_shares: input.holdingShares ?? 0,
      cost_amount: input.costAmount ?? 0,
      note: input.note ?? null,
    },
    plan:
      userId === null
        ? null
        : {
            user_id: userId,
            fund_code: fundCode,
            daily_invest_amount: input.dailyInvestAmount ?? 0,
            is_active: true,
          },
  }
}

export async function getUserPositions(
  userId: string | null,
): Promise<ApiResponse<UserPositionRow[]>> {
  try {
    const supabase = createSupabaseAdminClient()
    const query = supabase.from("user_positions").select().order("created_at")
    const { data, error } =
      userId === null
        ? await query.is("user_id", null)
        : await query.eq("user_id", userId)

    if (error) {
      return failure("SUPABASE_POSITIONS_READ_FAILED", error.message, error)
    }

    const positions = dedupePositions(data ?? [])

    if (userId === null) {
      return success(positions)
    }

    const plansResponse = await getUserInvestmentPlans(userId)

    if (!plansResponse.ok) {
      return plansResponse
    }

    return success(applyInvestmentPlans(positions, plansResponse.data))
  } catch (error) {
    return toFailure("GET_USER_POSITIONS_FAILED", error)
  }
}

async function getUserInvestmentPlans(
  userId: string,
): Promise<ApiResponse<UserInvestmentPlanRow[]>> {
  try {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from("user_investment_plans")
      .select()
      .eq("user_id", userId)

    if (error) {
      return failure("SUPABASE_PLANS_READ_FAILED", error.message, error)
    }

    return success(data ?? [])
  } catch (error) {
    return toFailure("GET_USER_INVESTMENT_PLANS_FAILED", error)
  }
}

async function upsertInvestmentPlan(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  plan: ReturnType<typeof buildPositionPersistenceInput>["plan"],
): Promise<ApiResponse<UserInvestmentPlanRow | null>> {
  if (plan === null) {
    return success(null)
  }

  const { data, error } = await supabase
    .from("user_investment_plans")
    .upsert(
      {
        ...plan,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,fund_code" },
    )
    .select()
    .single()

  if (error) {
    return failure("SUPABASE_PLAN_UPSERT_FAILED", error.message, error)
  }

  return success(data)
}

function applyInvestmentPlans(
  positions: UserPositionRow[],
  plans: UserInvestmentPlanRow[],
) {
  const planMap = new Map(plans.map((plan) => [plan.fund_code, plan]))

  return positions.map((position) => withPlanAmount(position, planMap.get(position.fund_code)))
}

function withPlanAmount(
  position: UserPositionRow,
  plan: UserInvestmentPlanRow | null | undefined,
) {
  return {
    ...position,
    daily_invest_amount:
      plan?.is_active === false ? 0 : plan?.daily_invest_amount ?? 0,
  }
}

function dedupePositions(rows: UserPositionRow[]) {
  const positions = new Map<string, UserPositionRow>()

  for (const row of rows) {
    positions.set(row.fund_code, row)
  }

  return Array.from(positions.values())
}
