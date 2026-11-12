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

    def __init__(self, token_required=False, preview=True):
        self.folder = ROOT
        self.server = helper.bind_server("127.0.0.1", 0, self.folder, preview=preview, token_required=token_required)
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
        # a real (not preview) server, asked to do something harmless
        real = ServerFixture(preview=False)
        try:
            code, _headers, _body = real.post("/api/action", {"action": "system_info", "params": {}},
                                              headers={"Origin": "https://evil.example"})
            self.assertEqual(code, 403)
            code, _headers, _body = real.post("/api/action", {"action": "system_info", "params": {}},
                                              headers={"Sec-Fetch-Site": "cross-site"})
            self.assertEqual(code, 403)
            code, _headers, _body = real.post("/api/action", {"action": "system_info", "params": {}},
                                              headers={"Origin": "http://127.0.0.1:{}".format(real.port)})
            self.assertEqual(code, 200)
        finally:
            real.close()

    def test_other_host_names_cannot_drive_the_helper(self):
        real = ServerFixture(preview=False)
        try:
            req = urllib.request.Request(real.base + "/api/action",
                                         data=json.dumps({"action": "system_info", "params": {}}).encode(),
                                         method="POST",
                                         headers={"Content-Type": "application/json", "Host": "evil.example"})
            try:
                with urllib.request.urlopen(req, timeout=5) as res:
                    code = res.status
            except urllib.error.HTTPError as err:
                code = err.code
            self.assertEqual(code, 403)
        finally:
            real.close()


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
                                           headers={"X-Nova-Token": token})
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

class AppListTests(unittest.TestCase):
    """The new app-discovery actions, tested without needing Windows."""

    def test_short_names_for_the_apps_list(self):
        self.assertEqual(helper._quick_name("Microsoft Word 2016"), "microsoft word")
        self.assertEqual(helper._quick_name("Microsoft Edge (x86)"), "microsoft edge")
        self.assertEqual(helper._quick_name("VLC media player"), "vlc media player")
        self.assertEqual(helper._quick_name("WinRAR 6.24 (64-bit)"), "winrar")

    def test_app_actions_are_registered(self):
        self.assertIn("list_apps", helper.ACTIONS)
        self.assertIn("open_path", helper.ACTIONS)
        self.assertNotIn("list_apps", helper.DANGEROUS)
        self.assertNotIn("open_path", helper.DANGEROUS)

    def test_open_path_refuses_newlines(self):
        res = helper.action_open_path({"path": "a\nb"})
        self.assertFalse(res["ok"])
        self.assertEqual(res["error"], "bad_path")

    def test_open_path_refuses_empty(self):
        res = helper.action_open_path({"path": "   "})
        self.assertFalse(res["ok"])

    def test_list_apps_is_windows_only(self):
        if helper.IS_WINDOWS:
            self.skipTest("this check is for the Linux sandbox")
        res = helper.action_list_apps({})
        self.assertFalse(res["ok"])
        self.assertEqual(res["error"], "unsupported_os")


class OpenButtonTests(unittest.TestCase):
    """The page must never hand out a link that does nothing."""

    def test_every_open_gets_a_link_or_a_reason(self):
        html = open(os.path.join(ROOT, "assistant.html"), encoding="utf-8").read()
        # the fallback link helper still exists and is used by the open path
        self.assertIn("out.link('Open ' + label", html)
        self.assertIn("function browserLine", html)
        self.assertIn("function follow", html)
        # links know when they may take over the tab
        self.assertIn("target: '_blank'", html)

    def test_app_card_can_call_the_brain(self):
        html = open(os.path.join(ROOT, "assistant.html"), encoding="utf-8").read()
        self.assertIn("brainApi.openTarget(appTargetFor(app))", html)
        self.assertIn("shell:AppsFolder", html)

