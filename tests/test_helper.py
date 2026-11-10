#!/usr/bin/env python3
"""Tests for sophia_helper.py.  Run with:  python3 -m unittest discover tests

These tests never touch Windows: they check the safety rules, the web server
and the preview mode. Real laptop actions can only be tested on a Windows PC.
"""

import json
import os
import sys
import threading
import unittest
import urllib.error
import urllib.request
from unittest import mock

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, ROOT)

import sophia_helper as helper  # noqa: E402


class TestActionGuards(unittest.TestCase):
    def test_open_uri_allows_windows_links(self):
        self.assertTrue(helper.action_open_uri({"uri": "ms-settings:display"})["ok"] or helper.IS_WINDOWS is False)

    def test_open_uri_rejects_dangerous_links(self):
        for bad in ["file:///C:/Windows/System32/calc.exe", "javascript:alert(1)",
                    "shell:startup", "https://example.com", "", "ms-settings:\r\ncalc"]:
            self.assertFalse(helper.action_open_uri({"uri": bad})["ok"], bad)

    def test_open_url_only_http(self):
        self.assertFalse(helper.action_open_url({"url": "file:///etc/passwd"})["ok"])
        self.assertFalse(helper.action_open_url({"url": "javascript:alert(1)"})["ok"])
        self.assertFalse(helper.action_open_url({"url": "https://exa mple.com"})["ok"])
        with mock.patch.object(helper.webbrowser, "open", return_value=True) as opened:
            self.assertTrue(helper.action_open_url({"url": "https://www.youtube.com"})["ok"])
            opened.assert_called_once_with("https://www.youtube.com")

    def test_open_folder_is_a_whitelist(self):
        with mock.patch.object(helper, "_start", return_value=helper.ok()):
            self.assertTrue(helper.action_open_folder({"name": "downloads"})["ok"])
            self.assertFalse(helper.action_open_folder({"name": "C:\\Windows"})["ok"])
            self.assertFalse(helper.action_open_folder({"name": "../../.."})["ok"])

    def test_protected_apps_cannot_be_closed(self):
        for name in ["explorer", "cmd", "powershell", "python"]:
            self.assertEqual(helper.action_close_app({"name": name})["error"], "not_allowed", name)
        # the browser showing Sophia must survive, other browsers may close
        for browser in ["chrome", "edge", "firefox"]:
            self.assertIn(browser + ".exe" if browser != "edge" else "msedge.exe",
                          helper.protected_this_time(browser))
        self.assertEqual(helper.action_close_app({"name": "steam", "procs": ["msedge.exe"]})["error"], "not_allowed")

    def test_unknown_volume_direction_is_refused(self):
        self.assertFalse(helper.action_volume({"dir": "max"})["ok"])
        self.assertFalse(helper.action_brightness({"dir": "sideways"})["ok"])

    def test_media_only_known_keys(self):
        self.assertFalse(helper.action_media({"key": "eject"})["ok"])

    def test_system_info_returns_a_dictionary(self):
        res = helper.action_system_info({})
        self.assertTrue(res["ok"])
        self.assertIn("os", res["info"])

    def test_every_action_is_callable_with_empty_params(self):
        # a bad page must never crash the helper
        for name, fn in helper.ACTIONS.items():
            with mock.patch.object(helper, "IS_WINDOWS", False):
                res = fn({})
            self.assertIsInstance(res, dict, name)
            self.assertIn("ok", res, name)


class ServerFixture:
    """Starts a real helper server in preview mode on a free port."""

    def __init__(self, token_required=False):
        self.folder = ROOT
        self.server = helper.bind_server("127.0.0.1", 0, self.folder, preview=True, token_required=token_required)
        self.port = self.server.server_address[1]
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()

    @property
    def base(self):
        return "http://127.0.0.1:{}".format(self.port)

    def get(self, path):
        try:
            with urllib.request.urlopen(self.base + path, timeout=5) as res:
                return res.status, res.headers, res.read()
        except urllib.error.HTTPError as err:
            return err.code, err.headers, err.read()

    def post(self, path, data, headers=None, raw=None):
        body = raw if raw is not None else json.dumps(data).encode()
        req = urllib.request.Request(self.base + path, data=body, method="POST",
                                     headers=dict({"Content-Type": "application/json"}, **(headers or {})))
        try:
            with urllib.request.urlopen(req, timeout=5) as res:
                return res.status, res.headers, res.read()
        except urllib.error.HTTPError as err:
            return err.code, err.headers, err.read()  # noqa: B901

    def close(self):
        self.server.shutdown()
        self.server.server_close()


