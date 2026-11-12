#!/usr/bin/env python3
"""
Vega's laptop helper. (Her files keep the old name so nothing breaks.)

What it does
------------
1. Serves this folder (with assistant.html) on 127.0.0.1 only.
2. Lets the assistant.html page ask Windows to do real things: open apps,
   close apps, open links and folders, change volume, take screenshots,
   lock the laptop, shut down and so on.

Nothing is downloaded and nothing leaves this computer. It uses only the
Python standard library. Tested with Python 3.8 and newer.

Run it with:  Start_Sophia.bat   (or: py -3 sophia_helper.py)
Safety:       the page can only run the short list of actions below, and the
              server only answers requests from this same computer.
"""

import argparse
import json
import os
import platform
import re
import socket
import subprocess
import sys
import threading
import time
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, unquote

VERSION = "1.3.0"
IS_WINDOWS = os.name == "nt"
MAX_BODY = 16 * 1024          # 16 KB is plenty for one command
DEFAULT_PORTS = list(range(8765, 8775))
PAGE_NAME = "assistant.html"

# Schemes a browser may ask the laptop to open. All of them are Windows
# features or Microsoft Store apps; file:// and shell: are deliberately missing.
ALLOWED_SCHEMES = (
    "ms-settings:", "ms-clock:", "ms-photos:", "ms-screenclip:",
    "ms-windows-store:", "ms-people:", "ms-actioncenter:", "ms-cortana2:",
    "microsoft.windows.camera:", "calculator:", "spotify:", "whatsapp:",
    "zoommtg:", "msteams:",
)

# Programs Vega must never close: Windows itself, and anything that would
# kill this helper or the browser the user is talking through.
PROTECTED_PROCESSES = {
    "explorer.exe", "csrss.exe", "wininit.exe", "winlogon.exe", "services.exe",
    "lsass.exe", "smss.exe", "svchost.exe", "dwm.exe", "taskhostw.exe",
    "sihost.exe", "ctfmon.exe", "fontdrvhost.exe", "runtimebroker.exe",
    "shellexperiencehost.exe", "startmenuexperiencehost.exe", "searchui.exe",
    "searchapp.exe", "textinputhost.exe", "applicationframehost.exe",
    "systemsettings.exe", "lockapp.exe", "python.exe", "pythonw.exe",
    "cmd.exe", "powershell.exe", "pwsh.exe", "windowsterminal.exe",
    "conhost.exe", "sophia_helper.exe",
}
PROTECTED_NAMES = {"explorer", "python", "cmd", "powershell", "terminal", "conhost", "this pc"}

# Friendly names mapped to the exact link or program Windows understands.
BUILTIN_URIS = {
    "calculator": "calculator:",
    "settings": "ms-settings:",
    "camera": "microsoft.windows.camera:",
    "photos": "ms-photos:",
    "clock": "ms-clock:",
    "store": "ms-windows-store:",
    "snipping tool": "ms-screenclip:",
    "snip": "ms-screenclip:",
    "paint": "mspaint.exe",
    "notepad": "notepad.exe",
    "wordpad": "write.exe",
    "file explorer": "explorer.exe",
    "explorer": "explorer.exe",
    "control panel": "control.exe",
    "task manager": "taskmgr.exe",
    "command prompt": "cmd.exe",
    "powershell": "powershell.exe",
    "on-screen keyboard": "osk.exe",
    "magnifier": "magnify.exe",
    "media player": "wmplayer.exe",
}
# Apps that need a shell link instead of an exe name.
SHELL_APPS = {"media player": "wmplayer.exe"}

FOLDERS = {
    "downloads": "shell:Downloads",
    "documents": "shell:Personal",
    "desktop": "shell:Desktop",
    "pictures": "shell:My Pictures",
    "music": "shell:My Music",
    "videos": "shell:My Video",
    "recyclebin": "shell:RecycleBinFolder",
    "thispc": "shell:MyComputerFolder",
    "home": "shell:Profile",
}

VK = {"volume_mute": 0xAD, "volume_down": 0xAE, "volume_up": 0xAF,
      "next_track": 0xB0, "prev_track": 0xB1, "play_pause": 0xB3}


def now():
    return time.strftime("%H:%M:%S")


def log(*parts):
    print("[{}] {}".format(now(), " ".join(str(p) for p in parts)))
    sys.stdout.flush()


class ActionResult(dict):
    pass


def ok(**kw):
    d = {"ok": True}
    d.update(kw)
    return d


def fail(code, message=""):
    d = {"ok": False, "error": code}
    if message:
        d["message"] = message
    return d


