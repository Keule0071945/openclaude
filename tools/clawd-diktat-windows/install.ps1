# Clawd Diktat - Installation
#
#   install.ps1              alles installieren (Programm, Spracherkennung, Modell)
#   install.ps1 -EngineOnly  nur die Spracherkennung (whisper.cpp) neu holen / reparieren
#   install.ps1 -ModelOnly   ein (weiteres) Sprachmodell herunterladen
#
# Bewusst nur ASCII: Windows PowerShell 5 liest Skripte ohne BOM als ANSI.

param([switch]$EngineOnly, [switch]$ModelOnly, [string]$Model = '')

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
$root = Join-Path $env:LOCALAPPDATA 'ClawdDiktat'
$engine = Join-Path $root 'engine'
$models = Join-Path $root 'models'
New-Item -ItemType Directory -Force -Path $root, $engine, $models | Out-Null

function Say($text, $color = 'White') { Write-Host ('  ' + $text) -ForegroundColor $color }

function Download($url, $file) {
    $curl = Join-Path $env:SystemRoot 'System32\curl.exe'
    if (Test-Path $curl) {
        & $curl -L --fail --retry 3 --progress-bar -o $file $url
        if ($LASTEXITCODE -eq 0 -and (Test-Path $file)) { return $true }
    }
    try {
        $ProgressPreference = 'SilentlyContinue'
        Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $file -Headers @{ 'User-Agent' = 'ClawdDiktat' }
        return (Test-Path $file)
    } catch { return $false }
}

function Test-Engine {
    $exe = @('whisper-cli.exe', 'main.exe') | ForEach-Object { Join-Path $engine $_ } | Where-Object { Test-Path $_ } | Select-Object -First 1
    if (-not $exe) { return 'missing' }
    $p = Start-Process -FilePath $exe -ArgumentList '--help' -NoNewWindow -PassThru -Wait -RedirectStandardOutput (Join-Path $env:TEMP 'cd-out.txt') -RedirectStandardError (Join-Path $env:TEMP 'cd-err.txt')
    if ($p.ExitCode -eq -1073741515) { return 'vcredist' }
    return 'ok'
}

function Install-Engine {
    Say 'Lade die Spracherkennung (whisper.cpp) ...'
    $urls = @()
    try {
        $rel = Invoke-RestMethod -Uri 'https://api.github.com/repos/ggml-org/whisper.cpp/releases/latest' -Headers @{ 'User-Agent' = 'ClawdDiktat' }
        $asset = $rel.assets | Where-Object { $_.name -eq 'whisper-bin-x64.zip' } | Select-Object -First 1
        if (-not $asset) { $asset = $rel.assets | Where-Object { $_.name -match '^whisper-bin-x64.*\.zip$' } | Select-Object -First 1 }
        if ($asset) { $urls += $asset.browser_download_url; Say ('Version ' + $rel.tag_name) 'DarkGray' }
    } catch { Say 'GitHub-Abfrage ging nicht, nehme eine bekannte Version.' 'DarkGray' }
    foreach ($v in 'v1.7.6', 'v1.7.5', 'v1.7.4') { $urls += "https://github.com/ggml-org/whisper.cpp/releases/download/$v/whisper-bin-x64.zip" }

    $zip = Join-Path $env:TEMP 'clawd-whisper.zip'
    $ok = $false
    foreach ($u in $urls) {
        Remove-Item $zip -ErrorAction SilentlyContinue
        if (Download $u $zip) { $ok = $true; break }
    }
    if (-not $ok) { throw 'Die Spracherkennung konnte nicht heruntergeladen werden. Internetverbindung pruefen und nochmal versuchen.' }

    $tmp = Join-Path $env:TEMP ('clawd-whisper-' + [Guid]::NewGuid().ToString('N'))
    Expand-Archive -Path $zip -DestinationPath $tmp -Force
    $exe = Get-ChildItem -Path $tmp -Recurse -Include 'whisper-cli.exe' | Select-Object -First 1
    if (-not $exe) { $exe = Get-ChildItem -Path $tmp -Recurse -Include 'main.exe' | Select-Object -First 1 }
    if (-not $exe) { throw 'Im Download war keine whisper-cli.exe.' }
    Get-Process -Name 'whisper-cli', 'main' -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "$engine*" } | Stop-Process -Force -ErrorAction SilentlyContinue
    Get-ChildItem -Path $exe.DirectoryName -File | Where-Object { $_.Extension -in '.exe', '.dll' } | Copy-Item -Destination $engine -Force
    Remove-Item -Recurse -Force $tmp, $zip -ErrorAction SilentlyContinue

    $state = Test-Engine
    if ($state -eq 'vcredist') {
        Say 'Es fehlt die Microsoft Visual C++ Laufzeit - ich installiere sie (Windows fragt evtl. nach Erlaubnis) ...' 'Yellow'
        $vc = Join-Path $env:TEMP 'vc_redist.x64.exe'
        if (Download 'https://aka.ms/vs/17/release/vc_redist.x64.exe' $vc) {
            Start-Process -FilePath $vc -ArgumentList '/install', '/passive', '/norestart' -Wait
            $state = Test-Engine
        }
    }
    if ($state -eq 'ok') { Say 'Spracherkennung bereit.' 'Green' }
    else { Say 'Die Spracherkennung startet noch nicht. Installiere "Microsoft Visual C++ Redistributable x64" und starte dann -EngineOnly erneut.' 'Red' }
}

