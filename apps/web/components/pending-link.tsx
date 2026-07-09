"use client"

import {
  forwardRef,
  MouseEvent,
  useEffect,
  useState,
  type AnchorHTMLAttributes,
} from "react"
import Link, { type LinkProps } from "next/link"
import { usePathname } from "next/navigation"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils/cn"

type PendingLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
    showSpinner?: boolean
  }

export const PendingLink = forwardRef<HTMLAnchorElement, PendingLinkProps>(
  function PendingLink(
    { className, children, onClick, showSpinner, href, ...props },
    ref,
  ) {
    const pathname = usePathname()
    const [isPending, setIsPending] = useState(false)

    useEffect(() => {
      setIsPending(false)
    }, [href, pathname])

    function handleClick(event: MouseEvent<HTMLAnchorElement>) {
      onClick?.(event)

      if (
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        props.target === "_blank"
      ) {
        return
      }

      setIsPending(true)
    }

    return (
      <>
        {isPending ? (
          <div className="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-primary/10">
            <div className="h-full w-1/3 animate-[route-progress_900ms_ease-in-out_infinite] bg-primary" />
          </div>
        ) : null}
        <Link
          ref={ref}
          href={href}
          aria-busy={isPending || undefined}
          className={cn(
            "transition-all motion-safe:duration-200",
            isPending && "opacity-75",
            className,
          )}
          onClick={handleClick}
          {...props}
        >
          {children}
          {showSpinner && isPending ? (
            <Loader2 className="ml-1 size-3 animate-spin" aria-hidden="true" />
          ) : null}
        </Link>
      </>
    )
  },
)
