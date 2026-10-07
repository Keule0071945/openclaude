# Claude Island - Diagnose. In PowerShell einfuegen:
#   iex ((irm "https://raw.githubusercontent.com/Keule0071945/openclaude/claude/flat-notch-status-indicator-x3h3ds/tools/claude-island-windows/diag.ps1?nocache=$(Get-Random)") -replace '^\uFEFF','')
# Prueft Installation, Claude Code, Hooks, Sitzungen, Spracherkennung und
# Mikrofon, startet die Island testweise und kopiert den Bericht in die
# Zwischenablage. Reines ASCII ohne BOM lassen.

$out = New-Object System.Collections.Generic.List[string]
function Add-Line($t) { $out.Add([string]$t); Write-Host $t }
function Section($t) { Add-Line ''; Add-Line "--- $t ---" }

Add-Line '=== Claude Island Diagnose ==='
Add-Line ("Zeit: " + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
Add-Line ("Windows: " + [Environment]::OSVersion.VersionString + "  64bit=" + [Environment]::Is64BitOperatingSystem + "  Sprache=" + (Get-Culture).Name + "  UI=" + (Get-UICulture).Name)
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

Section 'Programm'
$target = Join-Path $env:USERPROFILE '.claude\claude-island'
$exe = Join-Path $target 'ClaudeIsland.exe'
$data = Join-Path $env:LOCALAPPDATA 'ClaudeIsland'
Add-Line ("Programm: $exe  vorhanden=" + (Test-Path $exe))
if (Test-Path $exe) { $fi = Get-Item $exe; Add-Line ("  Groesse=" + $fi.Length + "  Datum=" + $fi.LastWriteTime) }
$startup = Join-Path ([Environment]::GetFolderPath('Startup')) 'Claude Island.lnk'
Add-Line ("Autostart-Verknuepfung vorhanden=" + (Test-Path $startup))
$p = Get-Process -Name 'ClaudeIsland' -ErrorAction SilentlyContinue
$ids = if ($p) { ($p | ForEach-Object { $_.Id }) -join ',' } else { '-' }
Add-Line ("Laeuft gerade: " + [bool]$p + "  PID " + $ids)
if ((Test-Path $exe) -and -not $p) {
    Add-Line 'Starte testweise ...'
    try {
        $proc = Start-Process -FilePath $exe -PassThru
        Start-Sleep -Seconds 4
        $proc.Refresh()
        if ($proc.HasExited) { Add-Line ("  BEENDET mit Code " + $proc.ExitCode) } else { Add-Line '  laeuft nach 4 Sekunden noch (gut)' }
    } catch { Add-Line ("  Start fehlgeschlagen: " + $_.Exception.Message) }
}

Section 'Claude Code'
$claude = Get-Command claude -ErrorAction SilentlyContinue
if ($claude) {
    Add-Line ("claude gefunden: " + $claude.Source)
    try { $v = & claude --version 2>&1 | Select-Object -First 1; Add-Line ("  Version: " + $v) } catch { Add-Line ("  Version: Fehler " + $_.Exception.Message) }
} else { Add-Line 'claude NICHT im PATH gefunden' }
$local = Join-Path $env:USERPROFILE '.local\bin\claude.exe'
Add-Line ("~/.local/bin/claude.exe vorhanden=" + (Test-Path $local))

$settings = Join-Path $env:USERPROFILE '.claude\settings.json'
Add-Line ("settings.json vorhanden=" + (Test-Path $settings))
if (Test-Path $settings) {
    $raw = [IO.File]::ReadAllText($settings)
    Add-Line ("  Hooks mit ClaudeIsland: " + ([regex]::Matches($raw, 'ClaudeIsland\.exe')).Count + "  (erwartet: 14)")
    Add-Line ("  Statuszeile mit ClaudeIsland: " + ($raw -match 'ClaudeIsland\.exe.{0,6}statusline'))
    try { $null = ConvertFrom-Json $raw; Add-Line '  JSON gueltig: True' } catch { Add-Line ('  JSON gueltig: FALSE ' + $_.Exception.Message) }
}

Section 'Daten'
$sessions = Join-Path $data 'sessions'
if (Test-Path $sessions) {
    $files = @(Get-ChildItem $sessions -Filter '*.json' | Sort-Object LastWriteTime -Descending)
    Add-Line ("Sitzungen: " + $files.Count)
    foreach ($f in ($files | Select-Object -First 3)) {
        try {
            $s = Get-Content $f.FullName -Raw | ConvertFrom-Json
            Add-Line ("  " + $f.LastWriteTime.ToString('dd.MM. HH:mm:ss') + "  state=" + $s.state + "  tool=" + $s.tool + "  cwd=" + (Split-Path -Leaf $s.cwd))
        } catch { Add-Line ("  " + $f.Name + ": nicht lesbar") }
    }
} else { Add-Line 'Sitzungen: Ordner fehlt (noch kein Hook angekommen)' }
$usage = Join-Path $data 'usage.json'
if (Test-Path $usage) { Add-Line ("usage.json: " + (Get-Item $usage).LastWriteTime + "  " + (Get-Content $usage -Raw)) } else { Add-Line 'usage.json: fehlt (Statuszeile hat noch nichts geliefert)' }
$ini = Join-Path $data 'settings.ini'
if (Test-Path $ini) {
    $lines = Get-Content $ini | Where-Object { $_ -notmatch '^(quick|project)=' } | ForEach-Object { if ($_ -match '^phone=.+') { 'phone=(gesetzt)' } else { $_ } }
    Add-Line ("Einstellungen: " + ($lines -join '  '))
}

Section 'Spracherkennung (Hey Clawd)'
try {
    Add-Type -AssemblyName System.Speech
    $recs = [System.Speech.Recognition.SpeechRecognitionEngine]::InstalledRecognizers()
    if ($recs.Count -eq 0) { Add-Line 'Erkenner: KEINE installiert' }
    foreach ($r in $recs) { Add-Line ("Erkenner: " + $r.Culture.Name + "  " + $r.Name) }
    $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
    foreach ($v in $synth.GetInstalledVoices()) { Add-Line ("Stimme: " + $v.VoiceInfo.Culture.Name + "  " + $v.VoiceInfo.Name + "  aktiv=" + $v.Enabled) }
    $synth.Dispose()
    $de = $recs | Where-Object { $_.Culture.TwoLetterISOLanguageName -eq 'de' } | Select-Object -First 1
    if ($de) {
        try {
            $eng = New-Object System.Speech.Recognition.SpeechRecognitionEngine($de)
            $eng.SetInputToDefaultAudioDevice()
            $gb = New-Object System.Speech.Recognition.GrammarBuilder('hey clawd')
            $gb.Culture = $de.Culture
            $eng.LoadGrammar((New-Object System.Speech.Recognition.Grammar($gb)))
            Add-Line 'Mikrofon-Test: deutscher Erkenner + Standard-Mikrofon + Grammatik OK'
            Write-Host ''
            Write-Host 'Sag jetzt innerhalb von 5 Sekunden deutlich: "Hey Clawd"' -ForegroundColor Cyan
            $res = $eng.Recognize([TimeSpan]::FromSeconds(5))
            if ($res) { Add-Line ("  Gehoert: '" + $res.Text + "' Sicherheit=" + [math]::Round($res.Confidence, 2)) } else { Add-Line '  Nichts erkannt (zu leise, falsches Mikrofon oder anders ausgesprochen)' }
            $eng.Dispose()
        } catch { Add-Line ('Mikrofon-Test: FEHLER ' + $_.Exception.GetType().Name + ': ' + $_.Exception.Message) }
    }
} catch { Add-Line ('System.Speech: FEHLER ' + $_.Exception.Message) }
foreach ($key in 'HKCU:\Software\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\microphone', 'HKCU:\Software\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\microphone\NonPackaged') {
    try { Add-Line ("Mikrofon-Freigabe " + (Split-Path -Leaf $key) + ": " + (Get-ItemProperty $key -ErrorAction Stop).Value) } catch { Add-Line ("Mikrofon-Freigabe " + (Split-Path -Leaf $key) + ": ?") }
}
try {
    $mics = Get-CimInstance Win32_PnPEntity -Filter "PNPClass='AudioEndpoint'" -ErrorAction Stop | Where-Object { $_.Name -match 'Mikro|Micro|Headset|Mic' } | ForEach-Object { $_.Name + ' [' + $_.Status + ']' }
    Add-Line ("Mikrofone: " + ($(if ($mics) { $mics -join ' | ' } else { 'keins gefunden' })))
} catch { Add-Line 'Mikrofone: ?' }
$voiceLog = Join-Path $data 'voice.log'
if (Test-Path $voiceLog) { Add-Line 'voice.log (letzte 25):'; Get-Content $voiceLog -Tail 25 | ForEach-Object { Add-Line ("  " + $_) } } else { Add-Line 'voice.log: fehlt (Hey Clawd noch nie gestartet)' }

Section 'Fehlerprotokoll'
$log = Join-Path $data 'island.log'
Add-Line ("island.log vorhanden=" + (Test-Path $log))
if (Test-Path $log) { Get-Content $log -Tail 40 | ForEach-Object { Add-Line ("  " + $_) } }

$text = $out -join "`r`n"
try {
    Set-Clipboard -Value $text
    Write-Host ''
    Write-Host 'Bericht ist in der Zwischenablage. Bitte im Chat einfuegen (Strg+V).' -ForegroundColor Green
} catch { Write-Host 'Bitte den Text oben markieren und kopieren.' -ForegroundColor Yellow }
