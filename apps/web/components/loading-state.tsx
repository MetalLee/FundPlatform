import { Skeleton } from "@workspace/ui/components/skeleton"

type LoadingStateProps = {
  rows?: number
}

export function LoadingState({ rows = 3 }: LoadingStateProps) {
  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton
          key={index}
          className="h-16 w-full motion-safe:animate-pulse"
          style={{ animationDelay: `${index * 70}ms` }}
        />
      ))}
    </div>
  )
}
