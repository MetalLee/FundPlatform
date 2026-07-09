from __future__ import annotations

import os
import time
from typing import Callable

import requests
import akshare as ak
import pandas as pd
from requests.exceptions import RequestException

from .estimates import calculate_fund_estimate
from .supabase import SupabaseClient
from .transform import (
    first_value,
    normalize_fund_code,
    normalize_symbol,
    now_iso,
    to_date,
    to_float,
)

AKSHARE_DEFAULT_TIMEOUT_SECONDS = float(os.getenv("AKSHARE_DEFAULT_TIMEOUT_SECONDS", "15"))
AKSHARE_RETRY_ATTEMPTS = max(1, int(os.getenv("AKSHARE_RETRY_ATTEMPTS", "3")))
AKSHARE_RETRY_BASE_DELAY_SECONDS = float(
    os.getenv("AKSHARE_RETRY_BASE_DELAY_SECONDS", "1.0")
)
_ORIGINAL_REQUEST = requests.sessions.Session.request


def _session_request_with_timeout(self: requests.sessions.Session, method: str, *args: object, **kwargs: object) -> object:  # noqa: ANN001
    kwargs.setdefault("timeout", AKSHARE_DEFAULT_TIMEOUT_SECONDS)
    return _ORIGINAL_REQUEST(self, method, *args, **kwargs)


requests.sessions.Session.request = _session_request_with_timeout


def _call_with_retries(
    label: str,
    func: Callable[[], pd.DataFrame],
) -> pd.DataFrame:
    last_error: Exception | None = None
    for attempt in range(1, AKSHARE_RETRY_ATTEMPTS + 1):
        try:
            return func()
        except RequestException as error:
            last_error = error
            if attempt >= AKSHARE_RETRY_ATTEMPTS:
                raise
            sleep_seconds = AKSHARE_RETRY_BASE_DELAY_SECONDS * (2 ** (attempt - 1))
            time.sleep(sleep_seconds)
    raise last_error or RuntimeError(f"Failed to execute {label}")


def _safe_akshare_call(
    label: str,
    func: Callable[[], pd.DataFrame],
) -> pd.DataFrame:
    try:
        return _call_with_retries(label, func)
    except RequestException:
        return pd.DataFrame()


def with_sync_log(
    client: SupabaseClient,
    task: str,
    target: str | None,
    fn: Callable[[], int],
) -> int:
    started = time.monotonic()
    try:
        item_count = fn()
        client.insert_log(
            {
                "source": "akshare",
                "task": task,
                "status": "success",
                "target": target,
                "item_count": item_count,
                "duration_ms": int((time.monotonic() - started) * 1000),
            }
        )
        return item_count
    except Exception as error:
        client.insert_log(
            {
                "source": "akshare",
                "task": task,
                "status": "failed",
                "target": target,
                "item_count": 0,
                "duration_ms": int((time.monotonic() - started) * 1000),
                "error_code": error.__class__.__name__,
                "error_message": str(error)[:1000],
            }
        )
        raise


def sync_fund_basic(client: SupabaseClient, fund_codes: list[str]) -> int:
    rows: list[dict] = []
    synced_at = now_iso()

    name_df = _safe_akshare_call("fund_name_em()", ak.fund_name_em)

    for fund_code in fund_codes:
        code = normalize_fund_code(fund_code)
        name_row = _find_fund_row(name_df, code)
        overview = _safe_overview(code)
        overview_row = overview.iloc[0] if not overview.empty else pd.Series(dtype=object)
        has_metadata = not name_row.empty or not overview_row.empty

        rows.append(
            {
                "fund_code": code,
                "fund_name": first_value(name_row, ["基金简称", "基金名称", "name"])
                or first_value(overview_row, ["基金简称", "基金名称"]),
                "fund_type": first_value(name_row, ["基金类型", "类型"])
                or first_value(overview_row, ["基金类型", "基金类别"]),
                "manager": first_value(overview_row, ["基金经理", "现任基金经理"]),
                "company": first_value(overview_row, ["基金管理人", "基金公司", "管理人"]),
                "data_source": "akshare:fund_name_em,fund_overview_em",
                "last_synced_at": synced_at,
                "sync_status": "synced" if has_metadata else "failed",
                "sync_completed_at": synced_at,
                "sync_error_message": None if has_metadata else "No metadata available after retries.",
            }
        )

    return client.upsert("funds", rows, "fund_code")


