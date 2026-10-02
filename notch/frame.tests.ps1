<#
  Tests for the notch's visual language. Runs anywhere PowerShell runs,
  because frame.ps1 holds no window code.

  Run:  powershell -NoProfile -ExecutionPolicy Bypass -File frame.tests.ps1
#>
Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot 'frame.ps1')

$script:Pass = 0
$script:Fail = 0
function Check {
  param([string]$Name, [bool]$Condition, [string]$Saw = '')
  if ($Condition) { $script:Pass++; Write-Host "  pass  $Name" }
  else { $script:Fail++; Write-Host "  FAIL  $Name $Saw" -ForegroundColor Red }
}

$tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("notch-test-" + [guid]::NewGuid())
New-Item -ItemType Directory -Path $tmp | Out-Null
$file = Join-Path $tmp 'status.txt'

Write-Host "Read-NotchStatus"
Check 'a missing file reads as idle' ((Read-NotchStatus -Path $file).state -eq 'idle')
Set-Content -Path $file -Value @('busy', '')
Check 'reads busy' ((Read-NotchStatus -Path $file).state -eq 'busy')
Set-Content -Path $file -Value @('waiting', 'approve Bash')
$r = Read-NotchStatus -Path $file
Check 'reads waiting with its reason' ($r.state -eq 'waiting' -and $r.detail -eq 'approve Bash')
Set-Content -Path $file -Value @('  idle  ', '  ')
$r = Read-NotchStatus -Path $file
Check 'trims what the hook wrote' ($r.state -eq 'idle' -and $r.detail -eq '')
Set-Content -Path $file -Value @('nonsense', 'x')
Check 'an unknown state reads as idle' ((Read-NotchStatus -Path $file).state -eq 'idle')
Set-Content -Path $file -Value @()
Check 'an empty file reads as idle' ((Read-NotchStatus -Path $file).state -eq 'idle')

Write-Host "The traffic light"
$lamps = Get-NotchLamps
Check 'has three lamps' ($lamps.Count -eq 3)
Check 'runs red, amber, green from the top' (
  $lamps[0].key -eq 'waiting' -and $lamps[1].key -eq 'busy' -and $lamps[2].key -eq 'ready')
Check 'red really is the reddest' (
  $lamps[0].rgb[0] -gt $lamps[0].rgb[1] -and $lamps[0].rgb[0] -gt $lamps[0].rgb[2])
Check 'green really is the greenest' (
  $lamps[2].rgb[1] -gt $lamps[2].rgb[0] -and $lamps[2].rgb[1] -gt $lamps[2].rgb[2])

foreach ($pair in @(@('busy','busy'), @('waiting','waiting'), @('idle','ready'))) {
  $f = Get-NotchFrame -State $pair[0] -Detail '' -AgeMs 1000 -ClockMs 0
  Check "$($pair[0]) lights the $($pair[1]) lamp" ($f.key -eq $pair[1]) $f.key
}

Write-Host "Get-NotchFrame"
$busy = Get-NotchFrame -State 'busy' -Detail '' -AgeMs 64000 -ClockMs 0
Check 'working carries a m:ss timer' ($busy.short -eq 'ARBEITET  1:04') $busy.short
Check 'working is solid' ($busy.solid)
Check 'working pulses' ($busy.pulsing)

$dots = 0..3 | ForEach-Object { (Get-NotchFrame -State 'busy' -Detail '' -AgeMs 0 -ClockMs ($_ * 520)).dot }
Check 'the working dot has a heartbeat' (($dots | Select-Object -Unique).Count -gt 1)

$w = Get-NotchFrame -State 'waiting' -Detail 'approve Bash' -AgeMs 0 -ClockMs 0
Check 'waiting says so in German' ($w.label -eq 'BRAUCHT DICH') $w.label
Check 'waiting keeps the reason' ($w.detail -eq 'approve Bash')
Check 'waiting pulses' ($w.pulsing)

$fresh   = Get-NotchFrame -State 'idle' -Detail '' -AgeMs 0 -ClockMs 0
$settled = Get-NotchFrame -State 'idle' -Detail '' -AgeMs 9000 -ClockMs 0
Check 'a fresh finish flashes solid' ($fresh.solid)
Check 'a settled finish is an outline' (-not $settled.solid)
Check 'settled reads FERTIG' ($settled.label -eq 'FERTIG')
Check 'a settled notch does not pulse' (-not $settled.pulsing)

