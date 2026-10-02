<#
  Why is there no notch on screen?

  Checks the things that actually go wrong, in the order they go wrong, and
  says what to do about each. Written because the window runs hidden: when
  it dies there is nothing to see, which is the worst possible failure mode
  to debug by guesswork.
#>

Set-StrictMode -Version Latest

$Dir      = Join-Path $env:USERPROFILE '.claude-notch'
$Settings = Join-Path $env:USERPROFILE '.claude\settings.json'
$Log      = Join-Path $Dir 'overlay.log'
$Status   = Join-Path $Dir 'status.txt'
$PidFile  = Join-Path $Dir 'overlay.pid'
$StartupDir = [Environment]::GetFolderPath('Startup')
$Startup    = ''
if ($StartupDir) { $Startup = Join-Path $StartupDir 'Claude Notch.lnk' }

$problems = @()
function Say  { param($Text) Write-Host $Text }
function Good { param($Text) Write-Host "  OK    $Text" -ForegroundColor Green }
function Bad  {
  param($Text, $Fix)
  Write-Host "  PROB  $Text" -ForegroundColor Red
  # One cause, one instruction: repeating "run install.cmd" six times buries
  # the one line that actually matters.
  if ($script:problems -notcontains $Fix) { $script:problems += $Fix }
}

Say ''
Say 'Claude Notch -- check-up'
Say '========================'
Say ''

Say '1. Is it installed?'
$installed = Test-Path $Dir
if (-not $installed) {
  Bad "nothing at $Dir" 'Run install.cmd -- nothing is installed yet.'
} else {
  Good "found $Dir"
  $missing = @()
  foreach ($f in @('notch.ps1','frame.ps1','report.cmd','start-notch.vbs')) {
    if (-not (Test-Path (Join-Path $Dir $f))) { $missing += $f }
  }
  if ($missing.Count -gt 0) {
    Bad ('missing: ' + ($missing -join ', ')) 'Run install.cmd again -- the copy was incomplete.'
    $installed = $false
  } else { Good 'all four pieces are there' }
}

Say ''
Say '2. Did Windows block the files?'
# Files that came out of a zip downloaded from the internet carry a
# Zone.Identifier stream, and Windows refuses to run them. This is the
# single most common reason a working script does nothing at all.
$blocked = @()
foreach ($f in @('notch.ps1','frame.ps1','start-notch.vbs','autostart.ps1')) {
  $p = Join-Path $Dir $f
  if (-not (Test-Path $p)) { continue }
  # -Stream only exists on the Windows filesystem provider, and a missing
  # parameter is a binding error that -ErrorAction cannot swallow.
  try {
    if (Get-Item -Path $p -Stream Zone.Identifier -ErrorAction SilentlyContinue) { $blocked += $f }
  } catch { }
}
if ($blocked.Count -gt 0) {
  Bad ("blocked by Windows: " + ($blocked -join ', ')) "Run: Get-ChildItem '$Dir' | Unblock-File"
} else { Good 'nothing is blocked' }

Say ''
Say '3. Is it running?'
if (-not $installed) { Say '  skipped -- install it first' }
elseif (Test-Path $PidFile) {
  $overlayPid = (Get-Content $PidFile -Raw).Trim()
  $proc = Get-Process -Id $overlayPid -ErrorAction SilentlyContinue
  if ($proc) { Good "running as pid $overlayPid" }
  else { Bad "pid $overlayPid is recorded but no such process" 'It crashed or was killed -- the log below says why.' }
} else {
  Bad 'no overlay.pid, so it is not running' "Start it: $Dir\start-notch.vbs"
}

Say ''
Say '4. What does its log say?'
if (Test-Path $Log) {
  $tail = Get-Content $Log -Tail 12
  foreach ($line in $tail) {
    if ($line -match 'FATAL|failed') { Write-Host "  $line" -ForegroundColor Red }
    else { Write-Host "  $line" }
  }
  if ($tail -match 'FATAL') { $script:problems += 'The log has a FATAL line -- that is the real reason. Send it over.' }
} else {
  Bad 'no overlay.log at all' "It never even started. Run: powershell -NoProfile -ExecutionPolicy Bypass -File `"$Dir\notch.ps1`" -Visible"
}

Say ''
Say '5. Are the hooks wired up?'
if (Test-Path $Settings) {
  $raw = Get-Content $Settings -Raw
  if ($raw -match 'claude-notch') { Good 'settings.json mentions the notch hooks' }
  else { Bad 'settings.json has no notch hooks' "Run install.cmd (it edits settings.json for you)." }
} else {
  Bad "no $Settings" "Run install.cmd."
}

Say ''
Say '6. Is anything reporting?'
if (Test-Path $Status) {
  $age = (Get-Date) - (Get-Item $Status).LastWriteTime
  $state = (Get-Content $Status -Tail 2 | Select-Object -First 1)
  Good "status.txt says '$state', last written $([int]$age.TotalMinutes) min ago"
  if ($age.TotalHours -gt 24) {
    $script:problems += 'Nothing has reported in over a day. Restart Claude Code so it picks up the hooks.'
  }
} else {
  Bad 'no status.txt yet' "Send one prompt in Claude Code, then run this again. Restart Claude Code first if you installed just now."
}

Say ''
Say '7. Autostart'
if (-not $Startup) {
  Say '  cannot tell (no Startup folder on this system)'
} elseif (Test-Path $Startup) {
  Good "on ($Startup)"
} else {
  Say '  off -- turn it on with autostart-on.cmd'
}

Say ''
Say '8. The environment'
Say "  PowerShell : $($PSVersionTable.PSVersion)"
Say "  Screen     : see below"
try {
  Add-Type -AssemblyName System.Windows.Forms -ErrorAction Stop
  $b = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
  Good "WinForms loads; primary screen $($b.Width)x$($b.Height) at $($b.X),$($b.Y)"
} catch {
  Bad "WinForms will not load: $_" 'Without WinForms the overlay cannot draw at all. This is unusual -- send this line over.'
}

Say ''
Say '========================'
if ($problems.Count -eq 0) {
  Say 'Everything checks out. If you still see no strip, it is drawing'
  Say 'somewhere you are not looking: send over the "window shown at"'
  Say 'line from the log above.'
} else {
  Say 'What to do:'
  $i = 1
  foreach ($p in $problems) { Say "  $i. $p"; $i++ }
}
Say ''
