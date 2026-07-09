export function formatDateTime(
  value: Date | string | number,
  locale = "zh-CN",
) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

export function formatRelativeMinutes(minutes: number) {
  if (minutes <= 0) {
    return "刚刚更新"
  }

  return `${minutes} 分钟前更新`
}
