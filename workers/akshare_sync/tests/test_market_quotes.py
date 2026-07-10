import unittest
from contextlib import redirect_stdout
from io import StringIO
from unittest.mock import patch

import requests
import pandas as pd

from akshare_sync import jobs
from akshare_sync.jobs import _fetch_us_quotes


class FakeResponse:
    def __init__(self, payload):
        self.payload = payload

    def raise_for_status(self) -> None:
        return None

    def json(self):
        return self.payload


class MarketQuoteTests(unittest.TestCase):
    @patch("akshare_sync.jobs.time.sleep", return_value=None)
    def test_cn_quote_fetch_retries_page_with_invalid_discovery_total(
        self,
        _sleep,
    ) -> None:
        requested_pages = []

        def request_get(_url, *, params, timeout):
            page = int(params["pn"])
            requested_pages.append(page)
            total = {} if page == 1 and requested_pages.count(1) == 1 else 201
            return FakeResponse(
                {
                    "data": {
                        "total": total,
                        "diff": [
                            {
                                "f2": page,
                                "f3": page,
                                "f12": f"PAGE{page}",
                                "f14": f"Page {page}",
                                "f18": page,
                            }
                        ],
                    }
                }
            )

        try:
            result = jobs._fetch_cn_quotes(request_get=request_get)
        except TypeError as error:
            self.fail(f"Invalid discovery metadata was not retried: {error}")

        self.assertEqual(requested_pages, [1, 2, 3, 1])
        self.assertEqual(
            result["代码"].tolist(),
            ["PAGE2", "PAGE3", "PAGE1"],
        )

    @patch("akshare_sync.jobs.time.sleep", return_value=None)
    def test_cn_quote_fetch_retries_page_with_missing_data_payload(self, _sleep) -> None:
        requested_pages = []
        page_two_attempts = 0

        def request_get(_url, *, params, timeout):
            nonlocal page_two_attempts
            page = int(params["pn"])
            requested_pages.append(page)
            if page == 2:
                page_two_attempts += 1
                if page_two_attempts == 1:
                    return FakeResponse({"data": None})

            return FakeResponse(
                {
                    "data": {
                        "total": 201,
                        "diff": [
                            {
                                "f2": page,
                                "f3": page,
                                "f12": f"PAGE{page}",
                                "f14": f"Page {page}",
                                "f18": page,
                            }
                        ],
                    }
                }
            )

        result = jobs._fetch_cn_quotes(request_get=request_get)

        self.assertEqual(requested_pages, [1, 2, 3, 2])
        self.assertEqual(
            result["代码"].tolist(),
            ["PAGE1", "PAGE3", "PAGE2"],
        )

    def test_cn_and_hk_sync_upsert_each_successful_fetch_round(self) -> None:
        cases = [
            ("CN", "_fetch_cn_quotes", "stock_zh_a_spot_em"),
            ("HK", "_fetch_hk_quotes", "stock_hk_spot_em"),
        ]

        for market, fetch_name, legacy_fetch_name in cases:
            with self.subTest(market=market):
                written_batches = []

                class FakeClient:
                    def upsert(self, table, rows, conflict_columns):
                        self.assert_upsert_args(table, conflict_columns)
                        written_batches.append([row["symbol"] for row in rows])
                        return len(rows)

                    def assert_upsert_args(self, table, conflict_columns):
                        self_outer.assertEqual(table, "market_quotes")
                        self_outer.assertEqual(conflict_columns, "market,symbol")

                self_outer = self

                def fetch_quotes(*, on_round):
                    on_round(
                        pd.DataFrame(
                            [
                                {
                                    "代码": "FIRST",
                                    "名称": "First",
                                    "最新价": 1,
                                    "昨收": 1,
                                    "涨跌幅": 0,
                                }
                            ]
                        )
                    )
                    on_round(
                        pd.DataFrame(
                            [
                                {
                                    "代码": "RETRY",
                                    "名称": "Retry",
                                    "最新价": 2,
                                    "昨收": 1,
                                    "涨跌幅": 100,
                                }
                            ]
                        )
                    )
                    return pd.DataFrame()

                with (
                    patch.object(jobs, fetch_name, side_effect=fetch_quotes) as fetch,
                    patch.object(
                        jobs.ak,
                        legacy_fetch_name,
                        return_value=pd.DataFrame(),
                    ),
                ):
                    item_count = jobs.sync_market_quotes(FakeClient(), market)

                fetch.assert_called_once()
                self.assertEqual(written_batches, [["FIRST"], ["RETRY"]])
                self.assertEqual(item_count, 2)

    @patch("akshare_sync.jobs.time.sleep", return_value=None)
    def test_cn_and_hk_quote_fetch_retry_failed_pages_in_rounds(self, _sleep) -> None:
        self.assertTrue(hasattr(jobs, "_fetch_cn_quotes"))
        self.assertTrue(hasattr(jobs, "_fetch_hk_quotes"))
        cases = [
            (jobs._fetch_cn_quotes, "82.push2.eastmoney.com", "m:0 t:6"),
            (jobs._fetch_hk_quotes, "72.push2.eastmoney.com", "m:128 t:3"),
        ]

        for fetch_quotes, expected_host, expected_market_filter in cases:
            with self.subTest(fetch_quotes=fetch_quotes.__name__):
                requested_pages = []
                page_two_attempts = 0
                written_batches = []

                def request_get(url, *, params, timeout):
                    nonlocal page_two_attempts
                    page = int(params["pn"])
                    requested_pages.append(page)
                    self.assertIn(expected_host, url)
                    self.assertIn(expected_market_filter, params["fs"])
                    self.assertEqual(timeout, (2.0, 3.0))

                    if page == 2:
                        page_two_attempts += 1
                        if page_two_attempts < 3:
                            raise requests.ConnectionError("remote disconnected")

                    return FakeResponse(
                        {
                            "data": {
                                "total": 201,
                                "diff": [
                                    {
                                        "f2": page,
                                        "f3": page,
                                        "f12": f"PAGE{page}",
                                        "f14": f"Page {page}",
                                        "f18": page,
                                    }
                                ],
                            }
                        }
                    )

                result = fetch_quotes(
                    request_get=request_get,
                    on_round=lambda frame: written_batches.append(
                        frame["代码"].tolist()
                    ),
                )

                self.assertEqual(requested_pages, [1, 2, 3, 2, 2])
                self.assertEqual(
                    written_batches,
                    [["PAGE1", "PAGE3"], [], ["PAGE2"]],
                )
                self.assertEqual(
                    result["代码"].tolist(),
                    ["PAGE1", "PAGE3", "PAGE2"],
                )

    @patch("akshare_sync.jobs.time.sleep", return_value=None)
    def test_us_quote_fetch_continues_when_first_page_fails(self, _sleep) -> None:
        requested_pages = []

        def request_get(_url, *, params, timeout):
            page = int(params["pn"])
            requested_pages.append(page)
            if page == 1 and requested_pages.count(1) == 1:
                raise requests.ConnectionError("remote disconnected")
            return FakeResponse(
                {
                    "data": {
                        "total": 201,
                        "diff": [{"f2": page, "f3": page, "f12": f"PAGE{page}", "f13": 105, "f14": f"Page {page}", "f18": page}],
                    }
                }
            )

        result = _fetch_us_quotes(request_get=request_get)

        self.assertEqual(requested_pages, [1, 2, 3, 1])
        self.assertEqual(
            result["代码"].tolist(),
            ["105.PAGE2", "105.PAGE3", "105.PAGE1"],
        )

    @patch.dict("os.environ", {"US_QUOTE_PAGES": "5,6,10"})
    @patch("akshare_sync.jobs.time.sleep", return_value=None)
    def test_us_quote_fetch_can_request_specific_pages(self, _sleep) -> None:
        requested_pages = []

        def request_get(_url, *, params, timeout):
            page = int(params["pn"])
            requested_pages.append(page)
            return FakeResponse(
                {
                    "data": {
                        "total": 13641,
                        "diff": [
                            {
                                "f2": page,
                                "f3": page,
                                "f12": f"PAGE{page}",
                                "f13": 105,
                                "f14": f"Page {page}",
                                "f18": page,
                            }
                        ],
                    }
                }
            )

        result = _fetch_us_quotes(request_get=request_get)

        self.assertEqual(requested_pages, [5, 6, 10])
        self.assertEqual(
            result["代码"].tolist(),
            ["105.PAGE5", "105.PAGE6", "105.PAGE10"],
        )

    @patch("akshare_sync.jobs.US_QUOTE_MAX_PAGES", 2)
    @patch("akshare_sync.jobs.time.sleep", return_value=None)
    def test_us_quote_fetch_can_limit_pages_for_debugging(self, _sleep) -> None:
        requested_pages = []

        def request_get(_url, *, params, timeout):
            page = int(params["pn"])
            requested_pages.append(page)
            return FakeResponse(
                {
                    "data": {
                        "total": 500,
                        "diff": [
                            {
                                "f2": page,
                                "f3": page,
                                "f12": f"PAGE{page}",
                                "f13": 105,
                                "f14": f"Page {page}",
                                "f18": page,
                            }
                        ],
                    }
                }
            )

        _fetch_us_quotes(request_get=request_get)

        self.assertEqual(requested_pages, [1, 2])

    @patch("akshare_sync.jobs.time.sleep", return_value=None)
    def test_us_quote_fetch_retries_failed_pages_after_initial_pass(self, _sleep) -> None:
        requested_pages = []
        page_two_attempts = 0

        def request_get(_url, *, params, timeout):
            nonlocal page_two_attempts
            page = int(params["pn"])
            requested_pages.append(page)
            self.assertEqual(timeout, (2.0, 3.0))

            if page == 2:
                page_two_attempts += 1
                if page_two_attempts == 1:
                    raise requests.ConnectionError("remote disconnected")

            rows = [{"f2": page, "f3": page, "f12": f"PAGE{page}", "f13": 105, "f14": f"Page {page}", "f18": page}]
            return FakeResponse({"data": {"total": 201, "diff": rows}})

        result = _fetch_us_quotes(request_get=request_get)

        self.assertEqual(requested_pages, [1, 2, 3, 2])
        self.assertEqual(
            result["代码"].tolist(),
            ["105.PAGE1", "105.PAGE3", "105.PAGE2"],
        )

    @patch("akshare_sync.jobs.time.sleep", return_value=None)
    def test_us_quote_fetch_retries_in_rounds_until_every_page_succeeds(self, _sleep) -> None:
        requested_pages = []
        page_two_attempts = 0
        written_batches = []
        events = []

        def request_get(_url, *, params, timeout):
            nonlocal page_two_attempts
            page = int(params["pn"])
            requested_pages.append(page)
            events.append(f"request:{page}")
            if page == 2:
                page_two_attempts += 1
                if page_two_attempts < 3:
                    raise requests.ConnectionError("remote disconnected")

            return FakeResponse(
                {
                    "data": {
                        "total": 201,
                        "diff": [
                            {
                                "f2": page,
                                "f3": page,
                                "f12": f"PAGE{page}",
                                "f13": 105,
                                "f14": f"Page {page}",
                                "f18": page,
                            }
                        ],
                    }
                }
            )

        output = StringIO()
        with redirect_stdout(output):
            result = _fetch_us_quotes(
                request_get=request_get,
                on_round=lambda frame: (
                    written_batches.append(frame["代码"].tolist()),
                    events.append(f"write:{','.join(frame['代码'].tolist()) or 'empty'}"),
                ),
            )

        self.assertEqual(requested_pages, [1, 2, 3, 2, 2])
        self.assertEqual(
            written_batches,
            [["105.PAGE1", "105.PAGE3"], [], ["105.PAGE2"]],
        )
        self.assertEqual(
            events,
            [
                "request:1",
                "request:2",
                "request:3",
                "write:105.PAGE1,105.PAGE3",
                "request:2",
                "write:empty",
                "request:2",
                "write:105.PAGE2",
            ],
        )
        self.assertEqual(
            result["代码"].tolist(),
            ["105.PAGE1", "105.PAGE3", "105.PAGE2"],
        )
        self.assertIn("round=1 requested_pages=3 successful_pages=2 failed_pages=1", output.getvalue())
        self.assertIn("round=2 requested_pages=1 successful_pages=0 failed_pages=1", output.getvalue())
        self.assertIn("round=3 requested_pages=1 successful_pages=1 failed_pages=0", output.getvalue())


if __name__ == "__main__":
    unittest.main()
