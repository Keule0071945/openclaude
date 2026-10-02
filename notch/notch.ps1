<#
  Claude Notch -- a strip at the top of the screen, over every app, that
  says whether Claude is working, waiting for you, or done.

  Collapsed it is a thin pill with one traffic-light lamp. Point at it and
  it opens downward into the full light: red wants something from you,
  amber is working, green is your turn -- plus how long, and what it is
  waiting for.

  It reads one small file the Claude Code hooks write (see report.cmd), so
  it needs no connection to Claude and survives restarts and several
  terminals at once.

  Hover without giving up click-through: the window keeps
  WS_EX_TRANSPARENT, so clicks always reach whatever is underneath, and
  the pointer is found by asking Windows where it is instead of waiting
  for mouse events the window can never receive.

  Run with -Visible to keep a console and watch errors live; otherwise
  everything lands in overlay.log, because a hidden window that dies
  silently is impossible to diagnose.
#>
param(
  [switch]$Visible
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$StateDir  = Join-Path $env:USERPROFILE '.claude-notch'
$StateFile = Join-Path $StateDir 'status.txt'
$PidFile   = Join-Path $StateDir 'overlay.pid'
$StopFile  = Join-Path $StateDir 'stop'
$LogFile   = Join-Path $StateDir 'overlay.log'

if (-not (Test-Path $StateDir)) { New-Item -ItemType Directory -Path $StateDir -Force | Out-Null }

function Write-Log {
  param([string]$Message)
  $line = '{0}  {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message
  try { Add-Content -Path $LogFile -Value $line -Encoding UTF8 } catch { }
  if ($Visible) { Write-Host $line }
}

try {
  Write-Log "starting (pid $PID, PowerShell $($PSVersionTable.PSVersion))"

  Add-Type -AssemblyName System.Windows.Forms
  Add-Type -AssemblyName System.Drawing

  Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class NotchWin {
  [StructLayout(LayoutKind.Sequential)]
  public struct POINT { public int X; public int Y; }
  [DllImport("user32.dll", SetLastError = true)]
  public static extern int GetWindowLong(IntPtr hWnd, int nIndex);
  [DllImport("user32.dll", SetLastError = true)]
  public static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);
  [DllImport("user32.dll")]
  public static extern bool GetCursorPos(out POINT p);
  public const int GWL_EXSTYLE       = -20;
  public const int WS_EX_TRANSPARENT = 0x00000020;
  public const int WS_EX_NOACTIVATE  = 0x08000000;
  public const int WS_EX_TOOLWINDOW  = 0x00000080;
}
"@

  . (Join-Path $PSScriptRoot 'frame.ps1')

  if (Test-Path $StopFile) { Remove-Item $StopFile -Force }
  Set-Content -Path $PidFile -Value $PID -Encoding ASCII

  # --- palette ----------------------------------------------------------
  $Panel    = [System.Drawing.Color]::FromArgb(21, 23, 28)
  $PanelTop = [System.Drawing.Color]::FromArgb(28, 31, 38)
  $Ink      = [System.Drawing.Color]::FromArgb(236, 238, 243)
  $InkSoft  = [System.Drawing.Color]::FromArgb(138, 145, 160)
  $InkFaint = [System.Drawing.Color]::FromArgb( 84,  90, 104)
  $Hairline = [System.Drawing.Color]::FromArgb( 44,  48,  58)

  $FontLabel = New-Object System.Drawing.Font('Segoe UI Semibold', 9.0)
  $FontRow   = New-Object System.Drawing.Font('Segoe UI', 9.0)
  $FontRowOn = New-Object System.Drawing.Font('Segoe UI Semibold', 9.0)
  $FontSmall = New-Object System.Drawing.Font('Segoe UI', 8.0)
  $FontTime  = New-Object System.Drawing.Font('Segoe UI', 9.0)

  $script:State      = 'idle'
  $script:Detail     = ''
  $script:StateSince = [DateTime]::Now
  $script:Hovered    = $false
  $script:HoverSince = [DateTime]::Now
  $script:OpenFrom   = 0.0
  $script:Openness   = 0.0
  $script:LastKey    = ''
  $script:CollapsedW = 160
  $script:Width      = 160
  $script:Height     = 24

  $form                 = New-Object System.Windows.Forms.Form
  $form.FormBorderStyle = 'None'
  $form.TopMost         = $true
  $form.ShowInTaskbar   = $false
  $form.StartPosition   = 'Manual'
  $form.BackColor       = $Panel
  $form.Width           = $script:Width
  $form.Height          = $script:Height
  $form.DoubleBuffered  = $true

  function Get-Frame {
    $age = ([DateTime]::Now - $script:StateSince).TotalMilliseconds
    $now = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
    return Get-NotchFrame -State $script:State -Detail $script:Detail -AgeMs $age -ClockMs $now
  }

  function To-Colour { param($Rgb) return [System.Drawing.Color]::FromArgb($Rgb[0], $Rgb[1], $Rgb[2]) }
  function To-Dim    { param($Rgb, $K) return [System.Drawing.Color]::FromArgb([int]($Rgb[0]*$K), [int]($Rgb[1]*$K), [int]($Rgb[2]*$K)) }

  # Square along the top edge, rounded below: it hangs from the edge of the
  # screen instead of floating in front of it.
  function Get-PillPath {
    param([int]$W, [int]$H, [int]$R)
    $r = [Math]::Max(2, [Math]::Min($R, [int]($H / 2)))
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddLine(0, 0, $W, 0)
    $path.AddArc(($W - $r * 2), ($H - $r * 2), ($r * 2), ($r * 2), 0, 90)
    $path.AddArc(0, ($H - $r * 2), ($r * 2), ($r * 2), 90, 90)
    $path.CloseFigure()
    return $path
  }

  function Set-Shape {
    param([int]$W, [int]$H)
    $screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
    $form.Width  = $W
    $form.Height = $H
    $form.Left   = [int]($screen.Left + ($screen.Width - $W) / 2)
    $form.Top    = $screen.Top
    $radius = if ($H -gt 40) { 14 } else { [int]($H / 2) }
    $path = Get-PillPath -W $W -H $H -R $radius
    $form.Region = New-Object System.Drawing.Region $path
    $path.Dispose()
    $script:Width = $W; $script:Height = $H
  }

  function Measure-Collapsed {
    param([string]$Text)
    $g = $form.CreateGraphics()
    try {
      $size = $g.MeasureString($Text, $FontLabel)
      # lamp + gaps + text + breathing room
      return [int]$size.Width + 46
    } finally { $g.Dispose() }
  }

  function Draw-Lamp {
    param($G, [double]$CX, [double]$CY, [double]$R, $Rgb, [bool]$Lit, [double]$Glow)
    if ($Lit -and $Glow -gt 0) {
      # A soft halo, drawn as widening translucent rings: GDI+ has no blur,
      # and three rings read as light far better than a hard disc does.
      for ($i = 3; $i -ge 1; $i--) {
        $alpha = [int](26 * $Glow / $i)
        $halo  = [System.Drawing.Color]::FromArgb($alpha, $Rgb[0], $Rgb[1], $Rgb[2])
        $brush = New-Object System.Drawing.SolidBrush $halo
        $rr = $R + $i * 2.2
        $G.FillEllipse($brush, [single]($CX - $rr), [single]($CY - $rr), [single]($rr * 2), [single]($rr * 2))
        $brush.Dispose()
      }
    }
    $body = if ($Lit) { To-Colour $Rgb } else { To-Dim $Rgb 0.26 }
    $brush = New-Object System.Drawing.SolidBrush $body
    $G.FillEllipse($brush, [single]($CX - $R), [single]($CY - $R), [single]($R * 2), [single]($R * 2))
    $brush.Dispose()
    if ($Lit) {
      # A brighter bead up and left reads as a glass lens catching light.
      $glint = [System.Drawing.Color]::FromArgb(110, 255, 255, 255)
      $gb = New-Object System.Drawing.SolidBrush $glint
      $G.FillEllipse($gb, [single]($CX - $R * 0.55), [single]($CY - $R * 0.68), [single]($R * 0.7), [single]($R * 0.55))
      $gb.Dispose()
    }
  }

  $form.Add_Paint({
    param($sender, $e)
    $frame = Get-Frame
    $o     = $script:Openness
    $w     = $form.Width
    $h     = $form.Height
    $accent = To-Colour $frame.rgb

    $g = $e.Graphics
    $g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit

    $radius = if ($h -gt 40) { 14 } else { [int]($h / 2) }
    $path = Get-PillPath -W $w -H $h -R $radius

    # Body: a vertical wash so the panel has a little depth instead of
    # reading as a flat rectangle taped to the screen.
    $grad = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
      (New-Object System.Drawing.Point 0, 0),
      (New-Object System.Drawing.Point 0, $h),
      $PanelTop, $Panel)
    $g.FillPath($grad, $path)
    $grad.Dispose()

    # The edge it hangs from, in the live colour: the one cue that still
    # reads at a glance when the panel is only 24 pixels tall.
    $edge = New-Object System.Drawing.SolidBrush $accent
    $g.FillRectangle($edge, 0, 0, $w, 2)
    $edge.Dispose()

    $pulse = 1.0
    if ($frame.pulsing) {
      $phase = ([DateTimeOffset]::Now.ToUnixTimeMilliseconds() % 1400) / 1400.0
      $pulse = 0.45 + 0.55 * (0.5 + 0.5 * [Math]::Sin($phase * 2 * [Math]::PI))
    }

    if ($o -lt 0.5) {
      # ---- collapsed: one lamp and the headline ----
      $fade = 1.0 - ($o / 0.5)
      Draw-Lamp -G $g -CX 17 -CY ([double]($h / 2) + 1) -R 4.5 -Rgb $frame.rgb -Lit $true -Glow ($pulse * $fade)
      $ink = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb([int](255 * $fade), $Ink))
      $g.DrawString($frame.short, $FontLabel, $ink, 30, [single](($h - 17) / 2))
      $ink.Dispose()
    } else {
      # ---- open: the whole traffic light ----
      $fade = ($o - 0.5) / 0.5
      $alpha = [int](255 * $fade)
      $rowY = 14
      foreach ($lamp in (Get-NotchLamps)) {
        $lit = ($lamp.key -eq $frame.key)
        $glow = if ($lit) { $pulse * $fade } else { 0 }
        Draw-Lamp -G $g -CX 20 -CY ([double]($rowY + 8)) -R 5.5 -Rgb $lamp.rgb -Lit $lit -Glow $glow
        $font = if ($lit) { $FontRowOn } else { $FontRow }
        $col  = if ($lit) { [System.Drawing.Color]::FromArgb($alpha, $Ink) } else { [System.Drawing.Color]::FromArgb([int]($alpha * 0.55), $InkSoft) }
        $brush = New-Object System.Drawing.SolidBrush $col
        $g.DrawString($lamp.label, $font, $brush, 36, [single]$rowY)
        $brush.Dispose()
        if ($lit) {
          $rb = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb([int]($alpha * 0.8), $InkSoft))
          $right = if ($frame.key -eq 'busy') { $frame.elapsed } else { $lamp.hint }
          $size = $g.MeasureString($right, $FontTime)
          $g.DrawString($right, $FontTime, $rb, [single]($w - 16 - $size.Width), [single]$rowY)
          $rb.Dispose()
        }
        $rowY += 23
      }

      $hair = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb([int]($alpha * 0.9), $Hairline))
      $g.FillRectangle($hair, 16, [single]($rowY + 2), ($w - 32), 1)
      $hair.Dispose()

      $bits = @()
      if ($frame.detail) { $bits += $frame.detail }
      $bits += ('seit ' + $script:StateSince.ToString('HH:mm'))
      $foot = [string]::Join('   -   ', $bits)
      $fb = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb([int]($alpha * 0.9), $InkFaint))
      $g.DrawString($foot, $FontSmall, $fb, 17, [single]($rowY + 9))
      $fb.Dispose()
    }

    $path.Dispose()
  })

  $timer          = New-Object System.Windows.Forms.Timer
  $timer.Interval = 60
  $timer.Add_Tick({
    try {
      if (Test-Path $StopFile) {
        Remove-Item $StopFile -Force -ErrorAction SilentlyContinue
        Write-Log 'stop requested'
        $form.Close()
        return
      }

      $read = Read-NotchStatus -Path $StateFile
      if ($null -ne $read) {
        if ($read.state -ne $script:State -or $read.detail -ne $script:Detail) {
          $script:State      = $read.state
          $script:Detail     = $read.detail
          $script:StateSince = [DateTime]::Now
        }
      }

      # Where is the pointer? Asking beats listening: the window is
      # click-through, so it never receives a mouse event of its own.
      $pt = New-Object NotchWin+POINT
      $over = $false
      if ([NotchWin]::GetCursorPos([ref]$pt)) {
        $over = ($pt.X -ge $form.Left) -and ($pt.X -lt ($form.Left + $form.Width)) -and
                ($pt.Y -ge $form.Top)  -and ($pt.Y -lt ($form.Top + $form.Height))
        # While open, keep it open across the whole panel plus a little
        # margin, so a hand that drifts a pixel does not slam it shut.
        if ($script:Hovered) {
          $over = ($pt.X -ge ($form.Left - 8)) -and ($pt.X -lt ($form.Left + $form.Width + 8)) -and
                  ($pt.Y -ge $form.Top) -and ($pt.Y -lt ($form.Top + $form.Height + 8))
        }
      }
      if ($over -ne $script:Hovered) {
        $script:Hovered    = $over
        $script:OpenFrom   = $script:Openness
        $script:HoverSince = [DateTime]::Now
      }

      $sinceHover = ([DateTime]::Now - $script:HoverSince).TotalMilliseconds
      $script:Openness = Get-NotchOpenness -Hovered $script:Hovered -SinceMs $sinceHover -From $script:OpenFrom

      $frame = Get-Frame
      $wanted = Measure-Collapsed $frame.short
      if ($wanted -ne $script:CollapsedW) { $script:CollapsedW = $wanted }
      $geo = Get-NotchGeometry -Openness $script:Openness -CollapsedWidth $script:CollapsedW
      if ($geo.width -ne $form.Width -or $geo.height -ne $form.Height) {
        Set-Shape -W $geo.width -H $geo.height
      }

      $animating = ($script:Openness -gt 0.001) -and ($script:Openness -lt 0.999)
      $timer.Interval = Get-NotchInterval -Hovered $script:Hovered -Animating $animating -Pulsing $frame.pulsing

      # Repaint only when the picture would differ. A settled green that
      # nobody is pointing at costs one cheap comparison a quarter second.
      $key = '{0}|{1}|{2}|{3}|{4}' -f $frame.key, $frame.short, $frame.dot,
             [int]($script:Openness * 40), ($(if ($frame.pulsing) { [DateTimeOffset]::Now.ToUnixTimeMilliseconds() % 1400 -shr 6 } else { 0 }))
      if ($key -ne $script:LastKey) {
        $script:LastKey = $key
        $form.Invalidate()
      }

      if (-not $form.TopMost) { $form.TopMost = $true }
    } catch {
      Write-Log "tick failed: $_"
    }
  })

  $form.Add_Shown({
    try {
      $ex = [NotchWin]::GetWindowLong($form.Handle, [NotchWin]::GWL_EXSTYLE)
      $ex = $ex -bor [NotchWin]::WS_EX_TRANSPARENT -bor [NotchWin]::WS_EX_NOACTIVATE -bor [NotchWin]::WS_EX_TOOLWINDOW
      [void][NotchWin]::SetWindowLong($form.Handle, [NotchWin]::GWL_EXSTYLE, $ex)
      Write-Log "window shown at $($form.Left),$($form.Top) size $($form.Width)x$($form.Height)"
    } catch {
      Write-Log "could not set the window styles: $_"
    }
  })

  $keeper = New-Object System.Windows.Forms.Timer
  $keeper.Interval = 4000
  $keeper.Add_Tick({ try { Set-Shape -W $form.Width -H $form.Height } catch { } })

  $form.Add_FormClosed({
    $timer.Stop(); $keeper.Stop()
    Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
    Write-Log 'closed'
  })

  Set-Shape -W $script:CollapsedW -H $script:NotchCollapsedH
  $timer.Start()
  $keeper.Start()
  [System.Windows.Forms.Application]::Run($form)
}
catch {
  Write-Log "FATAL: $_"
  Write-Log $_.ScriptStackTrace
  if ($Visible) { Read-Host 'Press Enter to close' }
  exit 1
}