# --------------------------------------------------------------------------
# Windows actions
# --------------------------------------------------------------------------
def _run(cmd, timeout=20, shell=False):
    """Run a command without a console window popping up."""
    flags = 0
    if IS_WINDOWS:
        flags = 0x08000000  # CREATE_NO_WINDOW
    try:
        proc = subprocess.run(cmd, shell=shell, timeout=timeout, creationflags=flags,
                              stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        return proc.returncode, proc.stdout.decode("utf-8", "replace"), proc.stderr.decode("utf-8", "replace")
    except FileNotFoundError:
        return 127, "", "not found"
    except subprocess.TimeoutExpired:
        return 124, "", "timed out"


def _start(target, shell=False):
    """Start a program or open a link, without a console window."""
    if not IS_WINDOWS:
        return fail("unsupported_os", "Real laptop actions only work on Windows.")
    try:
        os.startfile(target)  # noqa: S606 - intentional, this is the feature
        return ok(opened=target)
    except OSError:
        pass
    try:
        subprocess.Popen([target], shell=shell, close_fds=True,
                         creationflags=0x08000000)
        return ok(opened=target)
    except (OSError, ValueError):
        return fail("not_found", "Windows could not open " + str(target))


def ps_command(script, timeout=25):
    """Run a short PowerShell script and return its output."""
    if not IS_WINDOWS:
        return fail("unsupported_os")
    for exe in ("powershell", "pwsh"):
        code, out, err = _run([exe, "-NoProfile", "-NonInteractive", "-Command", script], timeout=timeout)
        if code != 127:
            if code == 0:
                return ok(output=out.strip())
            return fail("psi_failed", (err or out).strip()[:400])
    return fail("no_powershell", "PowerShell was not found on this laptop.")


def action_open_app(params):
    name = str(params.get("name", "")).strip()
    if not name:
        return fail("missing_name")
    key = name.lower().strip()
    if key in BUILTIN_URIS:
        target = BUILTIN_URIS[key]
        if key in SHELL_APPS:
            return _start(SHELL_APPS[key])
        return _start(target)
    if not IS_WINDOWS:
        return fail("unsupported_os")

    # Apps installed for this user: Start Menu shortcuts.
    exe = find_start_menu_app(key)
    if exe:
        return _start(exe)
    # Apps registered with Windows (Get-StartApps covers Store apps too).
    found = find_start_app(name)
    if found:
        return _start("explorer.exe shell:AppsFolder\\" + found)
    # Last try: let Windows search for it by name.
    res = _start(name)
    if res.get("ok"):
        return res
    # Try "name.exe" on the PATH as a final fallback.
    code, _out, _err = _run(["where", name + ".exe"])
    if code == 0:
        return _start(name + ".exe")
    return fail("not_found", "I could not find an app called " + name + " on this laptop.")


def find_start_menu_app(key):
    roots = [
        os.path.join(os.environ.get("APPDATA", ""), r"Microsoft\Windows\Start Menu\Programs"),
        r"C:\ProgramData\Microsoft\Windows\Start Menu\Programs",
    ]
    wanted = key.replace(" ", "")
    for root in roots:
        if not root or not os.path.isdir(root):
            continue
        for folder, _dirs, files in os.walk(root):
            for f in files:
                if not f.lower().endswith(".lnk"):
                    continue
                base = os.path.splitext(f)[0].lower().replace(" ", "")
                if base == wanted or (len(wanted) > 4 and wanted in base):
                    return os.path.join(folder, f)
    return None


def find_start_app(name):
    script = ("$apps = Get-StartApps | Where-Object { $_.Name -like '*" +
              name.replace("'", "") + "*' }; $apps | Select-Object -First 1 | ForEach-Object { $_.AppID }")
    res = ps_command(script, timeout=20)
    if not res.get("ok"):
        return None
    out = res.get("output", "").strip().splitlines()
    return out[0].strip() if out and out[0].strip() else None


def protected_this_time(host_browser=None):
    """Vega runs inside a browser, so no browser may ever be closed by her."""
    procs = set(PROTECTED_PROCESSES)
    procs.update({"chrome.exe", "msedge.exe", "firefox.exe", "opera.exe",
                  "brave.exe", "vivaldi.exe", "iexplore.exe"})
    return procs


def action_close_app(params):
    name = str(params.get("name", "")).strip()
    procs = params.get("procs") or []
    protected = protected_this_time(params.get("hostBrowser"))
    if not name and not procs:
        return fail("missing_name")
    if name.lower().strip() in PROTECTED_NAMES:
        return fail("not_allowed")
    images = [p for p in procs if isinstance(p, str) and p.lower().endswith(".exe")]
    if not images:
        images = [name + ".exe"]
    for image in images:
        if image.lower() in protected:
            return fail("not_allowed")
    if not IS_WINDOWS:
        return fail("unsupported_os")
    for image in images:
        code, _out, _err = _run(["taskkill", "/IM", image])
        if code == 0:
            return ok(closed=image)
        # 128 = no such process; try the next name.
    return fail("not_running")


def action_open_uri(params):
    uri = str(params.get("uri", "")).strip()
    if not uri or not uri.lower().startswith(ALLOWED_SCHEMES):
        return fail("not_allowed")
    if any(c in uri for c in "\r\n\t"):
        return fail("bad_uri")
    return _start(uri)


def action_open_url(params):
    url = str(params.get("url", "")).strip()
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        return fail("not_allowed")
    if not parsed.netloc or any(c in url for c in "\r\n\t\"' "):
        return fail("bad_url")
    return webbrowser.open(url) and ok(opened=url) or fail("open_failed")


# ---------------------------------------------------------------- files by name
# How many folders deep, and how many files, a name search will look at before
# it gives up. A slow answer is worse than an honest "too many files".
FILE_SEARCH_DEPTH = 4
FILE_SEARCH_LIMIT = 20000
FILE_SEARCH_MS = 2500
HOME_OVERRIDE = ""  # empty means the real home folder; tests set this
# Names that are never worth showing a person: Windows internals, installers,
# temporary junk, and anything that is really a program.
FILE_SKIP_EXT = {
    ".exe", ".dll", ".sys", ".msi", ".msix", ".cab", ".bat", ".cmd", ".ps1",
    ".vbs", ".jar", ".iso", ".tmp", ".temp", ".lnk", ".url", ".ini", ".dat",
    ".db", ".log", ".etl", ".pf", ".manifest", ".mui",
}
FILE_SKIP_DIRS = {
    "windows", "winsxs", "system32", "syswow64", "node_modules", ".git",
    "appdata", "temp", "$recycle.bin", "recovery", "programdata",
    "packages", "microsoft", "installer", "assembly", "driverstore",
}
# The places a person actually keeps their own things, best first.
FILE_ROOTS = [
    ("Desktop", ("Desktop",)),
    ("Downloads", ("Downloads",)),
    ("Documents", ("Documents",)),
    ("Pictures", ("Pictures",)),
    ("Music", ("Music",)),
    ("Videos", ("Videos",)),
    ("OneDrive", ("OneDrive", "OneDrive - Personal")),
]


def _human_size(n):
    try:
        n = float(n)
    except (TypeError, ValueError):
        return ""
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024 or unit == "GB":
            return ("%d %s" % (n, unit)) if unit == "B" else ("%.1f %s" % (n, unit))
        n /= 1024.0
    return ""


def _home():
    return os.path.expanduser("~")


def _search_roots():
    """Real folders that exist, in the order a person would look."""
    out = []
    home = HOME_OVERRIDE or _home()
    for label, names in FILE_ROOTS:
        for name in names:
            path = os.path.join(home, name)
            if os.path.isdir(path):
                out.append((label, path))
                break
    return out


def _normalise_name(text):
    return re.sub(r"[^a-z0-9]+", " ", str(text or "").lower()).strip()


def _score_file(query, name, folder_label):
    """Higher is better. Exact name wins, then start, then any word, then part."""
    q = _normalise_name(query)
    n = _normalise_name(os.path.splitext(name)[0]) + " " + _normalise_name(
        os.path.splitext(name)[1].lstrip(".")
    )
    n = n.strip()
    if not q:
        return 0
    score = 0
    if n == q:
        score = 100
    elif n.startswith(q):
        score = 80
    elif (" " + q + " ") in (" " + n + " "):
        score = 60
    elif q in n:
        score = 40
    elif all(part in n for part in q.split()):
        score = 20
    if not score:
        return 0
    # the folders people actually use should win ties
    bonus = {"Desktop": 8, "Downloads": 7, "Documents": 6}.get(folder_label, 0)
    return score + bonus


def action_find_file(params):
    """Find a file on this laptop by the name the person used.

    Read-only: it lists and stats files, it never opens, reads, moves or
    deletes anything. It skips program files, Windows internals, hidden
    system folders and anything that looks like a password store, so what
    comes back is always something a person would recognise.
    """
    query = str(params.get("name", "")).strip()
    if not query or len(query) > 120 or any(c in query for c in "\r\n\t"):
        return fail("bad_name")
    roots = _search_roots()
    if not roots and not IS_WINDOWS:
        return fail("unsupported_os", "File search uses your real Windows folders.")
    if not roots:
        # Windows but no usual folders exist: look in the helper's own folder
        roots = [("this folder", os.path.dirname(os.path.abspath(__file__)))]

    started = time.time()
    matches = []
    seen = 0
    stopped_early = False

    for label, root in roots:
        for base, dirs, files in os.walk(root):
            # never descend into system or build folders
            depth = base[len(root):].count(os.sep)
            dirs[:] = [
                d for d in dirs
                if d.lower() not in FILE_SKIP_DIRS
                and not d.startswith(".")
                and not d.startswith("$")
                and depth < FILE_SEARCH_DEPTH
            ]
            for name in files:
                seen += 1
                if seen > FILE_SEARCH_LIMIT:
                    stopped_early = True
                    break
                ext = os.path.splitext(name)[1].lower()
                if ext in FILE_SKIP_EXT or name.startswith("~$"):
                    continue
                low = name.lower()
                if "password" in low or "passwords" in low or low in ("login data", "cookies"):
                    continue
                score = _score_file(query, name, label)
                if not score:
                    continue
                path = os.path.join(base, name)
                try:
                    size = os.path.getsize(path)
                    changed = os.path.getmtime(path)
                except OSError:
                    continue
                matches.append({
                    "name": name,
                    "path": path,
                    "folder": label,
                    "sub": os.path.relpath(base, root).replace(os.sep, "\\") if base != root else "",
                    "ext": ext.lstrip("."),
                    "size": _human_size(size),
                    "changed": int(changed),
                    "score": score,
                })
            if seen > FILE_SEARCH_LIMIT or (time.time() - started) * 1000 > FILE_SEARCH_MS:
                stopped_early = True
                break
        if stopped_early and seen > FILE_SEARCH_LIMIT:
            break

    matches.sort(key=lambda m: (-m["score"], -m["changed"]))
    # drop lower-scoring duplicates that are really the same document
    best = []
    for m in matches:
        if any(b["name"].lower() == m["name"].lower() for b in best):
            continue
        best.append(m)
        if len(best) >= 12:
            break
    for m in best:
        m.pop("score", None)
    return ok(files=best, count=len(best), looked=seen, stopped_early=stopped_early, query=query)


def action_open_folder(params):
    name = str(params.get("name", "")).strip().lower()
    target = FOLDERS.get(name)
    if not target:
        return fail("not_allowed")
    return _start(target)


def press_key(vk_code, times=1):
    """Send a media key without stealing focus."""
    if not IS_WINDOWS:
        return fail("unsupported_os")
    script = (
        "Add-Type -Namespace Win32 -Name Keys -MemberDefinition '"
        "[DllImport(\"user32.dll\")] public static extern void keybd_event(byte vk, byte scan, int flags, int extra);'; "
        "for ($i = 0; $i -lt {times}; $i++) {{ "
        "[Win32.Keys]::keybd_event({vk}, 0, 0, 0); Start-Sleep -Milliseconds 40; "
        "[Win32.Keys]::keybd_event({vk}, 0, 2, 0); Start-Sleep -Milliseconds 60; }}"
    ).format(times=times, vk=vk_code)
    return ps_command(script)


def press_media(key, times):
    if key not in VK:
        return fail("not_allowed")
    return press_key(VK[key], times)


def action_volume(params):
    direction = str(params.get("dir", "")).strip().lower()
    amount = params.get("amount")
    if direction in ("mute", "unmute"):
        return press_media("volume_mute", 1)
    if direction in ("up", "down"):
        steps = 4
        try:
            if amount:
                steps = max(1, min(20, int(round(float(amount) / 2.0))))
        except (TypeError, ValueError):
            steps = 4
        return press_media("volume_up" if direction == "up" else "volume_down", steps)
    if direction == "set":
        try:
            level = max(0, min(100, int(float(amount))))
        except (TypeError, ValueError):
            return fail("bad_amount")
        return set_volume_by_keys(level)
    return fail("bad_direction")


def set_volume_by_keys(level):
    """Move the volume in 2% steps using the media keys, without a UI popup loop."""
    script = (
        "Add-Type -Namespace W -Name K -MemberDefinition '[DllImport(\"user32.dll\")]"
        " public static extern void keybd_event(byte bVk, byte bScan, int dwFlags, int dwExtraInfo);';"
        " $up = 0xAF; $down = 0xAE;"
        " $target = {target};"
        " for ($i = 0; $i -lt 50; $i++) {{ [W.K]::keybd_event($up, 0, 0, 0); [W.K]::keybd_event($up, 0, 2, 0) }};"
        " for ($i = 0; $i -lt $target; $i++) {{ [W.K]::keybd_event($down, 0, 0, 0); [W.K]::keybd_event($down, 0, 2, 0) }};"
        " 'done'"
    ).format(target=int(max(0, min(50, round(level / 2.0)))))
    res = ps_command(script, timeout=30)
    if res.get("ok"):
        return ok(level=int(level))
    return res


def action_brightness(params):
    direction = str(params.get("dir", "")).strip().lower()
    amount = params.get("amount")
    if not IS_WINDOWS:
        return fail("unsupported_os")
    read = ("Get-CimInstance -Namespace root/WMI -ClassName WmiMonitorBrightness | "
            "Select-Object -ExpandProperty CurrentBrightness")
    res = ps_command(read, timeout=20)
    if not res.get("ok"):
        return fail("not_supported", "This screen does not let Windows change its brightness.")
    try:
        current = int(str(res.get("output", "50")).strip().splitlines()[0])
    except (ValueError, IndexError):
        current = 50
    if direction == "set":
        try:
            level = max(0, min(100, int(float(amount))))
        except (TypeError, ValueError):
            return fail("bad_amount")
    elif direction == "up":
        level = min(100, current + (int(amount) if amount else 10))
    elif direction == "down":
        level = max(0, current - (int(amount) if amount else 10))
    else:
        return fail("bad_direction")
    write = ("(Get-CimInstance -Namespace root/WMI -ClassName WmiMonitorBrightnessMethods)."
             "WmiSetBrightness(1, {})").format(level)
    res = ps_command(write, timeout=20)
    if not res.get("ok"):
        return fail("not_supported", "This screen does not let Windows change its brightness.")
    return ok(level=level)


def action_media(params):
    key = str(params.get("key", "")).strip().lower()
    mapping = {"playpause": "play_pause", "next": "next_track", "prev": "prev_track", "stop": "play_pause"}
    if key == "stop":
        return press_media("play_pause", 1)
    if key not in mapping:
        return fail("not_allowed")
    return press_media(mapping[key], 1)


def action_screenshot(params):
    if not IS_WINDOWS:
        return fail("unsupported_os")
    out_dir = os.path.join(os.path.expanduser("~"), "Pictures", "Screenshots")
    try:
        os.makedirs(out_dir, exist_ok=True)
    except OSError:
        out_dir = os.path.expanduser("~")
    path = os.path.join(out_dir, time.strftime("Vega_%Y-%m-%d_%H-%M-%S.png"))
    script = (
        "Add-Type -AssemblyName System.Windows.Forms, System.Drawing;"
        "$b = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds;"
        "$bmp = New-Object System.Drawing.Bitmap $b.Width, $b.Height;"
        "$g = [System.Drawing.Graphics]::FromImage($bmp);"
        "$g.CopyFromScreen($b.Location, [System.Drawing.Point]::Empty, $b.Size);"
        "$bmp.Save('{path}', [System.Drawing.Imaging.ImageFormat]::Png);"
        "if (Test-Path '{path}') {{ 'saved' }}"
    ).format(path=path.replace("'", "''"))
    res = ps_command(script, timeout=30)
    if res.get("ok") and "saved" in res.get("output", ""):
        return ok(path=path)
    return fail("screenshot_failed")


def action_lock(params):
    if not IS_WINDOWS:
        return fail("unsupported_os")
    code, _out, _err = _run(["rundll32.exe", "user32.dll,LockWorkStation"], timeout=10)
    return ok() if code in (0, 1) else fail("lock_failed")


def shutdown_command(restart=False, delay=30):
    return ["shutdown", "/r" if restart else "/s", "/t", str(int(delay))]


def action_shutdown(params):
    res = _run(shutdown_command(False))
    return ok() if res[0] == 0 else fail("shutdown_failed", res[2][:200])


def action_restart(params):
    res = _run(shutdown_command(True))
    return ok() if res[0] == 0 else fail("restart_failed", res[2][:200])


def action_cancel_shutdown(params):
    res = _run(["shutdown", "/a"])
    return ok() if res[0] == 0 else fail("nothing_to_cancel")


def action_sleep(params):
    if not IS_WINDOWS:
        return fail("unsupported_os")
    code, _out, _err = _run(["rundll32.exe", "powrprof.dll,SetSuspendState", "0,1,0"], timeout=10)
    return ok() if code in (0, 1) else fail("sleep_failed")


def action_signout(params):
    if not IS_WINDOWS:
        return fail("unsupported_os")
    code, _out, _err = _run(["shutdown", "/l"], timeout=10)
    return ok() if code == 0 else fail("signout_failed")


# ---------------------------------------------------------------- this machine
def _drive_letter_of(path):
    """The drive a file sits on: C:, D:, or the USB stick's own letter."""
    try:
        drive = os.path.splitdrive(os.path.abspath(path))[0]
    except (ValueError, OSError):
        drive = ""
    return drive.upper() if drive else ""


def _is_removable(path):
    """Is this folder on a USB stick rather than the laptop's own disk?"""
    if not IS_WINDOWS:
        return False
    letter = _drive_letter_of(path).replace(":", "")
    if not letter:
        return False
    script = ("$d = Get-CimInstance Win32_LogicalDisk -Filter \"DeviceID='%s:'\"; "
              "if ($d) { $d.DriveType }") % letter.replace("'", "")
    res = ps_command(script, timeout=12)
    if res.get("ok"):
        try:
            # DriveType 2 is a removable disk, 5 is a CD, 3 is a fixed disk
            return int(str(res["output"]).strip().splitlines()[0]) == 2
        except (ValueError, IndexError):
            return False
    return False


def _disks():
    """Every disk the person can save to, with the space left on each."""
    out = []
    if not IS_WINDOWS:
        return out
    script = ("Get-CimInstance Win32_LogicalDisk | Where-Object { $_.Size -gt 0 } | "
              "ForEach-Object { @{ id=$_.DeviceID; label=$_.VolumeName; type=[int]$_.DriveType; "
              "total_gb=[math]::Round($_.Size/1GB,1); free_gb=[math]::Round($_.FreeSpace/1GB,1) } } | "
              "ConvertTo-Json -Compress")
    res = ps_command(script, timeout=20)
    if not res.get("ok"):
        return out
    try:
        data = json.loads(res["output"])
    except ValueError:
        return out
    if isinstance(data, dict):
        data = [data]
    kinds = {2: "usb", 3: "disk", 4: "network", 5: "cd", 6: "ram"}
    for d in data:
        try:
            out.append({
                "id": str(d.get("id", "")),
                "label": str(d.get("label") or ""),
                "kind": kinds.get(int(d.get("type") or 3), "disk"),
                "total_gb": float(d.get("total_gb") or 0),
                "free_gb": float(d.get("free_gb") or 0),
            })
        except (TypeError, ValueError):
            continue
    out.sort(key=lambda d: (d["kind"] != "disk", d["id"]))
    return out


def _report_caps():
    """What she can honestly promise on this machine, checked, not assumed."""
    py3 = sys.version_info[:2] >= (3, 7)
    return {
        "apps": bool(IS_WINDOWS and py3),
        "settings": bool(IS_WINDOWS and py3),
        "files": bool(IS_WINDOWS and py3),
        "screen": bool(IS_WINDOWS and py3),
        "web": True,
        "games": True,
    }


def action_where_am_i(params):
    """Which computer is this, and is Vega running from a stick or a disk?

    This is the answer to "I put her on a pendrive and opened her on another
    machine": the page and the helper already work anywhere, and this tells
    the person what they are standing on before anything else happens.
    """
    here = os.path.dirname(os.path.abspath(__file__))
    drive = _drive_letter_of(here)
    portable = _is_removable(here)
    data = {
        "os": platform.platform(),
        "os_name": "Windows" if IS_WINDOWS else platform.system(),
        "release": platform.release(),
        "machine": platform.machine(),
        "python": platform.python_version(),
        "host": socket.gethostname(),
        "folder": here,
        "drive": drive,
        "portable": portable,
        "disks": _disks(),
    }
    if IS_WINDOWS:
        script = ("$os = Get-CimInstance Win32_OperatingSystem; $cs = Get-CimInstance Win32_ComputerSystem; "
                  "$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1; "
                  "@{ name = $os.Caption; build = $os.BuildNumber; arch = $os.OSArchitecture; "
                  "ram_gb = [math]::Round($cs.TotalPhysicalMemory/1GB,1); cpu = $cpu.Name; "
                  "cores = $cpu.NumberOfLogicalProcessors } | ConvertTo-Json -Compress")
        res = ps_command(script, timeout=20)
        if res.get("ok"):
            try:
                data.update(json.loads(res["output"]))
            except ValueError:
                pass
    # what she can honestly promise on this machine
    data["can"] = _report_caps()
    return ok(info=data)


def action_system_info(params):
    info = {
        "os": platform.platform(),
        "machine": platform.machine(),
        "python": platform.python_version(),
        "host": socket.gethostname(),
    }
    if IS_WINDOWS:
        script = (
            "$os = (Get-CimInstance Win32_OperatingSystem);"
            "$cpu = (Get-CimInstance Win32_Processor | Select-Object -First 1);"
            "$disk = (Get-CimInstance Win32_LogicalDisk -Filter \"DeviceID='C:'\");"
            "$bat = (Get-CimInstance Win32_Battery | Select-Object -First 1);"
            "$cs = (Get-CimInstance Win32_ComputerSystem);"
            "@{ os = $os.Caption; version = $os.Version; arch = $os.OSArchitecture;"
            " cpu = $cpu.Name; cores = $cpu.NumberOfLogicalProcessors;"
            " ram_total_gb = [math]::Round($cs.TotalPhysicalMemory/1GB,1);"
            " ram_free_gb = [math]::Round($os.FreePhysicalMemory/1MB,1);"
            " disk_total_gb = [math]::Round($disk.Size/1GB,1);"
            " disk_free_gb = [math]::Round($disk.FreeSpace/1GB,1);"
            " battery_percent = $bat.EstimatedChargeRemaining;"
            " charging = [bool]($bat.BatteryStatus -eq 2);"
            " screen = (Get-CimInstance Win32_VideoController | Select-Object -First 1).CurrentHorizontalResolution } | ConvertTo-Json -Compress"
        )
        res = ps_command(script, timeout=30)
        if res.get("ok"):
            try:
                info.update(json.loads(res["output"]))
            except ValueError:
                pass
        width = info.get("screen")
        height = None
        if width:
            script2 = "(Get-CimInstance Win32_VideoController | Select-Object -First 1).CurrentVerticalResolution"
            r2 = ps_command(script2, timeout=15)
            if r2.get("ok"):
                try:
                    height = int(str(r2["output"]).strip().splitlines()[0])
                except (ValueError, IndexError):
                    height = None
        if width and height:
            info["screen"] = "{} x {}".format(width, height)
        else:
            info.pop("screen", None)
    return ok(info=info)


def action_open_new_window(params):
    """Open a website in its own browser window, so Vega is still there behind it.

    "I opened YouTube and lost you" is the real complaint this answers: a plain
    tab can end up in front of her, and a window she can alt-tab back to does not.
    """
    url = str(params.get("url", "")).strip()
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        return fail("not_allowed")
    if not parsed.netloc or any(c in url for c in "\r\n\t\"'"):
        return fail("bad_url")
    if not IS_WINDOWS:
        return webbrowser.open(url) and ok(opened=url) or fail("open_failed")
    # the person's own default browser, in a new window
    for flag in ("--new-window", "-new-window", ""):
        cmd = 'start "" ' + (flag + ' ' if flag else '') + '"' + url.replace('"', '') + '"'
        try:
            subprocess.Popen(cmd, shell=True, close_fds=True, creationflags=0x08000000)
            return ok(opened=url, how="new window")
        except OSError:
            continue
    return webbrowser.open(url) and ok(opened=url) or fail("open_failed")


def action_show_folder(params):
    """Open the folder Vega lives in, so the person can see her files."""
    here = os.path.dirname(os.path.abspath(__file__))
    return _start(here)


def _lnk_target(path):
    """Read where a Start Menu shortcut really points (Windows .lnk)."""
    try:
        raw = open(path, "rb").read()
    except OSError:
        return None
    # a .lnk stores the local path right after a shell-item header; look for drive letters
    best = None
    for match in re.finditer(rb"[A-Za-z]:\\[^\x00]{3,240}", raw):
        text = match.group(0).decode("mbcs", "ignore").strip()
        if text.lower().endswith((".exe", ".msc", ".ico", ".bat", ".cmd")):
            if best is None or len(text) > len(best):
                best = text
    return best


def _fast_start_apps():
    """One PowerShell call instead of a slow start-menu walk."""
    script = (
        "$out = @();"
        "Get-StartApps | ForEach-Object { $out += [pscustomobject]@{ name = $_.Name; id = $_.AppID } };"
        "$out | ConvertTo-Json -Compress -Depth 3"
    )
    res = ps_command(script, timeout=45)
    if not res.get("ok"):
        return []
    try:
        data = json.loads(res.get("output", "[]") or "[]")
    except ValueError:
        return []
    if isinstance(data, dict):
        data = [data]
    items = []
    for row in data:
        name = str(row.get("name") or "").strip()
        app_id = str(row.get("id") or "").strip()
        if not name:
            continue
        exe = app_id.split("!")[0] if "!" in app_id else ""
        items.append({
            "name": name,
            "id": app_id,
            "exe": exe,
            "store": "!" in app_id,
            "quick": _quick_name(name),
        })
    return items


def _quick_name(name):
    """A short handle so 'open words' finds Microsoft Word."""
    base = re.sub(r"\s*[\(\-].*$", "", name).strip()   # drop "(x86)" and version tails
    base = re.sub(r"\s+(\d{4}|\d+(\.\d+)+)$", "", base).strip()
    return base.lower()


def _start_menu_apps():
    """Fallback: every .lnk under the two Start Menu folders."""
    found = []
    roots = [
        os.path.join(os.environ.get("APPDATA", ""), r"Microsoft\Windows\Start Menu\Programs"),
        r"C:\ProgramData\Microsoft\Windows\Start Menu\Programs",
    ]
    for root in roots:
        if not root or not os.path.isdir(root):
            continue
        for folder, _dirs, files in os.walk(root):
            for f in files:
                if not f.lower().endswith(".lnk"):
                    continue
                full = os.path.join(folder, f)
                label = os.path.splitext(f)[0].strip()
                if not label or label.lower().startswith(("uninstall", "readme", "help")):
                    continue
                found.append({
                    "name": label,
                    "id": "",
                    "exe": _lnk_target(full) or "",
                    "lnk": full,
                    "store": False,
                    "quick": _quick_name(label),
                })
    return found


def action_list_apps(params):
    """Every app Windows knows about, so 'open <anything>' can find it."""
    if not IS_WINDOWS:
        return fail("unsupported_os")
    apps = _fast_start_apps()
    if not apps:
        apps = _start_menu_apps()
    # de-duplicate on the short handle, keeping the friendliest name
    best = {}
    for app in apps:
        key = app["quick"] or app["name"].lower()
        if not key:
            continue
        have = best.get(key)
        if have is None or (len(app["name"]) < len(have["name"]) and not app["store"]):
            best[key] = app
    out = sorted(best.values(), key=lambda a: a["name"].lower())
    cache_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".sophia-apps.json")
    try:
        with open(cache_path, "w", encoding="utf-8") as fh:
            json.dump({"at": int(time.time()), "apps": out}, fh)
    except OSError:
        pass
    return ok(apps=out, count=len(out))


