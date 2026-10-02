<#
  Claude Notch -- download and install, in one line.

      irm https://raw.githubusercontent.com/Keule0071945/openclaude/<ref>/notch/bootstrap.ps1 | iex

  Fetches every piece straight into %USERPROFILE%\.claude-notch, wires up
  the Claude Code hooks, turns on autostart and starts the overlay. Nothing
  is left in your Downloads folder, and nothing arrives carrying the mark
  Windows puts on downloads, because each file is written by this script
  rather than unpacked from an archive.

  -Ref     which branch or commit to take the files from
  -NoStart install everything but do not start the overlay
#>
param(
  [string]$Ref = 'claude/pixel-art-boss-game-ew4o9e',
  [switch]$NoStart
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Some Windows builds still default to TLS 1.0, which GitHub refuses.
try {
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
} catch { }

$Repo  = 'Keule0071945/openclaude'
$Base  = "https://raw.githubusercontent.com/$Repo/$Ref/notch"
$Dest  = Join-Path $env:USERPROFILE '.claude-notch'

$Files = @(
  'notch.ps1', 'frame.ps1', 'frame.tests.ps1',
  'report.cmd', 'start-notch.vbs', 'stop-notch.cmd',
  'doctor.ps1', 'doctor.cmd',
  'autostart.ps1', 'autostart-on.cmd', 'autostart-off.cmd',
  'install-hooks.ps1', 'README.md'
)

Write-Host ''
Write-Host 'Claude Notch' -ForegroundColor Cyan
Write-Host "  from $Repo @ $Ref"
Write-Host "  into $Dest"
Write-Host ''

<#
  Git stores these files with LF and the .gitattributes turns them into
  CRLF only on checkout -- raw.githubusercontent serves the stored blob,
  so everything arrives LF-only. A .cmd with LF endings makes cmd.exe
  misread its own lines and a .vbs with LF fails outright, so each file is
  put back the way Windows needs it after it lands.

  No BOM is written: every script here is plain ASCII, so a BOM buys
  nothing -- and it breaks `irm | iex`, because the parser then fails to
  see the leading <# as a comment opener and reads the whole header as
  code. That is what made the first version of this file unusable.
#>
function Repair-WindowsText {
  param([string]$Path)
  $bytes = [System.IO.File]::ReadAllBytes($Path)
  if ($bytes.Length -eq 0) { return }
  $text = [System.Text.Encoding]::UTF8.GetString($bytes)
  if ($text.Length -gt 0 -and $text[0] -eq [char]0xFEFF) { $text = $text.Substring(1) }
  $text = $text -replace "`r`n", "`n"
  $text = $text -replace "`n", "`r`n"
  $encoding = New-Object System.Text.UTF8Encoding $false
  [System.IO.File]::WriteAllText($Path, $text, $encoding)
}

if (-not (Test-Path $Dest)) { New-Item -ItemType Directory -Path $Dest -Force | Out-Null }

$failed = @()
foreach ($file in $Files) {
  $url = "$Base/$file"
  try {
    # -OutFile, not $response.Content: Content hands back a decoded string
    # for text, and these files must land byte for byte -- the .ps1 files
    # carry a BOM on purpose (Windows PowerShell 5.1 needs it to read the
    # box-drawing characters) and the .cmd files need their CRLF endings.
    $target = Join-Path $Dest $file
    Invoke-WebRequest -Uri $url -UseBasicParsing -OutFile $target -ErrorAction Stop
    Repair-WindowsText -Path $target
    Write-Host ("  got  {0}" -f $file) -ForegroundColor Green
  } catch {
    $failed += $file
    Write-Host ("  FAIL {0}  --  {1}" -f $file, $_.Exception.Message) -ForegroundColor Red
  }
}

if ($failed.Count -gt 0) {
  Write-Host ''
  Write-Host "Could not fetch: $($failed -join ', ')" -ForegroundColor Red
  Write-Host 'Check the -Ref you passed, and that you have internet access.'
  return
}

Write-Host ''
Write-Host 'Wiring the Claude Code hooks' -ForegroundColor Cyan
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Dest 'install-hooks.ps1')
if ($LASTEXITCODE -ne 0) {
  Write-Host 'Hook setup failed; the overlay would sit on READY forever.' -ForegroundColor Red
  return
}

Write-Host ''
Write-Host 'Turning on autostart' -ForegroundColor Cyan
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Dest 'autostart.ps1') -Mode on

if (-not $NoStart) {
  Write-Host ''
  # Stop whatever is already up: re-running this must replace the old
  # overlay, not leave two of them stacked on the same row of pixels.
  $oldPid = Join-Path $Dest 'overlay.pid'
  if (Test-Path $oldPid) {
    try {
      $was = (Get-Content $oldPid -Raw).Trim()
      Stop-Process -Id $was -Force -ErrorAction SilentlyContinue
      Remove-Item $oldPid -Force -ErrorAction SilentlyContinue
      Write-Host "Stopped the previous overlay (pid $was)" -ForegroundColor DarkGray
    } catch { }
  }
  Write-Host 'Starting the overlay' -ForegroundColor Cyan
  & (Join-Path $env:WINDIR 'System32\wscript.exe') (Join-Path $Dest 'start-notch.vbs')
  Start-Sleep -Seconds 2
}

Write-Host ''
Write-Host '===========================================================' -ForegroundColor DarkGray
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Dest 'doctor.ps1')
Write-Host '===========================================================' -ForegroundColor DarkGray
Write-Host ''
Write-Host 'Restart any running Claude Code session so it picks up the hooks.' -ForegroundColor Yellow
Write-Host ''
Write-Host "  Check up : $Dest\doctor.cmd"
Write-Host "  Stop     : $Dest\stop-notch.cmd"
Write-Host ''
