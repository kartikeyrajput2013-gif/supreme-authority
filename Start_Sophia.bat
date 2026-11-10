@echo off
setlocal
title Nova - Personal AI Assistant
cd /d "%~dp0"
echo.
echo   Starting Nova, your personal AI assistant...
echo.
echo   Keep this black window open while you use Nova.
echo   Press Ctrl + C in this window to stop her.
echo.

rem --- find Python: py launcher, python, python3, or the common install spots ---
set "PY="
py -3 -c "import sys" >nul 2>nul
if not errorlevel 1 set "PY=py -3"
if not defined PY (
  python -c "import sys" >nul 2>nul
  if not errorlevel 1 set "PY=python"
)
if not defined PY (
  python3 -c "import sys" >nul 2>nul
  if not errorlevel 1 set "PY=python3"
)
if not defined PY (
  if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" set "PY=%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
)
if not defined PY (
  if exist "%LOCALAPPDATA%\Programs\Python\Python310\python.exe" set "PY=%LOCALAPPDATA%\Programs\Python\Python310\python.exe"
)
if not defined PY (
  if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" set "PY=%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
)
if not defined PY (
  if exist "%LOCALAPPDATA%\Programs\Python\Python39\python.exe" set "PY=%LOCALAPPDATA%\Programs\Python\Python39\python.exe"
)
if not defined PY (
  if exist "%ProgramFiles%\Python311\python.exe" set "PY=%ProgramFiles%\Python311\python.exe"
)
if not defined PY goto NOPYTHON

rem --- open Nova herself once the helper is up, a few seconds from now ---
start "" /min cmd /c "timeout /t 6 /nobreak >nul & start """" "http://127.0.0.1:8765/assistant.html""

%PY% "%~dp0sophia_helper.py" --host 127.0.0.1 --port 8765 %*
goto END

:NOPYTHON
echo   Nova needs Python for full laptop control, but Python was not found here.
echo.
echo   Two choices:
echo     1. Install Python from https://www.python.org/downloads/  (tick "Add python.exe to PATH")
echo        then double-click Start_Sophia.bat again. This is the full version.
echo     2. Keep using browser mode: Nova still opens websites, settings,
echo        the calculator and her own built-in apps, but not other programs.
echo.
echo   Opening browser mode now...
echo.
start "" "%~dp0assistant.html"
goto END

:END
if "%~1"=="" pause
endlocal
