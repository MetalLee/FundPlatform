import unittest
from contextlib import redirect_stdout
from io import StringIO
from unittest.mock import patch

import requests

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
