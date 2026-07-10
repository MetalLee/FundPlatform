import unittest
from unittest.mock import patch

import pandas as pd

from akshare_sync.jobs import sync_latest_nav


class FakeClient:
    def __init__(self) -> None:
        self.rows_by_table = {}

    def upsert(self, table, rows, on_conflict):
        self.rows_by_table[table] = rows
        return len(rows)


class LatestNavSyncTests(unittest.TestCase):
    @patch("akshare_sync.jobs.ak.fund_open_fund_info_em")
    @patch("akshare_sync.jobs.ak.fund_open_fund_daily_em")
    def test_falls_back_to_history_when_daily_change_is_missing(
        self,
        daily_mock,
        history_mock,
    ) -> None:
        daily_mock.return_value = pd.DataFrame(
            [
                {
                    "基金代码": "270023",
                    "基金简称": "广发全球精选股票",
                    "2026-07-09-单位净值": None,
                    "2026-07-09-累计净值": None,
                    "2026-07-08-单位净值": 6.7747,
                    "2026-07-08-累计净值": 7.2137,
                    "日增长率": None,
                }
            ]
        )
        history_mock.return_value = pd.DataFrame(
            [
                {"净值日期": "2026-07-07", "单位净值": 6.6953, "日增长率": -2.52},
                {"净值日期": "2026-07-08", "单位净值": 6.7747, "日增长率": 1.19},
            ]
        )
        client = FakeClient()

        sync_latest_nav(client, ["270023"])

        row = client.rows_by_table["fund_navs"][0]
        self.assertEqual(row["nav_date"], "2026-07-08")
        self.assertEqual(row["nav_change_pct"], 1.19)
        self.assertEqual(
            row["data_source"],
            "akshare:fund_open_fund_daily_em,fund_open_fund_info_em",
        )
        history_mock.assert_called_once_with(
            symbol="270023",
            indicator="单位净值走势",
        )

    @patch("akshare_sync.jobs.ak.fund_open_fund_info_em")
    @patch("akshare_sync.jobs.ak.fund_open_fund_daily_em")
    def test_keeps_daily_nav_when_history_fallback_fails(
        self,
        daily_mock,
        history_mock,
    ) -> None:
        daily_mock.return_value = pd.DataFrame(
            [
                {
                    "基金代码": "270023",
                    "2026-07-08-单位净值": 6.7747,
                    "2026-07-08-累计净值": 7.2137,
                    "日增长率": None,
                }
            ]
        )
        history_mock.side_effect = ValueError("unexpected response shape")
        client = FakeClient()

        sync_latest_nav(client, ["270023"])

        row = client.rows_by_table["fund_navs"][0]
        self.assertEqual(row["nav"], 6.7747)
        self.assertIsNone(row["nav_change_pct"])
        self.assertEqual(row["data_source"], "akshare:fund_open_fund_daily_em")

    @patch("akshare_sync.jobs.ak.fund_open_fund_info_em")
    @patch("akshare_sync.jobs.ak.fund_open_fund_daily_em")
    def test_keeps_daily_nav_when_history_parsing_fails(
        self,
        daily_mock,
        history_mock,
    ) -> None:
        class InvalidHistory:
            def iterrows(self):
                raise ValueError("invalid history rows")

        daily_mock.return_value = pd.DataFrame(
            [
                {
                    "基金代码": "270023",
                    "2026-07-08-单位净值": 6.7747,
                    "2026-07-08-累计净值": 7.2137,
                    "日增长率": None,
                }
            ]
        )
        history_mock.return_value = InvalidHistory()
        client = FakeClient()

        sync_latest_nav(client, ["270023"])

        row = client.rows_by_table["fund_navs"][0]
        self.assertEqual(row["nav"], 6.7747)
        self.assertIsNone(row["nav_change_pct"])

    @patch("akshare_sync.jobs.ak.fund_open_fund_info_em")
    @patch("akshare_sync.jobs.ak.fund_open_fund_daily_em")
    def test_does_not_load_history_when_daily_change_exists(
        self,
        daily_mock,
        history_mock,
    ) -> None:
        daily_mock.return_value = pd.DataFrame(
            [
                {
                    "基金代码": "270023",
                    "2026-07-08-单位净值": 6.7747,
                    "2026-07-08-累计净值": 7.2137,
                    "日增长率": 1.19,
                }
            ]
        )
        client = FakeClient()

        sync_latest_nav(client, ["270023"])

        self.assertEqual(
            client.rows_by_table["fund_navs"][0]["nav_change_pct"],
            1.19,
        )
        history_mock.assert_not_called()


if __name__ == "__main__":
    unittest.main()
