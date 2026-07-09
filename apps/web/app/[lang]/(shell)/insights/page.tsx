import { ErrorState } from "@/components/error-state"
import { InsightsBoard } from "@/components/insights-board"
import { PageHeader } from "@/components/page-header"
import { RiskNotice } from "@/components/risk-notice"
import { getInsightSources } from "@/lib/services/insight-service"

import { getDictionary, hasLocale } from "../../dictionaries"

export const dynamic = "force-dynamic"

export default async function InsightsPage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params

  if (!hasLocale(lang)) {
    return null
  }

  const dict = getDictionary(lang)
  const sourcesResponse = await getInsightSources(null)

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <PageHeader
          title={dict.insights.title}
          description={dict.insights.description}
        />
        <RiskNotice
          title={dict.riskNotice.title}
          description={dict.riskNotice.description}
        />

        {!sourcesResponse.ok ? (
          <ErrorState
            title={dict.insights.loadErrorTitle}
            description={dict.insights.loadErrorDescription}
          />
        ) : (
          <InsightsBoard
            sources={sourcesResponse.data}
            labels={dict.insights}
          />
        )}
    </div>
  )
}
