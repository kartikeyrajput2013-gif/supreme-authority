@echo off
setlocal EnableExtensions
title Vega - Personal AI Assistant
rem Work from whatever folder this file is in, including a USB stick under any drive letter.
cd /d "%~dp0"
echo.
echo   Starting Vega, your personal AI assistant...
echo.
echo   Keep this black window open while you use Vega.
echo   Press Ctrl + C in this window to stop her.
echo.
echo   Running from: %~dp0
for %%D in ("%~dp0.") do echo   On drive:     %%~dD
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
rem last chances: the Microsoft Store build, then any Python 3 folder anywhere usual
if not defined PY (
  if exist "%LOCALAPPDATA%\Microsoft\WindowsApps\python.exe" set "PY=%LOCALAPPDATA%\Microsoft\WindowsApps\python.exe"
)
if not defined PY (
  for /d %%P in ("%LOCALAPPDATA%\Programs\Python\Python3*") do if exist "%%~P\python.exe" set "PY=%%~P\python.exe"
)
if not defined PY (
  for /d %%P in ("C:\Python3*") do if exist "%%~P\python.exe" set "PY=%%~P\python.exe"
)
if not defined PY goto NOPYTHON

rem --- open Vega herself once the helper is up, a few seconds from now ---
start "" /min cmd /c "timeout /t 6 /nobreak >nul & start """" "http://127.0.0.1:8765/assistant.html""

echo   Opening Vega in your browser...
%PY% "%~dp0sophia_helper.py" --host 127.0.0.1 --port 8765 %*
if errorlevel 1 (
  echo.
  echo   The helper closed. If Vega was already running, she is in a browser tab already.
  echo   On a new computer, check Python with:  python --version
)
goto END

:NOPYTHON
echo   Vega did not find Python on this computer.
echo   That is normal on a new laptop or a borrowed one. She still runs: she opens
echo   websites, plays games and talks. She cannot open your files or change
echo   Windows settings until Python is installed.
echo.
echo   Two choices:
echo     1. Install Python from https://www.python.org/downloads/  (tick "Add python.exe to PATH")
echo        then double-click Start_Sophia.bat again. This is the full version.
echo     2. Keep using browser mode: Vega still opens websites, settings,
echo        the calculator and her own built-in apps, but not other programs.
echo.
echo   Opening browser mode now...
echo.
start "" "%~dp0assistant.html"
goto END

:END
if "%~1"=="" pause
endlocal
