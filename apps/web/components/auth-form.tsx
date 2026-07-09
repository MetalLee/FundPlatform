"use client"

import { useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, LogIn, UserPlus } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

import type { Locale } from "@/app/[lang]/dictionaries"
import { PendingLink } from "@/components/pending-link"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"

type AuthLabels = {
  loginTitle: string
  loginDescription: string
  registerTitle: string
  registerDescription: string
  email: string
  password: string
  confirmPassword: string
  login: string
  register: string
  loggingIn: string
  registering: string
  goToLogin: string
  goToRegister: string
  checkEmailTitle: string
  checkEmailDescription: string
  invalidEmail: string
  passwordTooShort: string
  passwordMismatch: string
  requestFailed: string
  unconfirmed: string
}

type AuthFormProps = {
  lang: Locale
  mode: "login" | "register"
  labels: AuthLabels
}

export function AuthForm({ lang, mode, labels }: AuthFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [confirmationSent, setConfirmationSent] = useState(false)
  const [isPending, startTransition] = useTransition()
  const isRegister = mode === "register"
  const title = isRegister ? labels.registerTitle : labels.loginTitle
  const description = isRegister
    ? labels.registerDescription
    : labels.loginDescription
  const submitLabel = isRegister ? labels.register : labels.login
  const pendingLabel = isRegister ? labels.registering : labels.loggingIn
  const next = searchParams.get("next") ?? `/${lang}/dashboard`

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const normalizedEmail = email.trim()

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError(labels.invalidEmail)
      return
    }

    if (password.length < 6) {
      setError(labels.passwordTooShort)
      return
    }

    if (isRegister && password !== confirmPassword) {
      setError(labels.passwordMismatch)
      return
    }

    setError(null)

    startTransition(async () => {
      const supabase = createSupabaseBrowserClient()

      if (isRegister) {
        const { error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        })

        if (signUpError) {
          setError(signUpError.message || labels.requestFailed)
          return
        }

        await supabase.auth.signOut()
        setConfirmationSent(true)
        return
      }

      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        })

      if (loginError) {
        setError(loginError.message || labels.requestFailed)
        return
      }

      if (!data.user?.email_confirmed_at) {
        await supabase.auth.signOut()
        setError(labels.unconfirmed)
        return
      }

      router.replace(next)
      router.refresh()
    })
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {confirmationSent ? (
          <Alert>
            <AlertTitle>{labels.checkEmailTitle}</AlertTitle>
            <AlertDescription>{labels.checkEmailDescription}</AlertDescription>
          </Alert>
        ) : null}
        <form className="space-y-4" onSubmit={onSubmit} aria-busy={isPending}>
          <div className="space-y-2">
            <Label htmlFor="email">{labels.email}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isPending || confirmationSent}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{labels.password}</Label>
            <Input
              id="password"
              type="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isPending || confirmationSent}
            />
          </div>
          {isRegister ? (
            <div className="space-y-2">
              <Label htmlFor="confirm-password">{labels.confirmPassword}</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                disabled={isPending || confirmationSent}
              />
            </div>
          ) : null}
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <Button
            type="submit"
            className="w-full"
            disabled={isPending || confirmationSent}
            aria-busy={isPending}
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : isRegister ? (
              <UserPlus className="size-4" />
            ) : (
              <LogIn className="size-4" />
            )}
            {isPending ? pendingLabel : submitLabel}
          </Button>
        </form>
      </CardContent>
      <CardFooter>
        <Button
          nativeButton={false}
          variant="link"
          className="mx-auto"
          render={
            <PendingLink
              href={`/${lang}/auth/${isRegister ? "login" : "register"}?next=${encodeURIComponent(next)}`}
            />
          }
        >
          {isRegister ? labels.goToLogin : labels.goToRegister}
        </Button>
      </CardFooter>
    </Card>
  )
}
