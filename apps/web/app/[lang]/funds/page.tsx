import { AppShell } from "@/components/app-shell"
import { EmptyState } from "@/components/empty-state"
import { ErrorState } from "@/components/error-state"
import { FundCard } from "@/components/fund-card"
import { FundSearchAdd } from "@/components/fund-search-add"
import { PageHeader } from "@/components/page-header"
import { RiskNotice } from "@/components/risk-notice"
import { getTrackedFunds } from "@/lib/services/fund-service"

import { getDictionary, getShellLabels, hasLocale } from "../dictionaries"

export const dynamic = "force-dynamic"

export default async function FundsPage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params

  if (!hasLocale(lang)) {
    return null
  }

  const dict = getDictionary(lang)
  const trackedFundsResponse = await getTrackedFunds(null)

  return (
    <AppShell
      lang={lang}
      path="/funds"
      labels={getShellLabels(lang)}
      title={dict.shell.titles.funds}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <PageHeader
          title={dict.funds.title}
          description={dict.funds.description}
        />

        <RiskNotice
          title={dict.riskNotice.title}
          description={dict.riskNotice.description}
        />

        <FundSearchAdd
          labels={{
            title: dict.funds.addFundTitle,
            description: dict.funds.addFundDescription,
            fundCodeLabel: dict.funds.fundCodeLabel,
            placeholder: dict.funds.fundCodePlaceholder,
            addFund: dict.funds.addFund,
            adding: dict.funds.adding,
            addSuccess: dict.funds.addSuccess,
            invalidFundCode: dict.funds.invalidFundCode,
            requestFailed: dict.funds.requestFailed,
          }}
        />

        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-medium">{dict.funds.allFundsTitle}</h2>
            <p className="text-sm text-muted-foreground">
              {dict.funds.allFundsDescription}
            </p>
          </div>

          {!trackedFundsResponse.ok ? (
            <ErrorState
              title={dict.funds.loadErrorTitle}
              description={dict.funds.loadErrorDescription}
            />
          ) : trackedFundsResponse.data.length === 0 ? (
            <EmptyState
              title={dict.funds.emptyTitle}
              description={dict.funds.emptyDescription}
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {trackedFundsResponse.data.map((fund) => (
                <FundCard
                  key={`${fund.user_id ?? "mock"}-${fund.fund_code}`}
                  fund={fund}
                  lang={lang}
                  labels={{
                    fields: dict.funds.fields,
                    viewDetail: dict.funds.viewDetail,
                    sync: dict.funds.sync,
                    syncing: dict.funds.syncing,
                    requestFailed: dict.funds.requestFailed,
                  }}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  )
}