$a = Get-NotchFrame -State 'idle' -Detail '' -AgeMs 9000 -ClockMs 0
$b = Get-NotchFrame -State 'idle' -Detail '' -AgeMs 9000 -ClockMs 7777
Check 'a settled notch does not move' ($a.dot -eq $b.dot -and $a.short -eq $b.short)
$neg = Get-NotchFrame -State 'busy' -Detail '' -AgeMs 0 -ClockMs -1500
Check 'a clock before zero still picks a real dot' ($null -ne $neg.dot)

Write-Host "Opening and closing"
Check 'starts shut' ((Get-NotchOpenness -Hovered $false -SinceMs 0 -From 0) -eq 0)
Check 'ends fully open' ((Get-NotchOpenness -Hovered $true -SinceMs 9999 -From 0) -eq 1)
$mid = Get-NotchOpenness -Hovered $true -SinceMs 90 -From 0
Check 'is part-way open part-way through' ($mid -gt 0 -and $mid -lt 1) $mid
Check 'eases out, so it is past halfway at the halfway mark' ($mid -gt 0.5) $mid
Check 'shuts again when the pointer leaves' ((Get-NotchOpenness -Hovered $false -SinceMs 9999 -From 1) -eq 0)
$back = Get-NotchOpenness -Hovered $false -SinceMs 40 -From 1
Check 'closing starts from where opening got to' ($back -lt 1 -and $back -gt 0) $back

$steps = 0..10 | ForEach-Object { Get-NotchOpenness -Hovered $true -SinceMs ($_ * 19) -From 0 }
$monotone = $true
for ($i = 1; $i -lt $steps.Count; $i++) { if ($steps[$i] -lt $steps[$i-1]) { $monotone = $false } }
Check 'it only ever opens further, never jitters back' $monotone

Write-Host "Geometry"
$shut = Get-NotchGeometry -Openness 0 -CollapsedWidth 170
$open = Get-NotchGeometry -Openness 1 -CollapsedWidth 170
Check 'shut is one thin row' ($shut.height -eq 24) $shut.height
Check 'open is a panel' ($open.height -gt 90) $open.height
Check 'it grows wider too' ($open.width -gt $shut.width)
Check 'it never shrinks below the collapsed width' (
  (Get-NotchGeometry -Openness 0 -CollapsedWidth 170).width -ge 170)
Check 'a tiny label still gets a usable pill' (
  (Get-NotchGeometry -Openness 0 -CollapsedWidth 10).width -ge 128)

$heights = 0..10 | ForEach-Object { (Get-NotchGeometry -Openness ($_ / 10) -CollapsedWidth 170).height }
$grows = $true
for ($i = 1; $i -lt $heights.Count; $i++) { if ($heights[$i] -lt $heights[$i-1]) { $grows = $false } }
Check 'height only grows as it opens' $grows

Write-Host "How hard it works"
Check 'a settled, untouched notch is lazy' ((Get-NotchInterval -Hovered $false -Animating $false -Pulsing $false) -ge 200)
Check 'pointing at it makes it smooth' ((Get-NotchInterval -Hovered $true -Animating $false -Pulsing $false) -le 30)
Check 'animating makes it smooth' ((Get-NotchInterval -Hovered $false -Animating $true -Pulsing $false) -le 30)
Check 'a pulse is in between' (
  (Get-NotchInterval -Hovered $false -Animating $false -Pulsing $true) -lt 200 -and
  (Get-NotchInterval -Hovered $false -Animating $false -Pulsing $true) -gt 30)

Remove-Item -Recurse -Force $tmp

Write-Host "Every script stays pipe-safe"
# A BOM at the front of a script fetched with irm and piped to iex stops
# the parser seeing the leading <# as a comment opener: the header is then
# read as code, one apostrophe inside it opens a string that never closes,
# and the error surfaces a hundred lines later. That shipped once. These
# checks are what stop it shipping again.
foreach ($script in (Get-ChildItem -Path $PSScriptRoot -Filter '*.ps1')) {
  $bytes = [System.IO.File]::ReadAllBytes($script.FullName)
  $hasBom = ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF)
  Check "$($script.Name) has no BOM" (-not $hasBom)
  $nonAscii = @($bytes | Where-Object { $_ -gt 127 }).Count
  Check "$($script.Name) is plain ASCII" ($nonAscii -eq 0) "saw $nonAscii byte(s)"
}

$bootstrap = Join-Path $PSScriptRoot 'bootstrap.ps1'
if (Test-Path $bootstrap) {
  $errors = $null
  [void][System.Management.Automation.Language.Parser]::ParseInput(
    (Get-Content $bootstrap -Raw), [ref]$null, [ref]$errors)
  Check 'bootstrap.ps1 parses the way iex parses it' ($errors.Count -eq 0)
}

Write-Host ""
Write-Host "$script:Pass passed, $script:Fail failed"
if ($script:Fail -gt 0) { exit 1 }
exit 0
