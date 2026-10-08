# Clawd Diktat - Installation mit einem Befehl. In PowerShell einfuegen:
#
#   irm https://raw.githubusercontent.com/Keule0071945/openclaude/claude/flat-notch-status-indicator-x3h3ds/tools/clawd-diktat-windows/get.ps1 | iex
#
# Diese Datei muss reines ASCII ohne BOM bleiben: `irm | iex` bricht an einer BOM ab.

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
$base = 'https://raw.githubusercontent.com/Keule0071945/openclaude/claude/flat-notch-status-indicator-x3h3ds/tools/clawd-diktat-windows'
$tmp = Join-Path $env:TEMP ('clawd-diktat-' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force -Path $tmp | Out-Null

Write-Host ''
Write-Host '  Lade Clawd Diktat herunter ...' -ForegroundColor White
foreach ($f in 'ClawdDiktat.exe', 'install.ps1', 'uninstall.ps1', 'uninstall.cmd') {
    Invoke-WebRequest -UseBasicParsing -Uri ("$base/$f" + '?nocache=' + [Guid]::NewGuid().ToString('N')) -Headers @{ 'Cache-Control' = 'no-cache' } -OutFile (Join-Path $tmp $f)
}
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $tmp 'install.ps1')
Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
