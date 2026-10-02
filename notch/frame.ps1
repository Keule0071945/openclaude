<#
  The notch's visual language, as pure functions of (status, clock, hover).

  Kept apart from notch.ps1 on purpose: this file loads without WinForms,
  so it can be exercised anywhere, and the window script stays a thin shell
  around it.

  Everything here is plain ASCII with no BOM. That is not fussiness: a BOM
  makes `irm | iex` misread the leading block comment as code, which broke
  the installer once already. frame.tests.ps1 enforces it.
#>

# --- the traffic light ---------------------------------------------------
# Top to bottom like a real one: red demands something, amber says wait,
# green says go. The lit lamp is the session's state.
$script:NotchLamps = @(
  @{ key = 'waiting'; rgb = @(248,  81,  73); label = 'BRAUCHT DICH'; hint = 'wartet auf dich' }
  @{ key = 'busy';    rgb = @(226, 160,  40); label = 'ARBEITET';     hint = 'laeuft' }
  @{ key = 'ready';   rgb = @( 63, 185,  80); label = 'FERTIG';       hint = 'du bist dran' }
)

# status.txt speaks the hooks' language; the lamps speak the user's.
$script:NotchStateToLamp = @{ waiting = 'waiting'; busy = 'busy'; idle = 'ready' }

$script:NotchPulseMs   = 520
$script:NotchFlareMs   = 2600
$script:NotchExpandMs  = 190
$script:NotchCollapseMs= 150

$script:NotchCollapsedH = 24
$script:NotchExpandedH  = 104
$script:NotchExpandedW  = 300
$script:NotchMinW       = 128

$script:NotchBusyDots = @([char]0x00B7, [char]0x2022, [char]0x25CF, [char]0x2022)
$script:NotchDotFilled = [char]0x25CF
$script:NotchDotHollow = [char]0x25CB

function Get-NotchLamps { return $script:NotchLamps }

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

function Get-NotchEase {
  param([double]$T)
  $t = [Math]::Max(0.0, [Math]::Min(1.0, $T))
  # Ease-out cubic: fast out of the gate, settles softly -- the shape that
  # reads as something opening rather than snapping.
  return 1.0 - [Math]::Pow(1.0 - $t, 3)
}

function Format-NotchElapsed {
  param([double]$Ms)
  $total = [int][Math]::Floor([Math]::Max(0, $Ms) / 1000)
  $minutes = [int][Math]::Floor($total / 60)
  $seconds = $total % 60
  return ('{0}:{1:d2}' -f $minutes, $seconds)
}

<#
  What to draw, given the state, how long it has held, and the clock phase.

  Motion is the signal: busy and waiting move, a settled green does not. A
  notch that has gone still is itself the "Claude is done" message.
#>
function Get-NotchFrame {
  param(
    [string]$State,
    [string]$Detail,
    [double]$AgeMs,
    [double]$ClockMs,
    [int]$Tools = 0
  )
  $lampKey = 'ready'
  if ($script:NotchStateToLamp.ContainsKey($State)) { $lampKey = $script:NotchStateToLamp[$State] }
  $lamp = $script:NotchLamps | Where-Object { $_.key -eq $lampKey } | Select-Object -First 1

  $step = [int][Math]::Floor($ClockMs / $script:NotchPulseMs)
  $dot  = $script:NotchDotFilled
  $pulsing = $false

  switch ($lampKey) {
    'busy' {
      $dot = $script:NotchBusyDots[(($step % 4) + 4) % 4]
      $pulsing = $true
    }
    'waiting' {
      if ((($step % 2) + 2) % 2 -ne 0) { $dot = $script:NotchDotHollow }
      $pulsing = $true
    }
  }

  $short = $lamp.label
  if ($lampKey -eq 'busy') { $short = 'ARBEITET  ' + (Format-NotchElapsed $AgeMs) }

  return @{
    key     = $lampKey
    label   = $lamp.label
    hint    = $lamp.hint
    short   = $short
    rgb     = $lamp.rgb
    dot     = $dot
    pulsing = $pulsing
    detail  = $Detail
    tools   = $Tools
    elapsed = (Format-NotchElapsed $AgeMs)
    # Green rests as an outline once its arrival flash has burned down.
    solid   = ($lampKey -ne 'ready') -or ($AgeMs -lt $script:NotchFlareMs)
  }
}

<#
  How far open the panel is, 0 collapsed to 1 fully open, given how long
  the pointer has been over it (or away from it).
#>
function Get-NotchOpenness {
  param(
    [bool]$Hovered,
    [double]$SinceMs,
    [double]$From = 0.0
  )
  $duration = if ($Hovered) { $script:NotchExpandMs } else { $script:NotchCollapseMs }
  $target   = if ($Hovered) { 1.0 } else { 0.0 }
  if ($SinceMs -ge $duration) { return $target }
  $eased = Get-NotchEase ($SinceMs / $duration)
  return $From + ($target - $From) * $eased
}

<#
  The window's size at a given openness. Width and height both grow, so it
  opens downward and outward -- the shape the person asked for.
#>
function Get-NotchGeometry {
  param(
    [double]$Openness,
    [int]$CollapsedWidth
  )
  $o = [Math]::Max(0.0, [Math]::Min(1.0, $Openness))
  $w0 = [Math]::Max($script:NotchMinW, $CollapsedWidth)
  $w  = [int][Math]::Round($w0 + ($script:NotchExpandedW - $w0) * $o)
  $h  = [int][Math]::Round($script:NotchCollapsedH + ($script:NotchExpandedH - $script:NotchCollapsedH) * $o)
  if ($w -lt $w0) { $w = $w0 }
  return @{ width = $w; height = $h; openness = $o }
}

<#
  How often the window wants repainting. Fast while it is moving or the
  pointer is on it, lazy while it sits still -- an untouched green notch
  should cost nothing.
#>
function Get-NotchInterval {
  param([bool]$Hovered, [bool]$Animating, [bool]$Pulsing)
  if ($Hovered -or $Animating) { return 25 }
  if ($Pulsing) { return 130 }
  return 250
}
