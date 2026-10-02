<#
  Tests for the notch's visual language. Runs anywhere PowerShell runs,
  because frame.ps1 holds no window code.

  Run:  pwsh -NoProfile -File frame.tests.ps1
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
$r = Read-NotchStatus -Path $file
Check 'reads busy' ($r.state -eq 'busy')

Set-Content -Path $file -Value @('waiting', 'approve Bash')
$r = Read-NotchStatus -Path $file
Check 'reads waiting with its reason' ($r.state -eq 'waiting' -and $r.detail -eq 'approve Bash')

Set-Content -Path $file -Value @('  idle  ', '  ')
$r = Read-NotchStatus -Path $file
Check 'trims what the hook wrote' ($r.state -eq 'idle' -and $r.detail -eq '')

Set-Content -Path $file -Value @('nonsense', 'x')
Check 'an unknown state reads as idle, not as itself' ((Read-NotchStatus -Path $file).state -eq 'idle')

Set-Content -Path $file -Value @()
Check 'an empty file reads as idle' ((Read-NotchStatus -Path $file).state -eq 'idle')

Write-Host "Get-NotchFrame"
$busy = Get-NotchFrame -State 'busy' -Detail '' -AgeMs 64000 -ClockMs 0
Check 'working carries a m:ss timer' ($busy.label -eq 'WORKING  1:04') $busy.label
Check 'working is solid' ($busy.solid)

$dots = 0..3 | ForEach-Object { (Get-NotchFrame -State 'busy' -Detail '' -AgeMs 0 -ClockMs ($_ * 500)).dot }
Check 'the working dot has a heartbeat' (($dots | Select-Object -Unique).Count -gt 1)

$w = Get-NotchFrame -State 'waiting' -Detail 'approve Bash' -AgeMs 0 -ClockMs 0
Check 'waiting names what it wants' ($w.label -like '*approve Bash*') $w.label
$wa = (Get-NotchFrame -State 'waiting' -Detail '' -AgeMs 0 -ClockMs 0).dot
$wb = (Get-NotchFrame -State 'waiting' -Detail '' -AgeMs 0 -ClockMs 500).dot
Check 'waiting blinks' ($wa -ne $wb)

$fresh = Get-NotchFrame -State 'idle' -Detail '' -AgeMs 0 -ClockMs 0
$settled = Get-NotchFrame -State 'idle' -Detail '' -AgeMs 9000 -ClockMs 0
Check 'a fresh finish flashes solid' ($fresh.solid)
Check 'a settled finish is an outline' (-not $settled.solid)
Check 'settled reads READY' ($settled.label -eq 'READY')

$a = Get-NotchFrame -State 'idle' -Detail '' -AgeMs 9000 -ClockMs 0
$b = Get-NotchFrame -State 'idle' -Detail '' -AgeMs 9000 -ClockMs 7777
Check 'a settled notch does not move' ($a.dot -eq $b.dot -and $a.label -eq $b.label -and $a.solid -eq $b.solid)

$neg = Get-NotchFrame -State 'busy' -Detail '' -AgeMs 0 -ClockMs -1500
Check 'a clock before zero still picks a real dot' ($null -ne $neg.dot)

foreach ($state in @('busy','waiting','idle')) {
  $f = Get-NotchFrame -State $state -Detail '' -AgeMs 1000 -ClockMs 1000
  Check "$state has a colour" ($f.colour.Count -eq 3)
}

Remove-Item -Recurse -Force $tmp
Write-Host ""
Write-Host "$script:Pass passed, $script:Fail failed"
if ($script:Fail -gt 0) { exit 1 }
exit 0