class InstallerTests(unittest.TestCase):
    """The one-step installer must be safe to double-click."""

    def setUp(self):
        self.ps1 = open(os.path.join(ROOT, "Install_Sophia.ps1"), encoding="utf-8-sig").read()
        self.bat = open(os.path.join(ROOT, "INSTALL_SOPHIA.bat"), encoding="utf-8").read()

    def test_installer_only_copies_lists_and_links(self):
        # it may copy, make a folder, and make a shortcut - never delete or download
        self.assertNotIn("Remove-Item", self.ps1)
        self.assertNotIn("Invoke-WebRequest", self.ps1)
        self.assertNotIn("Invoke-Expression", self.ps1)
        self.assertNotIn("del ", self.bat.lower())
        self.assertNotIn("rd ", self.bat.lower())

    def test_installer_copies_exactly_the_four_files(self):
        for name in ("assistant.html", "sophia_helper.py", "Start_Sophia.bat", "vega.ico"):
            self.assertIn(name, self.ps1)

    def test_the_icon_is_real_and_the_shortcut_uses_it(self):
        import struct
        ico = os.path.join(ROOT, "vega.ico")
        self.assertTrue(os.path.exists(ico), "the icon file must ship with her")
        raw = open(ico, "rb").read()
        # a real .ico starts with 0,0,1,0 and holds several sizes
        self.assertEqual(raw[:4], b"\x00\x00\x01\x00")
        count = struct.unpack("<H", raw[4:6])[0]
        self.assertGreaterEqual(count, 4, "six sizes keep it sharp everywhere")
        self.assertIn("vega.ico", self.ps1)
        self.assertIn("IconLocation", self.ps1)
        # the page carries the same mark in its tab
        html = open(os.path.join(ROOT, "assistant.html"), encoding="utf-8").read()
        self.assertIn('rel="icon"', html)
        self.assertIn('rel="apple-touch-icon"', html)
        self.assertIn('rel="manifest"', html)

    def test_installer_backs_up_the_old_page(self):
        self.assertIn("assistant-old-", self.ps1)
        self.assertIn("Copy-Item $old $backup", self.ps1)

    def test_installer_makes_a_desktop_shortcut(self):
        self.assertIn("WScript.Shell", self.ps1)
        # the assistant is called Nova now; the shortcut carries the new name
        self.assertIn("'Vega.lnk'", self.ps1)
        self.assertNotIn("'Nova.lnk'", self.ps1)

    def test_bat_calls_the_script_and_pauses(self):
        self.assertIn("Install_Sophia.ps1", self.bat)
        self.assertIn("-ExecutionPolicy Bypass", self.bat)
        self.assertIn("pause", self.bat.lower())

    def test_new_helper_actions_are_not_dangerous(self):
        for action in ("list_apps", "open_path", "open_self"):
            self.assertIn(action, helper.ACTIONS)
            self.assertNotIn(action, helper.DANGEROUS)

    def test_helper_version_is_current(self):
        self.assertEqual(helper.VERSION, "1.3.0")


class FindFileTest(unittest.TestCase):
    """The name search: what it finds, what it refuses, and what it never returns."""

    def setUp(self):
        import tempfile, shutil
        self.tmp = tempfile.mkdtemp(prefix="vega-find-")
        self.addCleanup(shutil.rmtree, self.tmp, True)
        os.makedirs(os.path.join(self.tmp, "Documents", "College"))
        os.makedirs(os.path.join(self.tmp, "Downloads"))
        os.makedirs(os.path.join(self.tmp, "Pictures"))
        os.makedirs(os.path.join(self.tmp, "Windows", "System32"))
        self._old = helper.HOME_OVERRIDE
        helper.HOME_OVERRIDE = self.tmp

    def tearDown(self):
        helper.HOME_OVERRIDE = self._old

    def touch(self, rel, size=100):
        path = os.path.join(self.tmp, rel)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "wb") as fh:
            fh.write(b"x" * size)
        return path

    def test_finds_by_part_of_the_name_and_says_where(self):
        self.touch("Documents/College/physics project.docx", 1200)
        self.touch("Downloads/physics-notes.pdf", 5000)
        r = helper.action_find_file({"name": "physics"})
        self.assertTrue(r["ok"])
        self.assertEqual(r["count"], 2)
        names = {f["name"] for f in r["files"]}
        self.assertEqual(names, {"physics project.docx", "physics-notes.pdf"})
        for f in r["files"]:
            self.assertIn(f["folder"], ("Documents", "Downloads"))
            self.assertTrue(os.path.isabs(f["path"]))

    def test_exact_match_comes_first(self):
        self.touch("Documents/resume.docx")
        self.touch("Documents/old resume backup.docx")
        r = helper.action_find_file({"name": "resume.docx"})
        self.assertEqual(r["files"][0]["name"], "resume.docx")

    def test_never_returns_programs_or_windows_internals(self):
        self.touch("Windows/System32/kernel-physics.dll")
        self.touch("Windows/System32/helper-physics.exe")
        self.touch("Documents/physics-notes.pdf")
        r = helper.action_find_file({"name": "physics"})
        names = [f["name"] for f in r["files"]]
        self.assertEqual(names, ["physics-notes.pdf"])

    def test_never_returns_a_password_store(self):
        self.touch("Documents/passwords-physics.txt")
        self.touch("Documents/Login Data")
        r = helper.action_find_file({"name": "physics"})
        self.assertEqual(r["count"], 0)
        r2 = helper.action_find_file({"name": "login data"})
        self.assertEqual(r2["count"], 0)

    def test_an_unknown_name_is_an_honest_empty_list(self):
        self.touch("Documents/notes.pdf")
        r = helper.action_find_file({"name": "zzzz-qqq"})
        self.assertTrue(r["ok"])
        self.assertEqual(r["count"], 0)
        self.assertFalse(r["stopped_early"])

    def test_bad_names_are_refused(self):
        for bad in ("", "   ", "a\nb", "x" * 200):
            with self.subTest(bad=bad):
                r = helper.action_find_file({"name": bad})
                self.assertFalse(r["ok"])
                self.assertEqual(r["error"], "bad_name")

    def test_sizes_are_human_readable(self):
        self.touch("Documents/physics big.pdf", 2 * 1024 * 1024)
        r = helper.action_find_file({"name": "physics big"})
        self.assertRegex(r["files"][0]["size"], r"2\.0 MB")

    def test_find_file_is_registered_and_not_dangerous(self):
        self.assertIn("find_file", helper.ACTIONS)
        self.assertNotIn("find_file", helper.DANGEROUS)


