"use client"

import { FormEvent, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus } from "lucide-react"

import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"

type FundSearchAddLabels = {
  title: string
  description: string
  fundCodeLabel: string
  placeholder: string
  addFund: string
  adding: string
  addSuccess: string
  invalidFundCode: string
  requestFailed: string
}

type FundSearchAddProps = {
  labels: FundSearchAddLabels
}

type AddFundResponse = {
  ok: boolean
  error?: {
    code: string
    message: string
  }
}

export function FundSearchAdd({ labels }: FundSearchAddProps) {
  const router = useRouter()
  const [fundCode, setFundCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const normalizedFundCode = fundCode.trim()

    if (!/^\d{6}$/.test(normalizedFundCode)) {
      setSuccess(null)
      setError(labels.invalidFundCode)
      return
    }

    setError(null)
    setSuccess(null)

    startTransition(async () => {
      try {
        const response = await fetch("/api/funds/add", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ fundCode: normalizedFundCode }),
        })
        const result = (await response.json()) as AddFundResponse

        if (!result.ok) {
          setError(result.error?.message ?? labels.requestFailed)
          return
        }

        setFundCode("")
        setSuccess(labels.addSuccess)
        router.refresh()
      } catch {
        setError(labels.requestFailed)
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.title}</CardTitle>
        <CardDescription>{labels.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={onSubmit}
          aria-busy={isPending}
        >
          <label className="sr-only" htmlFor="fund-code">
            {labels.fundCodeLabel}
          </label>
          <Input
            id="fund-code"
            inputMode="numeric"
            maxLength={6}
            pattern="\d{6}"
            placeholder={labels.placeholder}
            value={fundCode}
            onChange={(event) => {
              setFundCode(event.target.value.replace(/\D/g, "").slice(0, 6))
            }}
            aria-invalid={Boolean(error)}
            disabled={isPending}
          />
          <Button type="submit" disabled={isPending} aria-busy={isPending}>
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            {isPending ? labels.adding : labels.addFund}
          </Button>
        </form>

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {success ? (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  )
}
