<#
  The notch's visual language, as pure functions of (status, clock).

  Kept apart from notch.ps1 on purpose: this file loads without WinForms,
  so it can be exercised anywhere, and the window script stays a thin shell
  around it.
#>

$script:NotchPulseMs = 500
$script:NotchFlareMs = 2500
$script:NotchBusyDots = @([char]0x00B7, [char]0x2022, [char]0x25CF, [char]0x2022)
$script:NotchDotFilled = [char]0x25CF
$script:NotchDotHollow = [char]0x25CB

$script:NotchColours = @{
  busy    = @(217, 119,  60)
  waiting = @( 87, 105, 247)
  idle    = @( 60, 179, 113)
}

<#
  Reads the two-line file the hooks write. Anything unreadable or
  unrecognised reads as idle rather than throwing: the overlay must never
  die because a hook was mid-write.
#>
function Read-NotchStatus {
  param([string]$Path)
  $fallback = @{ state = 'idle'; detail = '' }
  if (-not (Test-Path $Path)) { return $fallback }
  try {
    $lines = @(Get-Content -Path $Path -ErrorAction Stop)
  } catch {
    return $null   # mid-write; the caller keeps its last good reading
  }
  $state = 'idle'
  if ($lines.Count -ge 1 -and $null -ne $lines[0]) { $state = ([string]$lines[0]).Trim() }
  $detail = ''
  if ($lines.Count -ge 2 -and $null -ne $lines[1]) { $detail = ([string]$lines[1]).Trim() }
  if (@('busy','waiting','idle') -notcontains $state) { return $fallback }
  return @{ state = $state; detail = $detail }
}

<#
  What to draw, given the state, how long it has held, and the clock phase.

  Motion is the signal: busy and waiting move, a settled idle does not. A
  notch that has gone still is itself the "Claude is done" message.
#>
function Get-NotchFrame {
  param(
    [string]$State,
    [string]$Detail,
    [double]$AgeMs,
    [double]$ClockMs
  )
  $step = [int][Math]::Floor($ClockMs / $script:NotchPulseMs)
  switch ($State) {
    'busy' {
      $total   = [int][Math]::Floor($AgeMs / 1000)
      $minutes = [int][Math]::Floor($total / 60)
      $seconds = $total % 60
      return @{
        dot    = $script:NotchBusyDots[(($step % 4) + 4) % 4]
        label  = ('WORKING  {0}:{1:d2}' -f $minutes, $seconds)
        colour = $script:NotchColours['busy']
        solid  = $true
      }
    }
    'waiting' {
      $dot = $script:NotchDotHollow
      if ((($step % 2) + 2) % 2 -eq 0) { $dot = $script:NotchDotFilled }
      $label = 'NEEDS YOU'
      if ($Detail) { $label = "NEEDS YOU - $Detail" }
      return @{ dot = $dot; label = $label; colour = $script:NotchColours['waiting']; solid = $true }
    }
    default {
      # One solid flash on finishing, then a thin outline that never moves.
      return @{
        dot    = $script:NotchDotFilled
        label  = 'READY'
        colour = $script:NotchColours['idle']
        solid  = ($AgeMs -lt $script:NotchFlareMs)
      }
    }
  }
}
