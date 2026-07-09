import { ArrowRight, BarChart3, ShieldCheck, WalletCards } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

import { getDictionary, hasLocale } from "./dictionaries"
import { LanguageSwitcher } from "./language-switcher"
import { PendingLink } from "@/components/pending-link"

const snapshotIcons = [WalletCards, BarChart3, ShieldCheck]

export default async function Page({
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
    <main className="min-h-svh bg-background">
      <section className="mx-auto flex min-h-svh w-full max-w-6xl flex-col justify-between px-6 py-8">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <WalletCards className="size-4" />
            </div>
            <span className="text-sm font-medium">{dict.common.appName}</span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher
              currentLocale={lang}
              path="/"
              labels={dict.common}
            />
            <Button
              nativeButton={false}
              variant="outline"
              render={<PendingLink href={`/${lang}/dashboard`} />}
            >
              {dict.common.dashboard}
              <ArrowRight />
            </Button>
          </div>
        </header>

        <div className="grid gap-8 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="flex max-w-2xl flex-col gap-6">
            <Badge variant="secondary" className="w-fit">
              {dict.home.badge}
            </Badge>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-medium tracking-normal text-balance md:text-6xl">
                {dict.home.title}
              </h1>
              <p className="max-w-xl text-sm leading-6 text-muted-foreground md:text-base">
                {dict.home.description}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                nativeButton={false}
                size="lg"
                render={<PendingLink href={`/${lang}/dashboard`} />}
              >
                {dict.home.openDashboard}
                <ArrowRight />
              </Button>
              <Button
                nativeButton={false}
                size="lg"
                variant="outline"
                render={<PendingLink href={`/${lang}/funds`} />}
              >
                {dict.home.reviewFunds}
              </Button>
            </div>
          </div>

          <Card className="w-full">
            <CardHeader>
              <CardTitle>{dict.home.snapshotTitle}</CardTitle>
              <CardDescription>{dict.home.snapshotDescription}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {dict.home.snapshot.map((item, index) => {
                const Icon = snapshotIcons[index] ?? WalletCards

                return (
                  <div
                    key={item.label}
                    className="flex items-center justify-between gap-4 rounded-md border bg-muted/30 p-3"
                  >
                    <div>
                      <div className="text-xs text-muted-foreground">
                        {item.label}
                      </div>
                      <div className="mt-1 text-xl font-medium tabular-nums">
                        {item.value}
                      </div>
                    </div>
                    <Icon className="size-4 text-muted-foreground" />
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>

        <footer className="flex flex-col gap-2 border-t py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>{dict.home.footerLeft}</span>
          <span>{dict.home.footerRight}</span>
        </footer>
      </section>
    </main>
  )
}