def action_open_self(params):
    """Bring Vega's own page to the front (opens the default browser on her)."""
    if not IS_WINDOWS:
        return fail("unsupported_os")
    page = os.path.join(os.path.dirname(os.path.abspath(__file__)), PAGE_NAME)
    if not os.path.isfile(page):
        return fail("not_found", "assistant.html is not next to the helper.")
    try:
        os.startfile(page)  # the normal Windows way to hand a file to its program
        return ok(opened=page)
    except OSError as exc:
        return fail("open_failed", str(exc)[:120])


def _travel_specs():
    """The specs of whichever machine the stick is plugged into right now.

    Works on Windows, macOS and Linux, and says which of the three it found
    instead of pretending they are the same. Only reads; changes nothing.
    """
    probe = {
        "os_name": platform.system() or "unknown",
        "os_detail": platform.platform(),
        "release": platform.release(),
        "version": platform.version()[:120],
        "machine": platform.machine(),
        "processor": platform.processor() or "",
        "python": platform.python_version(),
        "host": socket.gethostname(),
    }
    try:
        probe["cpu_count"] = os.cpu_count() or 0
    except (OSError, ValueError):
        probe["cpu_count"] = 0
    # memory
    try:
        if IS_WINDOWS:
            script = "$cs = Get-CimInstance Win32_ComputerSystem; "\
                     "[math]::Round($cs.TotalPhysicalMemory/1GB,1)"
            res = ps_command(script, timeout=15)
            if res.get("ok") and str(res.get("output", "")).strip():
                probe["ram_gb"] = float(str(res["output"]).strip().splitlines()[0])
        elif platform.system() == "Darwin":
            code, out, _err = _run(["sysctl", "-n", "hw.memsize"], timeout=8)
            if code == 0 and out.strip().isdigit():
                probe["ram_gb"] = round(int(out.strip()) / (1024 ** 3), 1)
        else:
            with open("/proc/meminfo", "r", encoding="utf-8", errors="replace") as fh:
                for line in fh:
                    if line.startswith("MemTotal:"):
                        probe["ram_gb"] = round(int(line.split()[1]) / (1024 ** 2), 1)
                        break
    except (OSError, ValueError, TypeError, IndexError):
        pass
    return probe