def sync_latest_nav(client: SupabaseClient, fund_codes: list[str] | None) -> int:
    df = ak.fund_open_fund_daily_em()
    synced_at = now_iso()
    rows: list[dict] = []
    wanted = (
        {normalize_fund_code(code) for code in fund_codes}
        if fund_codes is not None
        else None
    )

    for _, row in df.iterrows():
        code = normalize_fund_code(first_value(row, ["基金代码", "代码", "fund_code"]))
        if wanted is not None and code not in wanted:
            continue
        nav_date = to_date(first_value(row, ["净值日期", "日期"]))
        if not nav_date:
            continue
        rows.append(
            {
                "fund_code": code,
                "nav_date": nav_date,
                "nav": to_float(first_value(row, ["单位净值", "最新净值"])),
                "accumulated_nav": to_float(first_value(row, ["累计净值"])),
                "nav_change_pct": to_float(first_value(row, ["日增长率", "增长率"])),
                "data_source": "akshare:fund_open_fund_daily_em",
                "last_synced_at": synced_at,
            }
        )

    ensure_funds(client, [row["fund_code"] for row in rows])
    return client.upsert("fund_navs", rows, "fund_code,nav_date")


def sync_nav_history(client: SupabaseClient, fund_codes: list[str]) -> int:
    rows: list[dict] = []
    synced_at = now_iso()

    for fund_code in fund_codes:
        code = normalize_fund_code(fund_code)
        df = ak.fund_open_fund_info_em(symbol=code, indicator="单位净值走势")
        for _, row in df.iterrows():
            nav_date = to_date(first_value(row, ["净值日期", "日期"]))
            if not nav_date:
                continue
            rows.append(
                {
                    "fund_code": code,
                    "nav_date": nav_date,
                    "nav": to_float(first_value(row, ["单位净值", "净值"])),
                    "nav_change_pct": to_float(first_value(row, ["日增长率", "涨跌幅"])),
                    "data_source": "akshare:fund_open_fund_info_em",
                    "last_synced_at": synced_at,
                }
            )

    ensure_funds(client, [row["fund_code"] for row in rows])
    return client.upsert("fund_navs", rows, "fund_code,nav_date")


def sync_stock_holdings(client: SupabaseClient, fund_codes: list[str]) -> int:
    rows: list[dict] = []
    synced_at = now_iso()

    for fund_code in fund_codes:
        code = normalize_fund_code(fund_code)
        df = ak.fund_portfolio_hold_em(symbol=code)
        for _, row in df.iterrows():
            symbol = normalize_symbol(first_value(row, ["股票代码", "代码", "证券代码"]))
            report_period = str(first_value(row, ["季度", "报告期", "持仓季度"]) or "")
            if not symbol or not report_period:
                continue
            rows.append(
                {
                    "fund_code": code,
                    "report_period": report_period,
                    "asset_type": "stock",
                    "market": "CN",
                    "symbol": symbol,
                    "name": first_value(row, ["股票名称", "名称", "证券名称"]),
                    "weight_pct": to_float(first_value(row, ["占净值比例", "持仓占比", "占比"])) or 0,
                    "shares": to_float(first_value(row, ["持股数", "持仓数量"])),
                    "market_value": to_float(first_value(row, ["持仓市值", "市值"])),
                    "data_source": "akshare:fund_portfolio_hold_em",
                    "source_report_date": to_date(first_value(row, ["报告日期", "公告日期"])),
                    "last_synced_at": synced_at,
                }
            )

    return client.upsert("fund_holdings", rows, "fund_code,report_period,symbol")


def sync_bond_holdings(client: SupabaseClient, fund_codes: list[str]) -> int:
    rows: list[dict] = []
    synced_at = now_iso()

    for fund_code in fund_codes:
        code = normalize_fund_code(fund_code)
        df = ak.fund_portfolio_bond_hold_em(symbol=code)
        for _, row in df.iterrows():
            symbol = normalize_symbol(first_value(row, ["债券代码", "代码", "证券代码"]))
            report_period = str(first_value(row, ["季度", "报告期", "持仓季度"]) or "")
            if not symbol or not report_period:
                continue
            rows.append(
                {
                    "fund_code": code,
                    "report_period": report_period,
                    "asset_type": "bond",
                    "market": "CN",
                    "symbol": symbol,
                    "name": first_value(row, ["债券名称", "名称", "证券名称"]),
                    "weight_pct": to_float(first_value(row, ["占净值比例", "持仓占比", "占比"])) or 0,
                    "market_value": to_float(first_value(row, ["持仓市值", "市值"])),
                    "data_source": "akshare:fund_portfolio_bond_hold_em",
                    "source_report_date": to_date(first_value(row, ["报告日期", "公告日期"])),
                    "last_synced_at": synced_at,
                }
            )

    return client.upsert("fund_holdings", rows, "fund_code,report_period,symbol")


def sync_asset_allocations(client: SupabaseClient, fund_codes: list[str]) -> int:
    rows: list[dict] = []
    synced_at = now_iso()

    for fund_code in fund_codes:
        code = normalize_fund_code(fund_code)
        df = ak.fund_individual_detail_hold_xq(symbol=code)
        for _, row in df.iterrows():
            report_period = str(first_value(row, ["报告期", "日期", "季度"]) or "")
            asset_type = str(first_value(row, ["资产类型", "项目", "类别"]) or "").strip()
            if not report_period or not asset_type:
                continue
            rows.append(
                {
                    "fund_code": code,
                    "report_period": report_period,
                    "asset_type": asset_type,
                    "weight_pct": to_float(first_value(row, ["占比", "比例", "占净值比例"])) or 0,
                    "amount": to_float(first_value(row, ["金额", "市值"])),
                    "data_source": "akshare:fund_individual_detail_hold_xq",
                    "source_report_date": to_date(report_period),
                    "last_synced_at": synced_at,
                }
            )

    ensure_funds(client, [row["fund_code"] for row in rows])
    return client.upsert(
        "fund_asset_allocations",
        rows,
        "fund_code,report_period,asset_type",
    )


