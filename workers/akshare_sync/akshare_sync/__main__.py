from __future__ import annotations

import argparse

from .jobs import (
    recalculate_estimates,
    sync_asset_allocations,
    sync_bond_holdings,
    sync_fund_basic,
    sync_latest_nav,
    sync_market_quotes,
    sync_nav_history,
    sync_stock_holdings,
    sync_fund_disclosures,
    with_sync_log,
)
from .supabase import SupabaseClient
from .tracking import get_active_tracked_fund_codes
from .transform import normalize_fund_code


def parse_fund_codes(value: str | None) -> list[str]:
    raw_value = value or ""
    return [
      normalize_fund_code(item)
      for item in raw_value.split(",")
      if item.strip()
    ]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "task",
        choices=[
            "sync-fund-basic",
            "sync-latest-nav",
            "sync-nav-history",
            "sync-stock-holdings",
            "sync-bond-holdings",
            "sync-asset-allocations",
            "sync-a-share-quotes",
            "sync-hk-quotes",
            "sync-us-quotes",
            "sync-fund-disclosures",
            "recalculate-estimates",
            "sync-all",
        ],
    )
    parser.add_argument("--fund-codes", default=None)
    args = parser.parse_args()

    client = SupabaseClient.from_env()
    fund_codes = parse_fund_codes(args.fund_codes)

    run_task(client, args.task, fund_codes)


def run_task(client: SupabaseClient, task: str, fund_codes: list[str]) -> None:
    if task in {
        "sync-all",
        "sync-fund-basic",
        "sync-latest-nav",
        "sync-nav-history",
        "sync-stock-holdings",
        "sync-bond-holdings",
        "sync-asset-allocations",
        "sync-fund-disclosures",
        "recalculate-estimates",
    } and not fund_codes:
        fund_codes = get_active_tracked_fund_codes(client)

    target = ",".join(fund_codes) if fund_codes else None

    if task == "sync-fund-basic":
        with_sync_log(client, task, target, lambda: sync_fund_basic(client, fund_codes))
    elif task == "sync-latest-nav":
        with_sync_log(client, task, target, lambda: sync_latest_nav(client, fund_codes))
    elif task == "sync-nav-history":
        with_sync_log(client, task, target, lambda: sync_nav_history(client, fund_codes))
    elif task == "sync-stock-holdings":
        with_sync_log(client, task, target, lambda: sync_stock_holdings(client, fund_codes))
    elif task == "sync-bond-holdings":
        with_sync_log(client, task, target, lambda: sync_bond_holdings(client, fund_codes))
    elif task == "sync-asset-allocations":
        with_sync_log(client, task, target, lambda: sync_asset_allocations(client, fund_codes))
    elif task == "sync-fund-disclosures":
        with_sync_log(client, task, target, lambda: sync_fund_disclosures(client, fund_codes))
    elif task == "sync-a-share-quotes":
        with_sync_log(client, task, "CN", lambda: sync_market_quotes(client, "CN"))
    elif task == "sync-hk-quotes":
        with_sync_log(client, task, "HK", lambda: sync_market_quotes(client, "HK"))
    elif task == "sync-us-quotes":
        with_sync_log(client, task, "US", lambda: sync_market_quotes(client, "US"))
    elif task == "recalculate-estimates":
        with_sync_log(client, task, target, lambda: recalculate_estimates(client, fund_codes))
    elif task == "sync-all":
        if fund_codes:
            run_task(client, "sync-fund-basic", fund_codes)
            run_task(client, "sync-latest-nav", fund_codes)
            run_task(client, "sync-stock-holdings", fund_codes)
            run_task(client, "sync-bond-holdings", fund_codes)
            run_task(client, "sync-asset-allocations", fund_codes)
        else:
            run_task(client, "sync-latest-nav", [])
        run_task(client, "sync-a-share-quotes", [])
        run_task(client, "sync-hk-quotes", [])
        run_task(client, "sync-us-quotes", [])
        run_task(client, "recalculate-estimates", fund_codes)


if __name__ == "__main__":
    main()