def _travel_storage():
    """Every place this machine can save to, and how much room is left.

    Windows: every drive letter, labelled disk or USB.
    macOS / Linux: the root filesystem and anything mounted under /Volumes or
    /media, which is where a pendrive actually appears on those systems.
    """
    out = []
    if IS_WINDOWS:
        for d in _disks():
            out.append({"id": d["id"], "label": d["label"] or "disk",
                        "kind": d["kind"], "total_gb": d["total_gb"],
                        "free_gb": d["free_gb"]})
        return out
    targets = [("/", "this computer")]
    if platform.system() == "Darwin":
        targets.append(("/Volumes", "external drives"))
    else:
        targets.append(("/media", "removable drives"))
        targets.append(("/mnt", "mounted drives"))
    seen = set()
    for path, label in targets:
        try:
            if not os.path.isdir(path):
                continue
            entries = [path] if path == "/" else [
                os.path.join(path, e) for e in sorted(os.listdir(path))
            ]
            for entry in entries:
                try:
                    st = os.statvfs(entry)
                    total = round((st.f_blocks * st.f_frsize) / (1024 ** 3), 1)
                    free = round((st.f_bavail * st.f_frsize) / (1024 ** 3), 1)
                except (OSError, AttributeError):
                    continue
                if not total or entry in seen:
                    continue
                seen.add(entry)
                out.append({"id": entry, "label": label, "kind": "disk",
                            "total_gb": total, "free_gb": free})
        except OSError:
            continue
    return out


