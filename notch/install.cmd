@echo off
rem Claude Notch -- one-shot install.
rem Copies the pieces to %USERPROFILE%\.claude-notch, unblocks them, wires
rem the Claude Code hooks into %USERPROFILE%\.claude\settings.json, turns on
rem autostart, and starts the overlay.
rem Re-running it is safe: it overwrites its own files and rewrites its own
rem hook entries, leaving any other hooks you have alone.
setlocal
set "SRC=%~dp0"
set "DEST=%USERPROFILE%\.claude-notch"

echo.
echo Installing Claude Notch to %DEST%
if not exist "%DEST%" mkdir "%DEST%"
for %%F in (notch.ps1 frame.ps1 frame.tests.ps1 report.cmd start-notch.vbs stop-notch.cmd doctor.ps1 doctor.cmd autostart.ps1 autostart-on.cmd autostart-off.cmd) do (
  copy /Y "%SRC%%%F" "%DEST%\" >nul
)

rem Anything that arrived inside a download carries Windows' "this came from
rem the internet" mark, and Windows then refuses to run it -- silently. This
rem is the most common reason a working script appears to do nothing.
echo Unblocking the files
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-ChildItem -Path '%DEST%' -File | Unblock-File" 2>nul

echo Wiring the hooks into %USERPROFILE%\.claude\settings.json
powershell -NoProfile -ExecutionPolicy Bypass -File "%SRC%install-hooks.ps1"
if errorlevel 1 (
  echo.
  echo Hook setup failed. The overlay will still run, but it will sit on
  echo READY because nothing is reporting to it.
  pause
  exit /b 1
)

echo Turning on autostart
powershell -NoProfile -ExecutionPolicy Bypass -File "%DEST%\autostart.ps1" -Mode on

echo Starting the overlay
cscript //nologo "%DEST%\start-notch.vbs"

rem Give it a moment to draw before the check-up looks for it.
ping -n 3 127.0.0.1 >nul

echo.
echo ===========================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%DEST%\doctor.ps1"
echo ===========================================================
echo.
echo Restart any running Claude Code session so it picks up the hooks.
echo.
echo   See what is wrong : %DEST%\doctor.cmd
echo   Stop it           : %DEST%\stop-notch.cmd
echo   Autostart off     : %DEST%\autostart-off.cmd
echo.
pause
endlocal
