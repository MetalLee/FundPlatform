import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"

import { DataCard } from "@/components/data-card"
import { PageHeader } from "@/components/page-header"

import { getDictionary, hasLocale } from "../../dictionaries"

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params

  if (!hasLocale(lang)) {
    return null
  }

  const dict = getDictionary(lang)

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <PageHeader
          title={dict.settings.title}
          description={dict.settings.description}
          action={<Button>{dict.settings.save}</Button>}
        />

        <section className="grid gap-4 lg:grid-cols-2">
          <DataCard
            title={dict.settings.dataSourcesTitle}
            description={dict.settings.dataSourcesDescription}
          >
            <div className="space-y-3">
              {dict.settings.dataSources.map((item) => (
                <div
                  key={item}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <span className="font-medium">{item}</span>
                  <Badge variant="outline">{dict.settings.disabled}</Badge>
                </div>
              ))}
            </div>
          </DataCard>

          <DataCard
            title={dict.settings.notificationTitle}
            description={dict.settings.notificationDescription}
          >
            <div className="space-y-3">
              {dict.settings.notifications.map((item) => (
                <div
                  key={item}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <span className="font-medium">{item}</span>
                  <Badge variant="secondary">{dict.settings.enabled}</Badge>
                </div>
              ))}
            </div>
          </DataCard>
        </section>
    </div>
  )
}