def _travel_app():
    """Is the person's own app sitting next to Vega on this stick?

    Looks for index.html beside the helper. If it is there, that is "the app",
    and it can be opened here in one command on any of the three systems.
    """
    here = os.path.dirname(os.path.abspath(__file__))
    for name in ("index.html", "Index.html", "INDEX.HTML"):
        page = os.path.join(here, name)
        if os.path.isfile(page):
            return page
    return None


def action_travel_setup(params):
    """One command for "I put her on a pendrive and opened her on another computer".

    It answers the whole sentence in one call:
      - which OS this is, and its specs (CPU, RAM, 32/64-bit)
      - every place that can store files, with the free space on each
      - where Vega herself is running from, and whether that is a stick
      - whether the person's own app is next to her, and if so opens it

    ``open`` can be passed as false to only look and report. Nothing is
    installed, nothing is changed, and on an OS where an action is not
    possible she says so instead of pretending.
    """
    here = os.path.dirname(os.path.abspath(__file__))
    want_open = params.get("open", True)
    if isinstance(want_open, str):
        want_open = want_open.strip().lower() not in ("0", "false", "no", "off")

    specs = _travel_specs()
    storage = _travel_storage()
    app = _travel_app()

    data = {
        "specs": specs,
        "storage": storage,
        "vega_folder": here,
        "drive": _drive_letter_of(here),
        "portable": _is_removable(here),
        "app_found": bool(app),
        "app_path": app or "",
        "can": _report_caps(),
    }

    opened = None
    if app and want_open:
        if IS_WINDOWS:
            res = _start(app)
            opened = bool(res.get("ok"))
            if not opened:
                data["open_error"] = res.get("message") or res.get("error") or "Windows could not open it"
        elif platform.system() == "Darwin":
            code, _out, err = _run(["open", app], timeout=12)
            opened = code == 0
            if not opened:
                data["open_error"] = (err or "macOS could not open it")[:160]
        else:
            code, _out, err = _run(["xdg-open", app], timeout=12)
            opened = code == 0
            if not opened:
                data["open_error"] = (err or "this desktop could not open it")[:160]
    data["app_opened"] = bool(opened)
    return ok(info=data)


