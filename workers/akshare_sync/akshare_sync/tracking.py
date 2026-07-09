from __future__ import annotations

def get_active_tracked_fund_codes(client) -> list[str]:
    rows = client.select(
        "user_tracked_funds",
        {
            "select": "fund_code",
            "is_active": "eq.true",
            "order": "fund_code.asc",
        },
    )
    codes = {
        normalize_fund_code(row.get("fund_code"))
        for row in rows
        if row.get("fund_code")
    }

    return sorted(codes)


def normalize_fund_code(value: object) -> str:
    return str(value).strip().zfill(6)
