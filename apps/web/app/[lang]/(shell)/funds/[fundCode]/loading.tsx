import { RouteLoadingShell } from "@/components/route-loading-shell"

export default function FundDetailLoading() {
  return <RouteLoadingShell path="/funds" title="Fund Detail" rows={6} />
}
