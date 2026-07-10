from __future__ import annotations

from typing import Any


ESTIMATE_WARNINGS = [
    "估算基于公开披露持仓，可能滞后",
    "仅覆盖前十大或部分披露持仓",
    "未覆盖债券、现金、衍生品、基金经理调仓影响",
]
EASTMONEY_MARKET_PREFIXES = ("105", "106", "107")


def calculate_fund_estimate(
    fund_code: str,
    holdings: list[dict[str, Any]],
    quotes: list[dict[str, Any]],
    estimate_date: str,
) -> dict[str, Any]:
    contributors: list[dict[str, Any]] = []

    for holding in holdings:
        if holding.get("asset_type") != "stock":
            continue

        quote = find_quote_for_holding(holding, quotes)
        change_pct = _to_float(quote.get("change_pct") if quote else None)

        if quote is None or change_pct is None:
            continue

        weight_pct = _to_float(holding.get("weight_pct")) or 0
        contribution_pct = (weight_pct * change_pct) / 100
        contributors.append(
            {
                "market": quote.get("market") or "OTHER",
                "symbol": quote.get("symbol"),
                "name": holding.get("name") or quote.get("name"),
                "weightPct": weight_pct,
                "changePct": change_pct,
                "contributionPct": contribution_pct,
            }
        )

    contributors.sort(key=lambda item: abs(item["contributionPct"]), reverse=True)

    return {
        "user_id": None,
        "fund_code": fund_code,
        "estimate_date": estimate_date,
        "estimated_change_pct": sum(item["contributionPct"] for item in contributors),
        "estimated_profit_amount": None,
        "covered_weight_pct": sum(item["weightPct"] for item in contributors),
        "top_contributors": contributors[:10],
        "warnings": ESTIMATE_WARNINGS,
    }


def _to_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def quote_symbol_candidates(symbols: list[str]) -> list[str]:
    candidates: dict[str, None] = {}
    for symbol in symbols:
        base_symbol = _normalize_quote_symbol(symbol)
        candidates[base_symbol] = None
        for prefix in EASTMONEY_MARKET_PREFIXES:
            candidates[f"{prefix}.{base_symbol}"] = None
    return list(candidates)


def find_quote_for_holding(
    holding: dict[str, Any],
    quotes: list[dict[str, Any]],
) -> dict[str, Any] | None:
    holding_symbol = _normalize_quote_symbol(holding.get("symbol"))
    holding_name = _normalize_quote_name(holding.get("name"))
    unique_quotes = {
        f"{quote.get('market')}:{quote.get('symbol')}": quote for quote in quotes
    }.values()
    symbol_matches = [
        quote
        for quote in unique_quotes
        if _normalize_quote_symbol(quote.get("symbol")) == holding_symbol
    ]
    name_matches = [
        quote
        for quote in unique_quotes
        if holding_name and _normalize_quote_name(quote.get("name")) == holding_name
    ]
    exact_matches = [quote for quote in symbol_matches if quote in name_matches]

    if len(exact_matches) == 1:
        return exact_matches[0]
    if len(exact_matches) > 1:
        return None
    if len(symbol_matches) == 1:
        return symbol_matches[0]
    if len(symbol_matches) > 1:
        return None
    return name_matches[0] if len(name_matches) == 1 else None


def _normalize_quote_symbol(value: Any) -> str:
    symbol = str(value or "").strip().upper()
    prefix, separator, base_symbol = symbol.partition(".")
    return base_symbol if separator and prefix.isdigit() else symbol


def _normalize_quote_name(value: Any) -> str:
    return " ".join(str(value or "").strip().upper().split())
