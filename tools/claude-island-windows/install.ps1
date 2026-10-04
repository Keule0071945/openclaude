# Claude Island - Installer
# Installiert die Island, traegt Hooks und Statuszeile in Claude Code ein (fuer
# Status und Nutzungslimit), legt einen Autostart-Eintrag an und startet sie.
#
#   Rechtsklick > "Mit PowerShell ausfuehren"   oder   install.cmd doppelklicken

[CmdletBinding()]
param(
    # Pfad zur settings.json von Claude Code (Standard: Benutzer-Einstellungen)
    [string]$SettingsPath = (Join-Path $env:USERPROFILE '.claude\settings.json'),
    # Ohne Autostart installieren
    [switch]$NoAutostart,
    # Immer aus ClaudeIsland.cs neu kompilieren, auch wenn eine fertige EXE daneben liegt
    [switch]$Rebuild
)

$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
# Programm unter ~/.claude, damit die Statuszeile es als ~/.claude/... aufrufen
# kann (funktioniert in Git Bash und PowerShell, auch mit Leerzeichen im Namen).
$target = Join-Path $env:USERPROFILE '.claude\claude-island'
$exe = Join-Path $target 'ClaudeIsland.exe'
$statusCommand = '~/.claude/claude-island/ClaudeIsland.exe statusline'
$dataDir = Join-Path $env:LOCALAPPDATA 'ClaudeIsland'
$chainFile = Join-Path $dataDir 'statusline-previous.txt'

function Step($text) { Write-Host "  > $text" -ForegroundColor Cyan }

Write-Host ''
Write-Host '  Claude Island wird installiert ...' -ForegroundColor White
Write-Host ''

# 1) Laufende Instanz beenden, damit die EXE ersetzt werden kann
Get-Process -Name 'ClaudeIsland' -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Milliseconds 300
# Aeltere Version lag direkt in %LOCALAPPDATA%\ClaudeIsland
$legacyExe = Join-Path $dataDir 'ClaudeIsland.exe'
if (Test-Path $legacyExe) { Remove-Item $legacyExe -Force -ErrorAction SilentlyContinue }
New-Item -ItemType Directory -Force -Path $dataDir | Out-Null