def action_security_check(params):
    """Look at a few real settings on this laptop. Read-only: nothing is changed.

    It never opens a browser profile, never reads a password store and never
    asks for a Google or Microsoft password. What it reports is what Windows
    itself will tell any program: firewall, Defender, updates, disk encryption,
    the local user accounts, and a count of saved browser sign-ins (a count
    only, never the names or the passwords).
    """
    report = {"ok": True, "checks": [], "browser": [], "accounts": [], "notes": []}

    def add(level, title, detail):
        report["checks"].append({"level": level, "title": title, "detail": detail})

    if not IS_WINDOWS:
        add("note", "Not Windows", "These checks read Windows settings, so on this machine they cannot run.")
        return report

    script = (
        "$ErrorActionPreference='SilentlyContinue';"
        "$fw=@(Get-NetFirewallProfile | ForEach-Object { @{ name=$_.Name; on=[bool]$_.Enabled } });"
        "$def=(Get-MpComputerStatus);"
        "$bl=@(Get-BitLockerVolume | ForEach-Object { @{ mount=$_.MountPoint; on=[string]$_.ProtectionStatus } });"
        "$up=(New-Object -ComObject Microsoft.Update.AutoUpdate).Settings;"
        "$acct=@(Get-LocalUser | Where-Object { $_.Enabled } | ForEach-Object { $_.Name });"
        "$opt=@(Get-NetFirewallRule -Enabled True -Direction Outbound | "
        "  Where-Object { $_.DisplayName -match 'Remote Desktop|Telnet|FTP' } | "
        "  Select-Object -First 5 -ExpandProperty DisplayName);"
        "@{ firewall=$fw; defender=@{ realtime=[bool]$def.RealTimeProtectionEnabled; "
        "   antivirus=[bool]$def.AntivirusEnabled; age=[int]$def.AntivirusSignatureAge }; "
        "   bitlocker=$bl; auto_update=[int]$up.NotificationLevel; accounts=$acct; "
        "   open_rules=$opt; admin=[bool](([Security.Principal.WindowsPrincipal]"
        "   [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole("
        "   [Security.Principal.WindowsBuiltInRole]::Administrator)) } | ConvertTo-Json -Compress -Depth 4"
    )
    res = ps_command(script, timeout=35)
    data = {}
    if res.get("ok") and res.get("output"):
        try:
            data = json.loads(res["output"])
        except ValueError:
            data = {}

    # ---- firewall
    profiles = data.get("firewall") or []
    if profiles:
        off = [p.get("name") for p in profiles if not p.get("on")]
        if off:
            add("risk", "Firewall is off for " + ", ".join(off),
                "Turn it on: Windows Security > Firewall and network protection. This is the one to fix first.")
        else:
            add("good", "Firewall is on for every network",
                "Windows is blocking connections from other machines that you did not start.")
    else:
        add("note", "Firewall could not be read", "Windows did not answer; open Windows Security once and check by hand.")

    # ---- defender
    d = data.get("defender") or {}
    if d:
        if d.get("realtime"):
            age = d.get("age")
            if isinstance(age, int) and age > 7:
                add("watch", "Virus protection is on, but its list is " + str(age) + " days old",
                    "Connect to the internet and let Windows Update run once.")
            else:
                add("good", "Virus protection (Defender) is on and up to date", "Real-time scanning is running.")
        else:
            add("risk", "Virus protection is switched off",
                "Turn it on in Windows Security. This laptop runs an i3 with 4 GB RAM, so keep one antivirus, not two.")
    else:
        add("note", "Virus protection could not be read", "Open Windows Security once and check by hand.")

    # ---- updates
    lvl = data.get("auto_update")
    if isinstance(lvl, int):
        if lvl == 0:
            add("note", "Automatic updates are set to never install",
                "Change it in Settings > Windows Update so security fixes arrive on their own.")
        else:
            add("good", "Windows Update is set to install security fixes", "You do not have to remember to do it.")
    else:
        add("note", "Windows Update setting could not be read", "Check Settings > Windows Update by hand once.")

    # ---- bitlocker
    bl = data.get("bitlocker") or []
    if bl:
        off = [b.get("mount") for b in bl if str(b.get("on", "")).lower() in ("off", "0", "false")]
        if off:
            add("watch", "Disk encryption is not on for " + ", ".join([x for x in off if x]),
                "If this laptop is lost or stolen, the files can be read. Turn on Device encryption in Settings > Privacy and security.")
        else:
            add("good", "Disk encryption is on", "A thief cannot read the disk without your sign-in.")
    else:
        add("note", "Disk encryption could not be read",
            "Home editions sometimes hide this. Check Settings > Privacy and security > Device encryption.")

    # ---- local accounts: one human, one admin is the safe shape
    accounts = data.get("accounts") or []
    if isinstance(accounts, list):
        report["accounts"] = [str(a) for a in accounts if a]
    if len(report["accounts"]) > 2:
        add("watch", "This laptop has " + str(len(report["accounts"])) + " enabled sign-ins",
            "Every extra account is another way in. Remove ones you do not use: Settings > Accounts > Other users.")

    rules = data.get("open_rules") or []
    if rules:
        add("watch", "Remote-access rules are switched on: " + ", ".join([str(r) for r in rules if r]),
            "If you never use Remote Desktop or an FTP server, switch those rules off. An open door is worse than a forgotten password.")

    if data.get("admin"):
        report["notes"].append("Nova's helper is running as administrator, so it can change things. Close the black window when you are done.")

    # ---- saved browser sign-ins: a COUNT only, from Chrome/Edge's own "Login Data".
    # Nova never opens the file, never reads a row, and never sees a name or a password.
    for name, rel in (
        ("Chrome", r"Google\Chrome\User Data\Default\Login Data"),
        ("Edge", r"Microsoft\Edge\User Data\Default\Login Data"),
        ("Brave", r"BraveSoftware\Brave-Browser\User Data\Default\Login Data"),
    ):
        path = os.path.join(os.environ.get("LOCALAPPDATA", ""), rel)
        if not os.path.exists(path):
            continue
        # copy to a temp file only to count rows; the copy is deleted at once
        count = None
        tmp = None
        try:
            import shutil, sqlite3, tempfile
            fd, tmp = tempfile.mkstemp(suffix=".db")
            os.close(fd)
            shutil.copy2(path, tmp)
            con = sqlite3.connect(tmp)
            try:
                count = con.execute("SELECT COUNT(*) FROM logins").fetchone()[0]
            finally:
                con.close()
        except Exception:
            count = None
        finally:
            if tmp and os.path.exists(tmp):
                try:
                    os.remove(tmp)
                except OSError:
                    pass
        if count is not None:
            # the page shows this row itself, so it is not added to checks twice
            report["browser"].append({"name": name, "saved_logins": int(count)})

    if report["browser"]:
        report["notes"].append("Saved sign-ins are convenient, and they are also what a thief would use. "
                               "Open each browser's Password Manager and delete the ones you no longer need.")
    else:
        report["notes"].append("I found no saved browser sign-ins to count. That is not a problem, it is normal.")

    report["notes"].append("I read counts and settings from Windows. I did not open your mail, did not read one message, "
                           "and I do not have and cannot get the password of any Gmail account.")
    return report


