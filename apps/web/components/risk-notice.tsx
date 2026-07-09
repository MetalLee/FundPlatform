import { ShieldAlert } from "lucide-react"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"

const DEFAULT_RISK_NOTICE =
  "本页面涨跌幅为基于公开披露持仓和实时行情的估算结果，不代表基金真实净值。基金真实净值以基金公司披露为准。"

type RiskNoticeProps = {
  title: string
  description?: React.ReactNode
}

export function RiskNotice({ title, description }: RiskNoticeProps) {
  return (
    <Alert>
      <ShieldAlert className="size-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description ?? DEFAULT_RISK_NOTICE}</AlertDescription>
    </Alert>
  )
}

export { DEFAULT_RISK_NOTICE }
