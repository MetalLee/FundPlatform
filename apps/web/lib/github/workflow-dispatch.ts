import { failure, success, toFailure, type ApiResponse } from "@/lib/utils/api-response"

export type WorkflowDispatchInput = {
  task: string
  fundCode: string
}

export async function dispatchFundSyncWorkflow({
  task,
  fundCode,
}: WorkflowDispatchInput): Promise<ApiResponse<{ dispatched: boolean }>> {
  try {
    const token = process.env.GITHUB_WORKFLOW_DISPATCH_TOKEN
    const repository = process.env.GITHUB_WORKFLOW_REPOSITORY
    const workflowFile =
      process.env.GITHUB_WORKFLOW_FILE ?? "akshare-sync.yml"
    const ref = process.env.GITHUB_WORKFLOW_REF ?? "main"

    if (!token || !repository) {
      return failure(
        "GITHUB_WORKFLOW_DISPATCH_NOT_CONFIGURED",
        "GitHub workflow dispatch is not configured",
      )
    }

    const response = await fetch(
      `https://api.github.com/repos/${repository}/actions/workflows/${workflowFile}/dispatches`,
      {
        method: "POST",
        headers: {
          accept: "application/vnd.github+json",
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
          "x-github-api-version": "2022-11-28",
        },
        body: JSON.stringify({
          ref,
          inputs: {
            task,
            fund_code: fundCode,
          },
        }),
      },
    )

    if (!response.ok) {
      return failure(
        "GITHUB_WORKFLOW_DISPATCH_FAILED",
        `GitHub workflow dispatch failed with status ${response.status}`,
      )
    }

    return success({ dispatched: true })
  } catch (error) {
    return toFailure("GITHUB_WORKFLOW_DISPATCH_FAILED", error)
  }
}
