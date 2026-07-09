const cnyFormatter = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  maximumFractionDigits: 2,
})

const compactCnyFormatter = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  notation: "compact",
  maximumFractionDigits: 2,
})

const percentFormatter = new Intl.NumberFormat("zh-CN", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatCny(value: number, options?: { compact?: boolean }) {
  return (options?.compact ? compactCnyFormatter : cnyFormatter).format(value)
}

export function formatPercent(value: number, options?: { signed?: boolean }) {
  const formatted = percentFormatter.format(value)

  if (!options?.signed || value <= 0) {
    return formatted
  }

  return `+${formatted}`
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value)
}
