from __future__ import annotations

import os
import time
from datetime import datetime
import math
import re
from typing import Any, Callable

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
US_QUOTE_PAGE_DELAY_SECONDS = float(
    os.getenv("US_QUOTE_PAGE_DELAY_SECONDS", "0.5")
)
US_QUOTE_CONNECT_TIMEOUT_SECONDS = float(
    os.getenv("US_QUOTE_CONNECT_TIMEOUT_SECONDS", "2")
)
US_QUOTE_READ_TIMEOUT_SECONDS = float(
    os.getenv("US_QUOTE_READ_TIMEOUT_SECONDS", "3")
)
US_QUOTE_MAX_PAGES = max(0, int(os.getenv("US_QUOTE_MAX_PAGES", "0")))
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


def _latest_daily_nav_columns(
    columns: list[object],
) -> list[tuple[str, str, str]]:
    date_to_columns: dict[str, dict[str, str]] = {}
    pattern = re.compile(r"^(\d{4}-\d{2}-\d{2})-(单位净值|累计净值)$")

    for column in columns:
        if not isinstance(column, str):
            continue
        match = pattern.match(column)
        if not match:
            continue
        date_str, value_type = match.groups()
        date_to_columns.setdefault(date_str, {})[value_type] = column

    available_dates = sorted(date_to_columns.keys(), reverse=True)
    return [
        (date, cols["单位净值"], cols["累计净值"])
        for date in available_dates
        for cols in [date_to_columns[date]]
        if "单位净值" in cols and "累计净值" in cols
    ]


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
                "fund_name": first_value(name_row, ["基金名称", "基金简称", "name"])
                or first_value(overview_row, ["基金名称", "基金简称"]),
                "fund_type": first_value(name_row, ["基金类型", "类型"])
                or first_value(overview_row, ["基金类型", "基金类别"]),
                "manager": first_value(overview_row, ["基金经理人", "管理人"]),
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
    nav_columns = _latest_daily_nav_columns(df.columns.tolist())
    if not nav_columns:
        return client.upsert("fund_navs", [], "fund_code,nav_date")
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

        selected_nav_date: str | None = None
        selected_nav: float | None = None
        selected_accumulated_nav: float | None = None

        for nav_date_candidate, nav_col, accumulated_nav_col in nav_columns:
            nav = to_float(first_value(row, [nav_col]))
            accumulated_nav = to_float(first_value(row, [accumulated_nav_col]))
            if nav is not None or accumulated_nav is not None:
                selected_nav_date = nav_date_candidate
                selected_nav = nav
                selected_accumulated_nav = accumulated_nav
                break

        if not selected_nav_date:
            continue
        parsed_nav_date = to_date(selected_nav_date)
        if not parsed_nav_date:
            continue

        rows.append(
            {
                "fund_code": code,
                "nav_date": parsed_nav_date,
                "nav": selected_nav,
                "accumulated_nav": selected_accumulated_nav,
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
                    "nav": to_float(first_value(row, ["单位净值", "最新净值"])),
                    "accumulated_nav": to_float(first_value(row, ["累计净值"])),
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
        current_year = str(datetime.now().year)
        df = ak.fund_portfolio_hold_em(symbol=code, date=current_year)
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
                    "weight_pct": to_float(first_value(row, ["占净值比例", "持仓占净值比例", "占净值"])) or 0,
                    "shares": to_float(first_value(row, ["持仓数", "持仓份额", "持仓股票数", "份额"])),
                    "market_value": to_float(
                        first_value(row, ["持仓市值（万元）", "持仓市值", "市值（万元）", "市值"])
                    ),
                    "data_source": "akshare:fund_portfolio_hold_em",
                    "source_report_date": to_date(
                        first_value(row, ["报告日期", "估算日期", "更新日期"])
                    ),
                    "last_synced_at": synced_at,
                }
            )

    return client.upsert("fund_holdings", rows, "fund_code,report_period,symbol")

