@echo off
setlocal
title Sophia - Personal AI Assistant
cd /d "%~dp0"
echo.
echo   Starting Sophia, your personal AI assistant...
echo.
echo   Keep this black window open while you use Sophia.
echo   Press Ctrl + C in this window to stop her.
echo.

set "PY="
py -3 -c "import sys" >nul 2>nul
if not errorlevel 1 set "PY=py -3"
if not defined PY (
  python -c "import sys" >nul 2>nul
  if not errorlevel 1 set "PY=python"
)

if not defined PY goto NOPYTHON

%PY% "%~dp0sophia_helper.py" --host 127.0.0.1 --port 8765 %*
goto END

:NOPYTHON
echo   Sophia needs Python for full laptop control, but Python was not found.
echo.
echo   No problem - I will open Sophia in your browser instead.
echo   In this mode she can open websites, settings and the calculator,
echo   but not other apps, volume or brightness.
echo.
start "" "%~dp0assistant.html"
goto END

:END
if "%~1"=="" pause
endlocal