def action_open_path(params):
    """Open one exact file, folder or app, straight from the app list."""
    path = str(params.get("path", "")).strip()
    if not path or any(c in path for c in "\r\n\t"):
        return fail("bad_path")
    if not IS_WINDOWS:
        return fail("unsupported_os")
    if os.path.exists(path):
        return _start(path)
    lowered = path.lower()
    if lowered.startswith(("shell:appsfolder", "ms-", "http", "https")) or lowered.endswith((".exe", ".lnk", ".url")):
        return _start(path)
    return fail("not_found", "That file is not there any more.")


ACTIONS = {
    "open_app": action_open_app,
    "close_app": action_close_app,
    "open_uri": action_open_uri,
    "open_url": action_open_url,
    "open_folder": action_open_folder,
    "volume": action_volume,
    "brightness": action_brightness,
    "media": action_media,
    "screenshot": action_screenshot,
    "lock": action_lock,
    "shutdown": action_shutdown,
    "restart": action_restart,
    "cancel_shutdown": action_cancel_shutdown,
    "sleep": action_sleep,
    "signout": action_signout,
    "system_info": action_system_info,
    "list_apps": action_list_apps,
    "open_path": action_open_path,
    "find_file": action_find_file,
    "where_am_i": action_where_am_i,
    "open_new_window": action_open_new_window,
    "show_folder": action_show_folder,
    "security_check": action_security_check,
    "open_self": action_open_self,
    "travel_setup": action_travel_setup,
}
# In preview mode these are never run, even if someone sends them.
DANGEROUS = {"shutdown", "restart", "sleep", "signout"}


# --------------------------------------------------------------------------
# The small web server
# --------------------------------------------------------------------------
MIME = {
    ".html": "text/html; charset=utf-8",
    ".htm": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".webp": "image/webp",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".mp4": "video/mp4",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".txt": "text/plain; charset=utf-8",
    ".map": "application/json; charset=utf-8",
}
MISSING_PAGE = """<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>index.html is missing</title>
<style>body{font-family:Segoe UI,Arial,sans-serif;background:#071021;color:#e8f0fe;padding:40px;line-height:1.6}
a{color:#38bdf8}code{background:#0d1930;padding:2px 6px;border-radius:6px}</style></head>
<body><h1>Your delivery app page is not in this folder yet</h1>
<p>Vega is running, but there is no <code>index.html</code> next to her.</p>
<p>Copy your RailPure <code>index.html</code> (and its images and other files) into this same
folder, then open <a href="/index.html">/index.html</a> again.</p>
<p><a href="/assistant.html">Back to Vega</a></p></body></html>"""