function Install-Model {
    $choices = @(
        @{ Key = '1'; File = 'ggml-base.bin'; Name = 'Schnell      (base,  ca. 150 MB) - fuer aeltere PCs' },
        @{ Key = '2'; File = 'ggml-small.bin'; Name = 'Empfohlen    (small, ca. 490 MB) - gute Erkennung, flott' },
        @{ Key = '3'; File = 'ggml-large-v3-turbo-q5_0.bin'; Name = 'Beste        (large-v3-turbo, ca. 550 MB) - fuer schnelle PCs' }
    )
    $pick = $choices | Where-Object { $_.File -eq $Model -or $_.Key -eq $Model } | Select-Object -First 1
    if (-not $pick) {
        Write-Host ''
        Say 'Welches Sprachmodell soll ich laden?'
        foreach ($c in $choices) { Say ('  [' + $c.Key + '] ' + $c.Name) }
        $answer = Read-Host '  Auswahl (Enter = 2)'
        if ([string]::IsNullOrWhiteSpace($answer)) { $answer = '2' }
        $pick = $choices | Where-Object { $_.Key -eq $answer.Trim() } | Select-Object -First 1
        if (-not $pick) { $pick = $choices[1] }
    }
    $file = Join-Path $models $pick.File
    if ((Test-Path $file) -and (Get-Item $file).Length -gt 10MB) { Say ($pick.File + ' ist schon da.') 'Green'; return }
    Say ('Lade ' + $pick.File + ' ... (das dauert je nach Internet ein paar Minuten)')
    $part = $file + '.part'
    if (-not (Download ('https://huggingface.co/ggerganov/whisper.cpp/resolve/main/' + $pick.File) $part)) { throw 'Das Modell konnte nicht heruntergeladen werden.' }
    if ((Get-Item $part).Length -lt 10MB) { Remove-Item $part; throw 'Der Modell-Download ist unvollstaendig.' }
    Move-Item $part $file -Force
    Say 'Modell bereit.' 'Green'
}

Write-Host ''
Say 'Clawd Diktat - Sprache zu Text fuer Claude' 'Cyan'
Write-Host ''

try {
    if (-not $EngineOnly -and -not $ModelOnly) {
        Get-Process -Name 'ClawdDiktat' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 400
        foreach ($f in 'ClawdDiktat.exe', 'install.ps1', 'uninstall.ps1', 'uninstall.cmd') {
            $src = Join-Path $PSScriptRoot $f
            if (Test-Path $src) { Copy-Item $src $root -Force }
        }
        $ws = New-Object -ComObject WScript.Shell
        $lnk = $ws.CreateShortcut((Join-Path ([Environment]::GetFolderPath('Programs')) 'Clawd Diktat.lnk'))
        $lnk.TargetPath = Join-Path $root 'ClawdDiktat.exe'
        $lnk.WorkingDirectory = $root
        $lnk.Description = 'Sprache zu Text fuer Claude'
        $lnk.Save()
        Set-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -Name 'ClawdDiktat' -Value ('"' + (Join-Path $root 'ClawdDiktat.exe') + '"')
        Say 'Programm installiert (startet ab jetzt mit Windows).' 'Green'
    }
    if (-not $ModelOnly -and ($EngineOnly -or (Test-Engine) -ne 'ok')) { Install-Engine }
    $haveModel = @(Get-ChildItem -Path $models -Filter 'ggml-*.bin' -ErrorAction SilentlyContinue | Where-Object { $_.Length -gt 10MB }).Count -gt 0
    if ($ModelOnly -or -not $haveModel) { Install-Model }

    if (-not $EngineOnly -and -not $ModelOnly) {
        Start-Process -FilePath (Join-Path $root 'ClawdDiktat.exe')
        Write-Host ''
        Say 'Fertig! Clawd sitzt jetzt unten rechts neben der Uhr.' 'Green'
        Say 'Halte F9 gedrueckt, sprich, und lass los - der Text landet dort, wo dein Cursor ist.'
        Say 'Sag am Ende "absenden", dann drueckt Clawd Diktat auch gleich Enter.'
    }
} catch {
    Write-Host ''
    Say ('Fehler: ' + $_.Exception.Message) 'Red'
}
Write-Host ''
Read-Host '  Enter zum Schliessen'
