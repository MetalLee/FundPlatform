from __future__ import annotations

from typing import Any


ESTIMATE_WARNINGS = [
    "估算基于公开披露持仓，可能滞后",
    "仅覆盖前十大或部分披露持仓",
    "未覆盖债券、现金、衍生品、基金经理调仓影响",
]


def calculate_fund_estimate(
    fund_code: str,
    holdings: list[dict[str, Any]],
    quotes: list[dict[str, Any]],
    estimate_date: str,
) -> dict[str, Any]:
    quote_map = {
        f"{quote.get('market')}:{quote.get('symbol')}": quote for quote in quotes
    }
    contributors: list[dict[str, Any]] = []

    for holding in holdings:
        if holding.get("asset_type") != "stock":
            continue

        quote = quote_map.get(f"{holding.get('market')}:{holding.get('symbol')}")
        change_pct = _to_float(quote.get("change_pct") if quote else None)

        if quote is None or change_pct is None:
            continue

        weight_pct = _to_float(holding.get("weight_pct")) or 0
        contribution_pct = (weight_pct * change_pct) / 100
        contributors.append(
            {
                "market": holding.get("market") or "OTHER",
                "symbol": holding.get("symbol"),
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
