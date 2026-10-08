# Clawd Diktat - Deinstallation (nur ASCII, siehe install.ps1)

$root = Join-Path $env:LOCALAPPDATA 'ClawdDiktat'
$data = Join-Path $env:APPDATA 'ClawdDiktat'
Get-Process -Name 'ClawdDiktat' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 500
Remove-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -Name 'ClawdDiktat' -ErrorAction SilentlyContinue
Remove-Item (Join-Path ([Environment]::GetFolderPath('Programs')) 'Clawd Diktat.lnk') -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force $root -ErrorAction SilentlyContinue
$keep = Read-Host '  Einstellungen, Ersetzungen und Verlauf behalten? (j/n, Enter = j)'
if ($keep -match '^[nN]') { Remove-Item -Recurse -Force $data -ErrorAction SilentlyContinue }
Write-Host '  Clawd Diktat wurde entfernt.' -ForegroundColor Green
Read-Host '  Enter zum Schliessen'
