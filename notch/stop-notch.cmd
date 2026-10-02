@echo off
rem Asks the overlay to close itself, then makes sure it is gone.
setlocal
set "NOTCHDIR=%USERPROFILE%\.claude-notch"
> "%NOTCHDIR%\stop" echo stop
timeout /t 1 /nobreak >nul
if exist "%NOTCHDIR%\overlay.pid" (
  set /p NOTCHPID=<"%NOTCHDIR%\overlay.pid"
  taskkill /PID %NOTCHPID% /F >nul 2>&1
  del "%NOTCHDIR%\overlay.pid" >nul 2>&1
)
del "%NOTCHDIR%\stop" >nul 2>&1
echo Notch stopped.
endlocal
