from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Iterable

import pandas as pd


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def clean_value(value: Any) -> Any:
    if pd.isna(value):
        return None
    if hasattr(value, "item"):
        return value.item()
    return value


def first_value(row: pd.Series, candidates: Iterable[str]) -> Any:
    for name in candidates:
        if name in row and clean_value(row[name]) is not None:
            return clean_value(row[name])
    return None


def to_float(value: Any) -> float | None:
    value = clean_value(value)
    if value is None:
        return None
    text = str(value).replace("%", "").replace(",", "").strip()
    if not text or text == "-":
        return None
    try:
        return float(text)
    except ValueError:
        return None


def to_date(value: Any) -> str | None:
    value = clean_value(value)
    if value is None:
        return None
    try:
        return pd.to_datetime(value).date().isoformat()
    except Exception:
        return None


def normalize_fund_code(value: Any) -> str:
    return str(value).strip().zfill(6)


def normalize_symbol(value: Any) -> str:
    return str(value).strip().upper()