class ThisMachineTest(unittest.TestCase):
    """What Vega says about the computer she is running on."""

    def test_where_am_i_answers_and_lists_what_she_can_do(self):
        r = helper.action_where_am_i({})
        self.assertTrue(r["ok"])
        info = r["info"]
        for key in ("os", "os_name", "folder", "drive", "portable", "disks", "can"):
            self.assertIn(key, info, key)
        self.assertIsInstance(info["disks"], list)
        # the folder she reports must be the one she actually lives in
        self.assertTrue(os.path.isdir(info["folder"]))
        self.assertTrue(info["can"]["web"] and info["can"]["games"])
        self.assertIsInstance(info["portable"], bool)

    def test_drive_letter_is_read_from_the_path(self):
        drive = helper._drive_letter_of(os.path.abspath(__file__))
        self.assertIsInstance(drive, str)
        if os.name == "nt":
            self.assertRegex(drive, r"^[A-Z]:$")

    def test_the_new_actions_are_registered(self):
        for name in ("where_am_i", "open_new_window", "show_folder"):
            self.assertIn(name, helper.ACTIONS, name)

    def test_open_new_window_refuses_anything_but_web_links(self):
        for bad in ("", "file:///C:/Windows/System32", "javascript:alert(1)", "cmd.exe", "http://x\n y"):
            with self.subTest(bad=bad):
                r = helper.action_open_new_window({"url": bad})
                self.assertFalse(r["ok"], bad)
                self.assertIn(r["error"], ("not_allowed", "bad_url"))

    def test_the_start_bat_works_from_any_drive_letter(self):
        raw = open(os.path.join(ROOT, "Start_Sophia.bat"), "rb").read().decode("utf-8")
        self.assertIn('cd /d "%~dp0"', raw, "must run from the folder it sits in, not a fixed path")
        self.assertNotIn("C:\\Vega", raw, "no hard-coded install path")
        self.assertIn("On drive", raw, "she should say which drive she is on")
        self.assertIn("%~dp0sophia_helper.py", raw)


class TestTravelSetup(unittest.TestCase):
    """The one command for 'I carried her to another computer'."""

    def test_it_is_registered_as_a_real_action(self):
        self.assertIn("travel_setup", helper.ACTIONS)
        self.assertNotIn("travel_setup", helper.DANGEROUS, "looking at a machine is not dangerous")

    def test_it_reports_specs_storage_and_the_app_without_inventing_any(self):
        fake_specs = {"os_name": "Linux", "os_detail": "Linux-6.8.0", "machine": "x86_64",
                      "cpu_count": 8, "ram_gb": 15.5, "python": "3.12.3", "host": "college-pc"}
        fake_storage = [{"id": "/", "label": "this computer", "kind": "disk",
                         "total_gb": 238.5, "free_gb": 96.2}]
        with mock.patch.object(helper, "_travel_specs", return_value=fake_specs), \
             mock.patch.object(helper, "_travel_storage", return_value=fake_storage), \
             mock.patch.object(helper, "_travel_app", return_value=None):
            r = helper.action_travel_setup({})
        self.assertTrue(r["ok"])
        self.assertEqual(r["info"]["specs"]["os_name"], "Linux")
        self.assertEqual(r["info"]["storage"][0]["free_gb"], 96.2)
        self.assertFalse(r["info"]["app_found"])
        self.assertFalse(r["info"]["app_opened"])

    def test_open_false_only_looks_and_does_not_launch_anything(self):
        with mock.patch.object(helper, "_travel_specs", return_value={}), \
             mock.patch.object(helper, "_travel_storage", return_value=[]), \
             mock.patch.object(helper, "_travel_app", return_value="/tmp/index.html"), \
             mock.patch.object(helper, "_start") as started:
            r = helper.action_travel_setup({"open": False})
        self.assertTrue(r["info"]["app_found"])
        self.assertFalse(r["info"]["app_opened"])
        started.assert_not_called()

    def test_a_missing_app_is_reported_as_missing(self):
        with mock.patch.object(helper, "_travel_specs", return_value={}), \
             mock.patch.object(helper, "_travel_storage", return_value=[]), \
             mock.patch.object(helper, "_travel_app", return_value=None):
            r = helper.action_travel_setup({})
        self.assertFalse(r["info"]["app_found"])
        self.assertNotIn("app_path", [k for k, v in r["info"].items() if v])

    def test_storage_reading_never_raises_on_this_machine(self):
        got = helper._travel_storage()
        self.assertIsInstance(got, list)
        for d in got:
            self.assertIn("id", d)
            self.assertGreaterEqual(d["free_gb"], 0)
            self.assertGreaterEqual(d["total_gb"], 0)

    def test_app_discovery_finds_the_page_beside_the_helper(self):
        with mock.patch.object(helper.os.path, "isfile", side_effect=lambda p: p.endswith("index.html")):
            self.assertTrue(helper._travel_app().endswith("index.html"))