def sync_bond_holdings(client: SupabaseClient, fund_codes: list[str]) -> int:
    rows: list[dict] = []
    synced_at = now_iso()

    for fund_code in fund_codes:
        code = normalize_fund_code(fund_code)
        current_year = str(datetime.now().year)
        try:
            df = ak.fund_portfolio_bond_hold_em(symbol=code, date=current_year)
        except (RequestException, KeyError, ValueError):
            continue

        if df.empty:
            continue
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
                    "weight_pct": to_float(first_value(row, ["占净值比例", "持仓占净值比例", "占净值"])) or 0,
                    "market_value": to_float(
                        first_value(row, ["持仓市值（万元）", "持仓市值", "市值（万元）", "市值"])
                    ),
                    "data_source": "akshare:fund_portfolio_bond_hold_em",
                    "source_report_date": to_date(
                        first_value(row, ["报告日期", "估算日期", "更新日期"])
                    ),
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
            asset_type = str(first_value(row, ["资产类别", "行业", "类型"]) or "").strip()
            if not report_period or not asset_type:
                continue
            rows.append(
                {
                    "fund_code": code,
                    "report_period": report_period,
                    "asset_type": asset_type,
                    "weight_pct": to_float(first_value(row, ["占净值比例", "持仓占净值比例", "占净值"])) or 0,
                    "amount": to_float(
                        first_value(row, ["持仓市值（万元）", "持仓市值", "市值（万元）"])
                    ),
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
    if market == "US":
        item_count = 0

        def upsert_round(df: pd.DataFrame) -> None:
            nonlocal item_count
            item_count += _upsert_market_quote_dataframe(client, market, df)

        _fetch_us_quotes(on_round=upsert_round)
        return item_count

    df = {
        "CN": ak.stock_zh_a_spot_em,
        "HK": ak.stock_hk_spot_em,
    }[market]()
    return _upsert_market_quote_dataframe(client, market, df)


def _upsert_market_quote_dataframe(
    client: SupabaseClient,
    market: str,
    df: pd.DataFrame,
) -> int:
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
                "name": first_value(row, ["名称", "股票名称", "简称"]),
                "price": to_float(first_value(row, ["最新价", "现价", "价格"])),
                "previous_close": to_float(first_value(row, ["昨收", "前收", "昨收盘"])),
                "change_pct": to_float(
                    first_value(row, ["涨跌幅", "涨跌幅(%)", "change_pct"])
                ),
                "currency": {"CN": "CNY", "HK": "HKD", "US": "USD"}[market],
                "quote_time": synced_at,
                "data_source": f"akshare:{_quote_function_name(market)}",
                "last_synced_at": synced_at,
            }
        )

    return client.upsert("market_quotes", rows, "market,symbol")


