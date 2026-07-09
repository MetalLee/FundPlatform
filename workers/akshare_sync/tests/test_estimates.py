import unittest

from akshare_sync.estimates import calculate_fund_estimate


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


if __name__ == "__main__":
    unittest.main()
