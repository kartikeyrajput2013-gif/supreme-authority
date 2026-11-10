@echo off
setlocal
title Sophia - setup
cd /d "%~dp0"
echo.
echo   Sophia - one step installer
echo   ==========================
echo.
echo   I will copy Sophia into a folder, keep a backup of the old one,
echo   and put a shortcut called "Sophia" on your Desktop.
echo.
echo   Nothing is uploaded. Nothing is deleted.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install_Sophia.ps1"
if errorlevel 1 (
  echo.
  echo   The setup window could not start PowerShell.
  echo   Please right-click Install_Sophia.ps1 and choose
  echo   "Run with PowerShell".
  echo.
  pause
)
endlocal