def _fetch_us_quotes(
    request_get: Callable[..., requests.Response] = requests.get,
    on_round: Callable[[pd.DataFrame], None] | None = None,
) -> pd.DataFrame:
    """Fetch EastMoney US quotes while retaining completed page progress."""
    url = "https://72.push2.eastmoney.com/api/qt/clist/get"
    base_params = {
        "pn": "1",
        "pz": "100",
        "po": "1",
        "np": "1",
        "ut": "bd1d9ddb04089700cf9c27f6f7426281",
        "fltt": "2",
        "invt": "2",
        "fid": "f12",
        "fs": "m:105,m:106,m:107",
        "fields": "f2,f3,f12,f13,f14,f18",
    }
    raw_rows: list[dict[str, Any]] = []
    failed_pages: list[int] = []
    configured_pages = [
        int(item.strip())
        for item in os.getenv("US_QUOTE_PAGES", "").split(",")
        if item.strip()
    ]

    if configured_pages:
        requested_pages = configured_pages
        initial_pages = requested_pages
    elif US_QUOTE_MAX_PAGES:
        requested_pages = list(range(1, US_QUOTE_MAX_PAGES + 1))
        initial_pages = requested_pages
    else:
        discovery_page = 1
        while True:
            params = {**base_params, "pn": str(discovery_page)}
            try:
                response = _get_us_quote_page(request_get, url, params)
            except RequestException:
                failed_pages.append(discovery_page)
                discovery_page += 1
                if discovery_page > 10:
                    raise RuntimeError(
                        "Unable to discover US quote page count after 10 pages"
                    )
                continue
            data = response.json().get("data") or {}
            raw_rows.extend(data.get("diff") or [])
            total = int(data.get("total") or len(raw_rows))
            total_pages = max(1, math.ceil(total / int(base_params["pz"])))
            break
        requested_pages = list(range(1, total_pages + 1))
        initial_pages = requested_pages[discovery_page:]

    for page_number in initial_pages:
        params = {**base_params, "pn": str(page_number)}
        try:
            response = _get_us_quote_page(request_get, url, params)
        except RequestException:
            failed_pages.append(page_number)
            continue
        data = response.json().get("data") or {}
        raw_rows.extend(data.get("diff") or [])
        if US_QUOTE_PAGE_DELAY_SECONDS > 0:
            time.sleep(US_QUOTE_PAGE_DELAY_SECONDS)

    initial_row_count = len(raw_rows)
    initial_frame = _us_quote_rows_to_dataframe(raw_rows[:initial_row_count])
    if on_round:
        on_round(initial_frame)
    _print_us_quote_round_summary(1, requested_pages, failed_pages)

    round_number = 2
    while failed_pages:
        retry_pages = failed_pages
        failed_pages = []
        round_rows: list[dict[str, Any]] = []
        for page_number in retry_pages:
            params = {**base_params, "pn": str(page_number)}
            try:
                response = _get_us_quote_page(request_get, url, params)
            except RequestException:
                failed_pages.append(page_number)
                continue
            data = response.json().get("data") or {}
            page_rows = data.get("diff") or []
            round_rows.extend(page_rows)
            raw_rows.extend(page_rows)
            if US_QUOTE_PAGE_DELAY_SECONDS > 0:
                time.sleep(US_QUOTE_PAGE_DELAY_SECONDS)

        round_frame = _us_quote_rows_to_dataframe(round_rows)
        if on_round:
            on_round(round_frame)
        _print_us_quote_round_summary(round_number, retry_pages, failed_pages)
        round_number += 1

    return _us_quote_rows_to_dataframe(raw_rows)


def _print_us_quote_round_summary(
    round_number: int,
    requested_pages: list[int],
    failed_pages: list[int],
) -> None:
    failed_page_numbers = ",".join(str(item) for item in failed_pages) or "none"
    print(
        "US quote round summary: "
        f"round={round_number} "
        f"requested_pages={len(requested_pages)} "
        f"successful_pages={len(requested_pages) - len(failed_pages)} "
        f"failed_pages={len(failed_pages)} "
        f"failed_page_numbers={failed_page_numbers}",
        flush=True,
    )


def _us_quote_rows_to_dataframe(raw_rows: list[dict[str, Any]]) -> pd.DataFrame:
    columns = ["代码", "名称", "最新价", "昨收", "涨跌幅"]
    return pd.DataFrame(
        [
            {
                "代码": f"{row.get('f13')}.{row.get('f12')}",
                "名称": row.get("f14"),
                "最新价": row.get("f2"),
                "昨收": row.get("f18"),
                "涨跌幅": row.get("f3"),
            }
            for row in raw_rows
        ],
        columns=columns,
    )


def _get_us_quote_page(
    request_get: Callable[..., requests.Response],
    url: str,
    params: dict[str, str],
) -> requests.Response:
    response = request_get(
        url,
        params=params,
        timeout=(
            US_QUOTE_CONNECT_TIMEOUT_SECONDS,
            US_QUOTE_READ_TIMEOUT_SECONDS,
        ),
    )
    response.raise_for_status()
    return response

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
