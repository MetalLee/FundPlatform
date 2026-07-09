"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  LayoutDashboard,
  Settings,
  WalletCards,
} from "lucide-react"

import { cn } from "@/lib/utils/cn"

const navItems = [
  {
    key: "dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    key: "funds",
    href: "/funds",
    icon: WalletCards,
  },
  {
    key: "portfolio",
    href: "/portfolio",
    icon: BriefcaseBusiness,
  },
  {
    key: "insights",
    href: "/insights",
    icon: ChartNoAxesCombined,
  },
  {
    key: "settings",
    href: "/settings",
    icon: Settings,
  },
] as const

type SidebarNavProps = {
  lang: string
  labels: Record<(typeof navItems)[number]["key"], string>
  className?: string
}

export function SidebarNav({ lang, labels, className }: SidebarNavProps) {
  const pathname = usePathname()

  return (
    <nav className={cn("flex flex-col gap-1", className)}>
      {navItems.map((item) => {
        const href = `/${lang}${item.href}`
        const isActive =
          pathname === href ||
          (item.href !== "/dashboard" && pathname.startsWith(href))
        const Icon = item.icon

        return (
          <Link
            key={item.href}
            href={href}
            className={cn(
              "flex h-8 items-center gap-2 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              isActive && "bg-muted text-foreground",
            )}
          >
            <Icon className="size-4" />
            <span>{labels[item.key]}</span>
          </Link>
        )
      })}
    </nav>
  )
}

export function SidebarBrand({
  lang,
  appName,
  subtitle,
}: {
  lang: string
  appName: string
  subtitle: string
}) {
  return (
    <Link href={`/${lang}/dashboard`} className="flex items-center gap-2">
      <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <BarChart3 className="size-4" />
      </div>
      <div className="leading-tight">
        <div className="text-sm font-medium">{appName}</div>
        <div className="text-[0.625rem] text-muted-foreground">{subtitle}</div>
      </div>
    </Link>
  )
}