# 2) Programm bereitstellen: fertige EXE aus dem Download verwenden, sonst
#    mit dem in Windows enthaltenen C#-Compiler (.NET Framework 4.x) bauen.
New-Item -ItemType Directory -Force -Path $target | Out-Null
$prebuilt = Join-Path $here 'ClaudeIsland.exe'
if ((Test-Path $prebuilt) -and -not $Rebuild) {
    Step 'Kopiere ClaudeIsland.exe'
    Copy-Item $prebuilt $exe -Force
    try { Unblock-File -Path $exe } catch { }
} else {
    Step 'Kompiliere ClaudeIsland.exe'
    $fw = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319'
    if (-not (Test-Path (Join-Path $fw 'csc.exe'))) { $fw = Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319' }
    $csc = Join-Path $fw 'csc.exe'
    if (-not (Test-Path $csc)) { throw "C#-Compiler nicht gefunden ($csc). Ist .NET Framework 4.8 installiert?" }

    $src = @(Get-ChildItem -Path $here -Filter '*.cs' | ForEach-Object { $_.FullName })
    if ($src.Count -eq 0) { throw "Keine Quelldateien (*.cs) in $here gefunden." }
    foreach ($f in $src) { try { Unblock-File -Path $f } catch { } }
    $refs = @(
        (Join-Path $fw 'System.Xaml.dll'),
        (Join-Path $fw 'WPF\WindowsBase.dll'),
        (Join-Path $fw 'WPF\PresentationCore.dll'),
        (Join-Path $fw 'WPF\PresentationFramework.dll'),
        (Join-Path $fw 'System.Windows.Forms.dll'),
        (Join-Path $fw 'System.Drawing.dll'),
        (Join-Path $fw 'System.Core.dll')
    ) | ForEach-Object { "/reference:$_" }

    # Keine eingebetteten Anfuehrungszeichen: PowerShell setzt Argumente mit
    # Leerzeichen (z. B. "C:\Users\Max Mustermann") selbst korrekt in Quotes.
    $cscArgs = @('/nologo', '/target:winexe', '/optimize+', '/codepage:65001', "/out:$exe") + $refs + $src
    $output = & $csc $cscArgs 2>&1
    if ($LASTEXITCODE -ne 0) {
        $output | ForEach-Object { Write-Host $_ -ForegroundColor Red }
        throw 'Kompilieren fehlgeschlagen.'
    }
}

# 3) Hooks in Claude Code eintragen (vorhandene Hooks bleiben erhalten)
Step "Trage Hooks ein in $SettingsPath"
$events = @(
    'SessionStart', 'SessionEnd', 'UserPromptSubmit',
    'PreToolUse', 'PostToolUse', 'PostToolUseFailure',
    'PermissionRequest', 'PermissionDenied', 'Notification',
    'Stop', 'StopFailure'
)

$settingsDir = Split-Path -Parent $SettingsPath
New-Item -ItemType Directory -Force -Path $settingsDir | Out-Null
if (Test-Path $SettingsPath) {
    $raw = [IO.File]::ReadAllText($SettingsPath)
    $backup = "$SettingsPath.bak-claude-island-" + (Get-Date -Format 'yyyyMMdd-HHmmss')
    Copy-Item $SettingsPath $backup
    Write-Host "    Sicherung: $backup" -ForegroundColor DarkGray
} else {
    $raw = ''
}
if ([string]::IsNullOrWhiteSpace($raw)) { $cfg = New-Object PSObject } else { $cfg = ConvertFrom-Json -InputObject $raw }

if (-not $cfg.PSObject.Properties['hooks']) {
    $cfg | Add-Member -NotePropertyName 'hooks' -NotePropertyValue (New-Object PSObject)
}

foreach ($ev in $events) {
    $kept = @()
    if ($cfg.hooks.PSObject.Properties[$ev]) {
        foreach ($group in @($cfg.hooks.$ev)) {
            $others = @(@($group.hooks) | Where-Object { -not ("$($_.command)" -like '*ClaudeIsland.exe*') })
            if ($others.Count -gt 0) {
                $group.hooks = $others
                $kept += $group
            }
        }
    }
    $ours = [pscustomobject]@{
        hooks = @([pscustomobject]@{
            type    = 'command'
            command = $exe
            args    = @('hook')
            async   = $true
            timeout = 15
        })
    }
    $kept += $ours
    if ($cfg.hooks.PSObject.Properties[$ev]) { $cfg.hooks.$ev = $kept }
    else { $cfg.hooks | Add-Member -NotePropertyName $ev -NotePropertyValue $kept }
}

# Statuszeile: liefert das Nutzungslimit. Eine vorhandene Statuszeile wird
# gemerkt und von der Island weiter ausgegeben, sie bleibt also sichtbar.
Step 'Richte die Statuszeile fuer das Nutzungslimit ein'
$previous = $null
if ($cfg.PSObject.Properties['statusLine'] -and $cfg.statusLine -and $cfg.statusLine.PSObject.Properties['command']) {
    $previous = "$($cfg.statusLine.command)"
}
if ($previous -and -not ($previous -like '*ClaudeIsland.exe*')) {
    [IO.File]::WriteAllText($chainFile, $previous, (New-Object Text.UTF8Encoding $false))
    Write-Host "    Deine bisherige Statuszeile bleibt erhalten." -ForegroundColor DarkGray
}
$statusLine = [pscustomobject]@{ type = 'command'; command = $statusCommand; padding = 0 }
if ($cfg.PSObject.Properties['statusLine'] -and $cfg.statusLine -and $cfg.statusLine.PSObject.Properties['padding']) {
    $statusLine.padding = $cfg.statusLine.padding
}
if ($cfg.PSObject.Properties['statusLine']) { $cfg.statusLine = $statusLine }
else { $cfg | Add-Member -NotePropertyName 'statusLine' -NotePropertyValue $statusLine }

$json = ConvertTo-Json -InputObject $cfg -Depth 64
[IO.File]::WriteAllText($SettingsPath, $json, (New-Object Text.UTF8Encoding $false))

# 4) Autostart
$startup = [Environment]::GetFolderPath('Startup')
$lnkPath = if ($startup) { Join-Path $startup 'Claude Island.lnk' } else { $null }
if ($NoAutostart -or -not $lnkPath) {
    if ($lnkPath -and (Test-Path $lnkPath)) { Remove-Item $lnkPath }
} else {
    Step 'Lege Autostart-Eintrag an'
    $shell = New-Object -ComObject WScript.Shell
    $lnk = $shell.CreateShortcut($lnkPath)
    $lnk.TargetPath = $exe
    $lnk.WorkingDirectory = $target
    $lnk.Description = 'Claude Island - Statusanzeige fuer Claude Code'
    $lnk.Save()
}

# 5) Starten und einmal vorfuehren
Step 'Starte Claude Island'
Start-Process -FilePath $exe -ArgumentList 'demo'

Write-Host ''
Write-Host '  Fertig! Die Island sitzt jetzt oben mittig auf deinem Hauptbildschirm.' -ForegroundColor Green
Write-Host '  Sie fuehrt einmal alle Zustaende vor. Danach zeigt sie live, was Claude Code macht.' -ForegroundColor Green
Write-Host '  Ruhend ist sie ein kleines Blockmonster. Fahr mit der Maus drueber: Das Maul geht auf.' -ForegroundColor Green
Write-Host '  Laufende Claude-Code-Sitzungen bitte einmal neu starten, damit Hooks und Statuszeile greifen.' -ForegroundColor Yellow
Write-Host ''