def sync_fund_disclosures(client: SupabaseClient, fund_codes: list[str]) -> int:
    return (
        sync_stock_holdings(client, fund_codes)
        + sync_bond_holdings(client, fund_codes)
        + sync_asset_allocations(client, fund_codes)
    )


def sync_market_quotes(client: SupabaseClient, market: str) -> int:
    df = {
        "CN": ak.stock_zh_a_spot_em,
        "HK": ak.stock_hk_spot_em,
        "US": ak.stock_us_spot_em,
    }[market]()
    synced_at = now_iso()
    rows: list[dict] = []

    for _, row in df.iterrows():
        symbol = normalize_symbol(first_value(row, ["代码", "证券代码", "symbol"]))
        if not symbol:
            continue
        rows.append(
            {
                "market": market,
                "symbol": symbol,
                "name": first_value(row, ["名称", "股票名称", "中文名称"]),
                "price": to_float(first_value(row, ["最新价", "现价", "价格"])),
                "previous_close": to_float(first_value(row, ["昨收", "昨收价"])),
                "change_pct": to_float(first_value(row, ["涨跌幅", "change_pct"])),
                "currency": {"CN": "CNY", "HK": "HKD", "US": "USD"}[market],
                "quote_time": synced_at,
                "data_source": f"akshare:{_quote_function_name(market)}",
                "last_synced_at": synced_at,
            }
        )

    return client.upsert("market_quotes", rows, "market,symbol")


def recalculate_estimates(
    client: SupabaseClient,
    fund_codes: list[str] | None,
) -> int:
    estimate_date = now_iso()[:10]
    codes = fund_codes if fund_codes is not None else [
        row["fund_code"]
        for row in client.select(
            "funds",
            {"select": "fund_code", "fund_type": "ilike.*QDII*"},
        )
    ]
    rows: list[dict] = []

    for fund_code in codes:
        code = normalize_fund_code(fund_code)
        report_rows = client.select(
            "fund_holdings",
            {
                "select": "report_period",
                "fund_code": f"eq.{code}",
                "order": "report_period.desc",
                "limit": "1",
            },
        )
        report_period = report_rows[0]["report_period"] if report_rows else None

        if not report_period:
            continue

        holdings = client.select(
            "fund_holdings",
            {
                "select": "*",
                "fund_code": f"eq.{code}",
                "report_period": f"eq.{report_period}",
                "order": "weight_pct.desc",
            },
        )
        quote_keys = {
            (holding.get("market"), holding.get("symbol"))
            for holding in holdings
            if holding.get("asset_type") == "stock"
        }
        quotes: list[dict] = []

        for market, symbol in quote_keys:
            if not market or not symbol:
                continue
            quotes.extend(
                client.select(
                    "market_quotes",
                    {
                        "select": "*",
                        "market": f"eq.{market}",
                        "symbol": f"eq.{symbol}",
                    },
                )
            )

        rows.append(calculate_fund_estimate(code, holdings, quotes, estimate_date))

    return client.upsert(
        "estimate_snapshots",
        rows,
        "user_id,fund_code,estimate_date",
    )


def _quote_function_name(market: str) -> str:
    return {
        "CN": "stock_zh_a_spot_em",
        "HK": "stock_hk_spot_em",
        "US": "stock_us_spot_em",
    }[market]


def ensure_funds(client: SupabaseClient, fund_codes: list[str]) -> None:
    unique_codes = sorted({normalize_fund_code(code) for code in fund_codes if code})
    synced_at = now_iso()
    client.upsert(
        "funds",
        [
            {
                "fund_code": code,
                "data_source": "akshare:stub",
                "last_synced_at": synced_at,
            }
            for code in unique_codes
        ],
        "fund_code",
    )


def _find_fund_row(df: pd.DataFrame, fund_code: str) -> pd.Series:
    for column in ["基金代码", "代码", "fund_code"]:
        if column in df.columns:
            rows = df[df[column].astype(str).str.zfill(6) == fund_code]
            if not rows.empty:
                return rows.iloc[0]
    return pd.Series(dtype=object)


def _safe_overview(fund_code: str) -> pd.DataFrame:
    try:
        return _safe_akshare_call(
            f"fund_overview_em(symbol={fund_code})",
            lambda: ak.fund_overview_em(symbol=fund_code),
        )
    except TypeError:
        return _safe_akshare_call(
            f"fund_overview_em(fund={fund_code})",
            lambda: ak.fund_overview_em(fund=fund_code),
        )
