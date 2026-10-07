# Claude Island - Installation mit einem Befehl. In PowerShell einfuegen:
#
#   irm https://raw.githubusercontent.com/Keule0071945/openclaude/claude/flat-notch-status-indicator-x3h3ds/tools/claude-island-windows/get.ps1 | iex
#
# Laedt die fertige ClaudeIsland.exe und die Skripte in einen Temp-Ordner und
# fuehrt dort install.ps1 aus.
#
# Diese Datei muss reines ASCII ohne BOM bleiben: `irm | iex` bricht an einer BOM ab.

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
$base = 'https://raw.githubusercontent.com/Keule0071945/openclaude/claude/flat-notch-status-indicator-x3h3ds/tools/claude-island-windows'
$tmp = Join-Path $env:TEMP ('claude-island-' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force -Path $tmp | Out-Null

Write-Host ''
Write-Host '  Lade Claude Island herunter ...' -ForegroundColor White
foreach ($f in 'ClaudeIsland.exe', 'Core.cs', 'Island.cs', 'Runner.cs', 'Pet.cs', 'Extras.cs', 'Show.cs', 'Voice.cs', 'Mic.cs', 'install.ps1', 'uninstall.ps1', 'uninstall.cmd') {
    # The query string skips GitHub's CDN cache, so an update is picked up right away.
    Invoke-WebRequest -UseBasicParsing -Uri ("$base/$f" + '?nocache=' + [Guid]::NewGuid().ToString('N')) -Headers @{ 'Cache-Control' = 'no-cache' } -OutFile (Join-Path $tmp $f)
}

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $tmp 'install.ps1')

# Deinstaller fuer spaeter neben das Programm legen
$target = Join-Path $env:USERPROFILE '.claude\claude-island'
Copy-Item (Join-Path $tmp 'uninstall.ps1'), (Join-Path $tmp 'uninstall.cmd') $target -Force -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