class TestServer(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.s = ServerFixture()

    @classmethod
    def tearDownClass(cls):
        cls.s.close()

    def test_status_is_json(self):
        code, headers, body = self.s.get("/api/status")
        self.assertEqual(code, 200)
        self.assertIn("application/json", headers.get("Content-Type"))
        data = json.loads(body)
        self.assertTrue(data["ok"])
        self.assertTrue(data["preview"])
        self.assertEqual(data["page"], "assistant.html")

    def test_root_redirects_to_the_page(self):
        class NoRedirect(urllib.request.HTTPRedirectHandler):
            def redirect_request(self, *args, **kwargs):
                return None
        opener = urllib.request.build_opener(NoRedirect)
        try:
            opener.open(self.s.base + "/", timeout=5)
            self.fail("the root should have redirected")
        except urllib.error.HTTPError as err:
            self.assertEqual(err.code, 302)
            self.assertEqual(err.headers.get("Location"), "/assistant.html")

    def test_the_page_is_served_with_microphone_allowed(self):
        code, headers, body = self.s.get("/assistant.html")
        self.assertEqual(code, 200)
        self.assertIn("text/html", headers.get("Content-Type"))
        self.assertIn(b"Sophia", body)
        self.assertIn("microphone=(self)", headers.get("Permissions-Policy", ""))
        # the page must not phone home for its look
        self.assertNotIn(b"fonts.googleapis.com", body)
        self.assertNotIn(b"unpkg.com", body)

    def test_missing_delivery_app_gets_a_friendly_page(self):
        code, _headers, body = self.s.get("/index.html")
        self.assertEqual(code, 404)
        self.assertIn(b"index.html", body)
        self.assertIn(b"assistant.html", body)

    def test_path_traversal_is_blocked(self):
        for path in ["/../sophia_helper.py", "/..%2fsophia_helper.py", "/%2e%2e/%2e%2e/etc/passwd"]:
            code, _headers, body = self.s.get(path)
            self.assertIn(code, (403, 404), path)
            self.assertNotIn(b"def main", body, path)
            self.assertNotIn(b"root:x:", body, path)

    def test_directory_listing_is_off(self):
        code, _headers, body = self.s.get("/tests")
        self.assertEqual(code, 403)
        self.assertNotIn(b"brain.test.js", body)

    def test_preview_never_touches_the_laptop(self):
        with mock.patch.object(helper, "action_shutdown") as shutdown:
            code, _headers, body = self.s.post("/api/action", {"action": "shutdown", "params": {}})
            self.assertEqual(code, 200)
            data = json.loads(body)
            self.assertTrue(data["ok"])
            self.assertTrue(data["preview"])
            shutdown.assert_not_called()

    def test_unknown_action_is_refused(self):
        code, _headers, body = self.s.post("/api/action", {"action": "format_disk", "params": {}})
        self.assertEqual(code, 400)
        self.assertEqual(json.loads(body)["error"], "unknown_action")

    def test_bad_json_and_big_bodies_are_refused(self):
        code, _headers, _body = self.s.post("/api/action", None, raw=b"{not json")
        self.assertEqual(code, 400)
        code, _headers, _body = self.s.post("/api/action", None, raw=b"{\"a\":\"" + b"x" * (helper.MAX_BODY + 10) + b"\"}")
        self.assertEqual(code, 413)

    def test_other_websites_cannot_drive_the_helper(self):
        code, _headers, _body = self.s.post("/api/action", {"action": "lock", "params": {}},
                                            headers={"Origin": "https://evil.example"})
        self.assertEqual(code, 403)
        code, _headers, _body = self.s.post("/api/action", {"action": "lock", "params": {}},
                                            headers={"Sec-Fetch-Site": "cross-site"})
        self.assertEqual(code, 403)
        code, _headers, _body = self.s.post("/api/action", {"action": "lock", "params": {}},
                                            headers={"Origin": "http://127.0.0.1:{}".format(self.s.port)})
        self.assertEqual(code, 200)


class TestToken(unittest.TestCase):
    def test_requests_without_the_token_are_refused(self):
        s = ServerFixture(token_required=True)
        try:
            code, _headers, body = s.post("/api/action", {"action": "lock", "params": {}})
            self.assertEqual(code, 403)
            self.assertEqual(json.loads(body)["error"], "bad_token")
            token = json.loads(s.get("/api/status")[2])["token"]
            self.assertTrue(token)
            code, _headers, _body = s.post("/api/action", {"action": "lock", "params": {}},
                                           headers={"X-Sophia-Token": token})
            self.assertEqual(code, 200)
        finally:
            s.close()


class TestBinding(unittest.TestCase):
    def test_default_host_is_local_only(self):
        import inspect
        source = inspect.getsource(helper.main)
        self.assertIn('default="127.0.0.1"', source)

    def test_start_script_points_at_the_helper(self):
        bat = os.path.join(ROOT, "Start_Sophia.bat")
        with open(bat, "rb") as fh:
            raw = fh.read()
        self.assertIn(b"sophia_helper.py", raw)
        self.assertIn(b"\r\n", raw, "Windows batch files need CRLF line endings")
        self.assertIn(b"assistant.html", raw, "without Python the page should still open")


if __name__ == "__main__":
    unittest.main(verbosity=2)
