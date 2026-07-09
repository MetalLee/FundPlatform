import unittest

from akshare_sync.estimates import calculate_fund_estimate
from akshare_sync.tracking import get_active_tracked_fund_codes


class EstimateTests(unittest.TestCase):
    def test_calculates_estimate_from_cached_quotes(self) -> None:
        result = calculate_fund_estimate(
            fund_code="006327",
            holdings=[
                {
                    "fund_code": "006327",
                    "asset_type": "stock",
                    "market": "US",
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
                    "symbol": "NVDA",
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
        self.assertEqual(result["top_contributors"][0]["symbol"], "NVDA")

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
