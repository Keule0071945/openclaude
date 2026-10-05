# Claude Island - Diagnose. In PowerShell einfuegen:
#   iex ((irm https://raw.githubusercontent.com/Keule0071945/openclaude/claude/flat-notch-status-indicator-x3h3ds/tools/claude-island-windows/diag.ps1) -replace '^\uFEFF','')
# Prueft die Installation, startet die Island testweise und kopiert den Bericht
# in die Zwischenablage. Reines ASCII ohne BOM lassen.

$out = New-Object System.Collections.Generic.List[string]
function Add-Line($t) { $out.Add([string]$t); Write-Host $t }

Add-Line '=== Claude Island Diagnose ==='
Add-Line ("Windows: " + [Environment]::OSVersion.VersionString + "  64bit=" + [Environment]::Is64BitOperatingSystem)
Add-Line ("PowerShell: " + $PSVersionTable.PSVersion + "  Edition=" + $PSVersionTable.PSEdition)
try {
    $rel = (Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full' -ErrorAction Stop).Release
    Add-Line (".NET Framework 4 Release: $rel  (ab 528040 ist es 4.8)")
} catch { Add-Line '.NET Framework 4: NICHT GEFUNDEN' }
try {
    Add-Type -AssemblyName System.Windows.Forms
    $screens = [System.Windows.Forms.Screen]::AllScreens | ForEach-Object { "$($_.DeviceName) $($_.Bounds.Width)x$($_.Bounds.Height) primaer=$($_.Primary)" }
    Add-Line ("Bildschirme: " + ($screens -join ' | '))
} catch { Add-Line "Bildschirme: ? $_" }

$target = Join-Path $env:USERPROFILE '.claude\claude-island'
$exe = Join-Path $target 'ClaudeIsland.exe'
$data = Join-Path $env:LOCALAPPDATA 'ClaudeIsland'
Add-Line ''
Add-Line ("Programm: $exe  vorhanden=" + (Test-Path $exe))
if (Test-Path $exe) { $fi = Get-Item $exe; Add-Line ("  Groesse=" + $fi.Length + "  Datum=" + $fi.LastWriteTime) }
Add-Line ("Alte Version vorhanden=" + (Test-Path (Join-Path $data 'ClaudeIsland.exe')))
$startup = Join-Path ([Environment]::GetFolderPath('Startup')) 'Claude Island.lnk'
Add-Line ("Autostart-Verknuepfung vorhanden=" + (Test-Path $startup))

$settings = Join-Path $env:USERPROFILE '.claude\settings.json'
Add-Line ("settings.json vorhanden=" + (Test-Path $settings))
if (Test-Path $settings) {
    $raw = [IO.File]::ReadAllText($settings)
    Add-Line ("  Hooks mit ClaudeIsland: " + ([regex]::Matches($raw, 'ClaudeIsland\.exe')).Count)
    Add-Line ("  Statuszeile mit ClaudeIsland: " + ($raw -match 'ClaudeIsland\.exe statusline'))
}

Add-Line ''
$p = Get-Process -Name 'ClaudeIsland' -ErrorAction SilentlyContinue
$ids = if ($p) { ($p | ForEach-Object { $_.Id }) -join ',' } else { '-' }
Add-Line ("Laeuft gerade: " + [bool]$p + "  PID " + $ids)

if ((Test-Path $exe) -and -not $p) {
    Add-Line 'Starte testweise ...'
    try {
        $proc = Start-Process -FilePath $exe -ArgumentList 'demo' -PassThru
        Start-Sleep -Seconds 4
        $proc.Refresh()
        if ($proc.HasExited) { Add-Line ("  BEENDET mit Code " + $proc.ExitCode) } else { Add-Line '  laeuft nach 4 Sekunden noch (gut)' }
    } catch { Add-Line ("  Start fehlgeschlagen: " + $_.Exception.Message) }
}

$log = Join-Path $data 'island.log'
Add-Line ''
Add-Line ("Fehlerprotokoll vorhanden=" + (Test-Path $log))
if (Test-Path $log) { Get-Content $log -Tail 40 | ForEach-Object { Add-Line ("  " + $_) } }

$text = $out -join "`r`n"
try {
    Set-Clipboard -Value $text
    Write-Host ''
    Write-Host 'Bericht ist in der Zwischenablage. Bitte im Chat einfuegen (Strg+V).' -ForegroundColor Green
} catch { Write-Host 'Bitte den Text oben markieren und kopieren.' -ForegroundColor Yellow }
