@echo off
rem Claude Notch reporter -- called by Claude Code's hooks.
rem   report.cmd busy
rem   report.cmd waiting "approve Bash"
rem   report.cmd idle
rem
rem Writes two lines (state, detail) that the overlay polls. Deliberately a
rem batch file and not PowerShell: hooks run on every prompt and every stop,
rem and spawning a PowerShell runtime each time would put a visible pause
rem into the session.
setlocal
set "NOTCHDIR=%USERPROFILE%\.claude-notch"
if not exist "%NOTCHDIR%" mkdir "%NOTCHDIR%" >nul 2>&1
> "%NOTCHDIR%\status.txt" echo %~1
>>"%NOTCHDIR%\status.txt" echo %~2
endlocal