class Handler(BaseHTTPRequestHandler):
    server_version = "SophiaHelper/" + VERSION
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):  # quieter console
        return

    def _send(self, code, body, ctype="application/json; charset=utf-8", extra=None):
        if isinstance(body, str):
            body = body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        try:
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def _json(self, code, data):
        self._send(code, json.dumps(data), extra={"Content-Security-Policy": "default-src 'none'"})

    def _host_ok(self):
        # Preview mode can never change the computer, so it also answers when
        # the page is opened through a tunnel or another local host name.
        if self.server.preview:
            return True
        host = (self.headers.get("Host") or "").split(":")[0].strip().lower()
        return host in ("127.0.0.1", "localhost", "[::1]", "::1")

    def _origin_ok(self):
        origin = self.headers.get("Origin")
        if not origin or self.server.preview:
            return True  # same-origin GETs and the page's own fetches send no Origin
        parsed = urlparse(origin)
        return parsed.hostname in ("127.0.0.1", "localhost", "::1")

    def _site_ok(self):
        site = (self.headers.get("Sec-Fetch-Site") or "").strip().lower()
        return self.server.preview or site in ("", "same-origin", "none")

    def do_GET(self):
        path = unquote(urlparse(self.path).path)
        if not self._host_ok():
            self._json(403, fail("bad_host"))
            return
        if path in ("/", "/index", "/sophia"):
            self.send_response(302)
            self.send_header("Location", "/" + PAGE_NAME)
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        if path == "/api/status":
            self._json(200, self.server.sophia_state())
            return
        if path.startswith("/api/"):
            self._json(404, fail("not_found"))
            return
        self.serve_file(path)

    def do_HEAD(self):
        self.do_GET()

    def do_POST(self):
        path = unquote(urlparse(self.path).path)
        if path != "/api/action":
            self._json(404, fail("not_found"))
            return
        if not (self._host_ok() and self._origin_ok() and self._site_ok()):
            self._json(403, fail("bad_origin"))
            return
        # the page sends the new header name; the old one is still accepted so an
        # older assistant.html in the same folder keeps working after an update
        tok = self.headers.get("X-Nova-Token") or self.headers.get("X-Sophia-Token")
        if self.server.token_required and tok != self.server.token:
            self._json(403, fail("bad_token"))
            return
        try:
            length = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            length = 0
        if length <= 0 or length > MAX_BODY:
            self._json(413, fail("bad_body"))
            return
        raw = self.rfile.read(length)
        try:
            data = json.loads(raw.decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            self._json(400, fail("bad_json"))
            return
        action = str(data.get("action", ""))
        params = data.get("params") or {}
        if not isinstance(params, dict):
            self._json(400, fail("bad_params"))
            return
        fn = ACTIONS.get(action)
        if not fn:
            self._json(400, fail("unknown_action"))
            return
        if self.server.preview:
            self._json(200, ok(preview=True, action=action, message="Preview mode: nothing was changed."))
            return
        try:
            result = fn(params)
        except Exception as exc:  # never crash the server because of one command
            log("action failed:", action, exc)
            result = fail("exception", str(exc)[:200])
        log("action:", action, json.dumps(params)[:120], "->", "ok" if result.get("ok") else result.get("error"))
        self.server.remember(action)
        self._json(200, result)

    def serve_file(self, path):
        root = self.server.root
        rel = path.lstrip("/") or PAGE_NAME
        full = os.path.realpath(os.path.join(root, rel))
        if not (full == root or full.startswith(root + os.sep)):
            self._send(403, "Not allowed", "text/plain; charset=utf-8")
            return
        if os.path.isdir(full):
            idx = os.path.join(full, "index.html")
            if os.path.isfile(idx):
                full = idx
            else:
                self._send(403, "Directory listing is off", "text/plain; charset=utf-8")
                return
        if not os.path.isfile(full):
            if rel == "index.html":
                self._send(404, MISSING_PAGE, "text/html; charset=utf-8")
            else:
                self._send(404, "Not found: " + rel, "text/plain; charset=utf-8")
            return
        ext = os.path.splitext(full)[1].lower()
        ctype = MIME.get(ext, "application/octet-stream")
        try:
            size = os.path.getsize(full)
            with open(full, "rb") as fh:
                body = fh.read()
        except OSError:
            self._send(500, "Could not read the file", "text/plain; charset=utf-8")
            return
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(size))
        self.send_header("Cache-Control", "no-cache")
        self.send_header("X-Content-Type-Options", "nosniff")
        if ext in (".html", ".htm"):
            self.send_header("X-Frame-Options", "SAMEORIGIN")
            self.send_header("Permissions-Policy", "microphone=(self), camera=(self), "
                                                   "display-capture=(self), autoplay=(self)")
        self.end_headers()
        try:
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError):
            pass


class SophiaServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True

    def __init__(self, addr, root, preview=False, token_required=True):
        super().__init__(addr, Handler)
        self.root = root
        self.preview = preview
        self.token_required = token_required
        self.token = os.urandom(16).hex()
        self.started = time.time()
        self.actions = []
        self.host = addr[0]
        self.port = addr[1]

    def sophia_state(self):
        return {
            "ok": True,
            "name": "Vega helper",
            "version": VERSION,
            "token": self.token if self.token_required else "",
            "preview": self.preview,
            "platform": platform.platform(),
            "python": platform.python_version(),
            "started": int(self.started),
            "actions": list(self.actions[-20:]),
            "page": PAGE_NAME,
        }

    def remember(self, action):
        self.actions.append({"at": int(time.time()), "action": action})
        while len(self.actions) > 50:
            self.actions.pop(0)


def bind_server(host, port, root, preview, token_required=True):
    last = None
    ports = [port] if port else DEFAULT_PORTS
    for p in ports:
        try:
            return SophiaServer((host, p), root, preview, token_required)
        except OSError as exc:
            last = exc
            continue
    raise SystemExit("Could not start Sophia on {}:{}. Is another Sophia already open? ({})".format(host, ports[0], last))


def main(argv=None):
    parser = argparse.ArgumentParser(description="Sophia's local helper for Windows.")
    parser.add_argument("--host", default="127.0.0.1", help="127.0.0.1 keeps Sophia private to this laptop")
    parser.add_argument("--port", type=int, default=0, help="0 means try 8765, 8766, ... 8774")
    parser.add_argument("--folder", default=os.path.dirname(os.path.abspath(__file__)), help="folder to serve")
    parser.add_argument("--preview", action="store_true", help="simulate all laptop actions (for testing)")
    parser.add_argument("--no-browser", action="store_true", help="do not open the browser")
    args = parser.parse_args(argv)

    root = os.path.realpath(args.folder)
    if not os.path.isdir(root):
        raise SystemExit("The folder does not exist: " + root)
    if not os.path.isfile(os.path.join(root, PAGE_NAME)):
        log("warning:", PAGE_NAME, "is not in", root)

    if not IS_WINDOWS and not args.preview:
        log("note: this is not Windows, so real laptop actions will not work.")
        log("      Start with --preview to try the page safely.")

    server = bind_server(args.host, args.port, root, args.preview)
    url = "http://{}:{}/{}".format("127.0.0.1" if args.host in ("0.0.0.0", "") else args.host, server.server_address[1], PAGE_NAME)
    log("Sophia helper", VERSION, "is ready")
    log("Open:", url)
    if args.preview:
        log("Preview mode: actions are simulated, nothing is changed.")
    if args.host not in ("127.0.0.1", "localhost"):
        log("note: bound to", args.host, "- only do this for a quick test.")
    if not args.no_browser:
        threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    log("Press Ctrl + C in this window to stop Sophia.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        log("Stopping Sophia. Bye!")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
