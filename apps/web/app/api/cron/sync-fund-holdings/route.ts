import { ok } from "@/lib/api/route-response"
import { verifyCronAuthorization } from "@/lib/api/cron-auth"

export async function GET(request: Request) {
  const unauthorized = verifyCronAuthorization(request)

  if (unauthorized) {
    return unauthorized
  }

  return ok({
    status: "moved_to_github_actions",
    message:
      "Fund holdings sync now runs in the AKShare GitHub Actions worker. This Vercel route does not run data ingestion.",
  })
}
