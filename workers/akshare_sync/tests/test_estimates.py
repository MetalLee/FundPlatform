import unittest

from akshare_sync.estimates import calculate_fund_estimate
from akshare_sync.jobs import recalculate_estimates
from akshare_sync.tracking import get_active_tracked_fund_codes


class EstimateTests(unittest.TestCase):
    def test_recalculation_loads_name_candidates_when_symbols_differ(self) -> None:
        class FakeClient:
            def __init__(self):
                self.written_rows = []

            def select(self, table, params):
                if table == "fund_holdings" and params.get("select") == "report_period":
                    return [{"report_period": "2026-Q2"}]
                if table == "fund_holdings":
                    return [
                        {
                            "asset_type": "stock",
                            "market": "CN",
                            "symbol": "GOOGL-C",
                            "name": "谷歌-C",
                            "weight_pct": 5,
                        }
                    ]
                if table == "market_quotes" and "name" in params:
                    return [
                        {
                            "market": "US",
                            "symbol": "105.GOOG",
                            "name": "谷歌-C",
                            "change_pct": 2,
                        }
                    ]
                if table == "market_quotes":
                    return []
                return []

            def upsert(self, table, rows, on_conflict):
                self.written_rows = rows
                return len(rows)

        client = FakeClient()

        self.assertEqual(recalculate_estimates(client, ["006327"]), 1)
        self.assertEqual(client.written_rows[0]["estimated_change_pct"], 0.1)
        self.assertEqual(
            client.written_rows[0]["top_contributors"][0]["symbol"],
            "105.GOOG",
        )

    def test_calculates_estimate_from_cached_quotes(self) -> None:
        result = calculate_fund_estimate(
            fund_code="006327",
            holdings=[
                {
                    "fund_code": "006327",
                    "asset_type": "stock",
                    "market": "CN",
                    "symbol": "NVDA",
                    "name": "NVIDIA",
                    "weight_pct": 10,
                },
                {
                    "fund_code": "006327",
                    "asset_type": "bond",
                    "market": "CN",
                    "symbol": "019547",
                    "name": "Bond",
                    "weight_pct": 5,
                },
            ],
            quotes=[
                {
                    "market": "US",
                    "symbol": "105.NVDA",
                    "name": "NVIDIA",
                    "change_pct": 2,
                }
            ],
            estimate_date="2026-07-09",
        )

        self.assertEqual(result["fund_code"], "006327")
        self.assertEqual(result["estimate_date"], "2026-07-09")
        self.assertEqual(result["estimated_change_pct"], 0.2)
        self.assertEqual(result["covered_weight_pct"], 10)
        self.assertEqual(result["top_contributors"][0]["symbol"], "105.NVDA")
        self.assertEqual(result["top_contributors"][0]["market"], "US")

    def test_reads_active_tracked_fund_codes_from_supabase(self) -> None:
        class FakeClient:
            def select(self, table, params):
                self.table = table
                self.params = params
                return [
                    {"fund_code": "000001"},
                    {"fund_code": "000001"},
                    {"fund_code": "161725"},
                    {"fund_code": None},
                ]

        client = FakeClient()

        self.assertEqual(get_active_tracked_fund_codes(client), ["000001", "161725"])
        self.assertEqual(client.table, "user_tracked_funds")
        self.assertEqual(client.params["select"], "fund_code")
        self.assertEqual(client.params["is_active"], "eq.true")


if __name__ == "__main__":
    unittest.main()
