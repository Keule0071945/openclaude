@echo off
title Claude Notch installieren
color 0B
setlocal

echo.
echo   ================================================
echo     CLAUDE NOTCH - Installation
echo   ================================================
echo.
echo   Das hier richtet den Streifen oben am Bildschirm ein,
echo   der zeigt ob Claude arbeitet oder auf dich wartet.
echo.
echo   Du musst nichts weiter tun. Es laeuft von allein.
echo.
echo   ------------------------------------------------
echo.

rem Internetverbindung pruefen, bevor wir eine Fehlermeldung
rem produzieren, die niemand deuten kann.
echo   [1/3] Verbindung pruefen...
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $null = Invoke-WebRequest -Uri 'https://raw.githubusercontent.com' -UseBasicParsing -TimeoutSec 20; exit 0 } catch { exit 1 }"
if errorlevel 1 (
  echo.
  echo   FEHLER: Keine Verbindung zu GitHub.
  echo.
  echo   Pruefe deine Internetverbindung. Falls du hinter einer
  echo   Firewall oder einem Firmen-Proxy sitzt, blockiert die
  echo   vermutlich den Zugriff.
  echo.
  goto ende
)
echo         ok
echo.

echo   [2/3] Dateien holen und einrichten...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/Keule0071945/openclaude/claude/pixel-art-boss-game-ew4o9e/notch/bootstrap.ps1 | iex"

rem Der Bootstrap bricht mit `return` ab, nicht mit einem Exit-Code --
rem also direkt nachsehen ob die Dateien wirklich angekommen sind.
if not exist "%USERPROFILE%\.claude-notch\notch.ps1" (
  echo.
  echo   FEHLER: Die Dateien sind nicht angekommen.
  echo   Was oben in Rot steht, ist der Grund dafuer.
  echo.
  goto ende
)

echo.
echo   [3/3] Fertig.
echo.
echo   ------------------------------------------------
echo.
echo   WICHTIG: Schliesse jetzt alle offenen Claude-Code-Fenster
echo   und oeffne sie neu. Sonst meldet Claude nichts an den
echo   Streifen, und er bleibt auf READY stehen.
echo.
echo   Der Streifen startet ab jetzt automatisch mit Windows.
echo.
echo   Wenn du nichts siehst, doppelklicke:
echo     %%USERPROFILE%%\.claude-notch\doctor.cmd
echo.

:ende
echo   ------------------------------------------------
echo.
echo   Dieses Fenster bleibt offen, damit du alles lesen kannst.
echo.
pause
endlocal
