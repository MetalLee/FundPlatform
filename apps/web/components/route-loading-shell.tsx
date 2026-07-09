import { LoadingState } from "@/components/loading-state"
import type { Locale } from "@/app/[lang]/dictionaries"

type RouteLoadingShellProps = {
  lang?: Locale
  path: string
  title: string
  rows?: number
}

export function RouteLoadingShell({
  rows = 6,
}: RouteLoadingShellProps) {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <LoadingState rows={1} />
      <LoadingState rows={rows} />
    </div>
  )
}
