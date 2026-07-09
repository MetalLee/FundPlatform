from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any

import requests


@dataclass(frozen=True)
class SupabaseClient:
    url: str
    service_role_key: str

    @classmethod
    def from_env(cls) -> "SupabaseClient":
        url = os.environ["SUPABASE_URL"].rstrip("/")
        service_role_key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
        return cls(url=url, service_role_key=service_role_key)

    @property
    def headers(self) -> dict[str, str]:
        return {
            "apikey": self.service_role_key,
            "authorization": f"Bearer {self.service_role_key}",
            "content-type": "application/json",
        }

    def upsert(
        self,
        table: str,
        rows: list[dict[str, Any]],
        on_conflict: str,
    ) -> int:
        if not rows:
            return 0

        response = requests.post(
            f"{self.url}/rest/v1/{table}",
            params={"on_conflict": on_conflict},
            headers={
                **self.headers,
                "prefer": "resolution=merge-duplicates,return=minimal",
            },
            json=rows,
            timeout=60,
        )
        response.raise_for_status()
        return len(rows)

    def select(
        self,
        table: str,
        params: dict[str, str] | None = None,
    ) -> list[dict[str, Any]]:
        response = requests.get(
            f"{self.url}/rest/v1/{table}",
            params=params,
            headers=self.headers,
            timeout=60,
        )
        response.raise_for_status()
        return response.json()

    def insert_log(self, row: dict[str, Any]) -> None:
        response = requests.post(
            f"{self.url}/rest/v1/data_sync_logs",
            headers={**self.headers, "prefer": "return=minimal"},
            json=row,
            timeout=30,
        )
        response.raise_for_status()
