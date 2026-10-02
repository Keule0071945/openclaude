@echo off
rem Claude Notch -- one-shot install.
rem Copies the pieces to %USERPROFILE%\.claude-notch, wires the Claude Code
rem hooks into %USERPROFILE%\.claude\settings.json, and starts the overlay.
rem Re-running it is safe: it overwrites its own files and rewrites its own
rem hook entries, leaving any other hooks you have alone.
setlocal EnableDelayedExpansion
set "SRC=%~dp0"
set "DEST=%USERPROFILE%\.claude-notch"
set "SETTINGS=%USERPROFILE%\.claude\settings.json"

echo Installing Claude Notch to %DEST%
if not exist "%DEST%" mkdir "%DEST%"
copy /Y "%SRC%notch.ps1"       "%DEST%\" >nul
copy /Y "%SRC%frame.ps1"       "%DEST%\" >nul
copy /Y "%SRC%report.cmd"      "%DEST%\" >nul
copy /Y "%SRC%start-notch.vbs" "%DEST%\" >nul
copy /Y "%SRC%stop-notch.cmd"  "%DEST%\" >nul

echo Wiring the hooks into %SETTINGS%
powershell -NoProfile -ExecutionPolicy Bypass -File "%SRC%install-hooks.ps1"
if errorlevel 1 (
  echo.
  echo Hook setup failed. The overlay will still run, but it will stay on
  echo READY because nothing is reporting to it.
  pause
  exit /b 1
)

echo Starting the overlay
cscript //nologo "%DEST%\start-notch.vbs"

echo.
echo Done. The notch is at the top of your screen.
echo   Start it again later:  %DEST%\start-notch.vbs
echo   Stop it:               %DEST%\stop-notch.cmd
echo.
echo Restart any running Claude Code session so it picks up the new hooks.
pause
endlocal
