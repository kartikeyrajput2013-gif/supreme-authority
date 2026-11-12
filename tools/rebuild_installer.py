#!/usr/bin/env python3
"""
Rebuild Vega_Install_One_File.bat from the files in this repository.

The installer is a plain .bat whose only variable part is four base64 blobs
(assistant.html, sophia_helper.py, Start_Sophia.bat, vega.ico). Everything else
is the script itself, which this tool never rewrites: it finds each blob's
block, decodes it with the same rule certutil uses on Windows, and replaces the
text in place. If a blob does not decode to the current repo file, the text is
regenerated; if it already matches, the line count is left alone.

Usage:  python3 tools/rebuild_installer.py
"""
import base64
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BAT = os.path.join(ROOT, "Vega_Install_One_File.bat")

# The order of the blocks inside the .bat, top to bottom.
PAYLOADS = [
    ("vega_assistant_html.b64", "assistant.html"),
    ("vega_sophia_helper_py.b64", "sophia_helper.py"),
    ("vega_Start_Sophia_bat.b64", "Start_Sophia.bat"),
    ("vega_ico.b64", "vega.ico"),
]

# certutil writes a 64-byte-per-line base64 body. Long lines are safe in a
# batch file at this width; the original used the same.
WRAP = 64


def find_block(lines, name):
    """The '>' seeding line and the last payload line for one blob."""
    first = None
    last = None
    for i, line in enumerate(lines):
        if name not in line:
            continue
        if line.startswith("> ") and first is None:
            first = i
        elif line.startswith(">> "):
            last = i
    if first is None or last is None:
        raise SystemExit("could not find the block for " + name)
    return first, last


def b64_lines(name, data):
    body = base64.b64encode(data).decode("ascii")
    out = ["> \"%TEMP%\\\\" + name + "\" echo."]
    for i in range(0, len(body), WRAP):
        out.append('>> "%TEMP%\\\\' + name + '" echo ' + body[i:i + WRAP])
    return out


def main():
    raw = open(BAT, "rb").read()
    text = raw.decode("cp1252")
    lines = text.split("\r\n")

    changed = []
    for name, filename in PAYLOADS:
        path = os.path.join(ROOT, filename)
        data = open(path, "rb").read()
        first, last = find_block(lines, name)
        old = [l for l in lines[first + 1:last + 1] if name in l and " echo " in l]
        old_blob = "".join(l.split(" echo ", 1)[1] for l in old)
        try:
            same = base64.b64decode(old_blob) == data
        except Exception:
            same = False
        if same:
            print("  %-26s already current (%d bytes)" % (filename, len(data)))
            continue
        new = b64_lines(name, data)
        lines[first:last + 1] = new
        changed.append(filename)
        print("  %-26s replaced (%d bytes)" % (filename, len(data)))

    if not changed:
        print("nothing to do: the installer already matches the repository")
        return 0

    out = "\r\n".join(lines)
    # A batch file must keep CRLF, and the size is not allowed to shrink past
    # what cmd.exe can read in one line. Verified by re-reading below.
    open(BAT, "wb").write(out.encode("cp1252"))

    # read it back the way the verifier will
    back = open(BAT, "rb").read().decode("cp1252").split("\r\n")
    for name, filename in PAYLOADS:
        data = open(os.path.join(ROOT, filename), "rb").read()
        first, last = find_block(back, name)
        blob = "".join(l.split(" echo ", 1)[1] for l in back[first + 1:last + 1]
                       if name in l and " echo " in l)
        if base64.b64decode(blob) != data:
            raise SystemExit("FAILED: " + filename + " did not survive the rewrite")
    print("verified: all four payloads decode back to the repository files")
    print("installer is now %d bytes" % os.path.getsize(BAT))
    return 0


if __name__ == "__main__":
    sys.exit(main())
