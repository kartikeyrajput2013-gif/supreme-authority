#!/usr/bin/env python3
"""Decode every blob in the installer and compare it with the repo file."""
import base64, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BAT = os.path.join(ROOT, "Vega_Install_One_File.bat")
PAIRS = [("vega_assistant_html.b64","assistant.html"),("vega_sophia_helper_py.b64","sophia_helper.py"),
         ("vega_Start_Sophia_bat.b64","Start_Sophia.bat"),("vega_ico.b64","vega.ico")]
lines = open(BAT,"rb").read().decode("cp1252").split("\r\n")
bad = 0
for name, filename in PAIRS:
    idx = [i for i,l in enumerate(lines) if name in l and " echo " in l]
    blob = "".join(lines[i].split(" echo ",1)[1] for i in idx)
    data = base64.b64decode(blob)
    repo = open(os.path.join(ROOT,filename),"rb").read()
    ok = data == repo
    bad += 0 if ok else 1
    print("%-28s %8d bytes  %s" % (filename, len(data), "IDENTICAL" if ok else "MISMATCH"))
print("ALL IDENTICAL" if not bad else "FAILED")
sys.exit(1 if bad else 0)
