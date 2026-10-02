<#
  Claude Notch — a thin always-on-top strip at the top of the screen that
  says whether Claude is working or waiting for you, whatever app is in
  front.

  It reads one small file that Claude Code's hooks write (see report.cmd),
  so it needs no connection to Claude itself and keeps working across
  sessions, restarts and multiple terminals.

  Nothing to install: WinForms ships with Windows.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Make the window click-through, never focusable, and invisible to Alt-Tab.
# Without WS_EX_TRANSPARENT the strip would swallow clicks meant for the app
# underneath it; without WS_EX_NOACTIVATE it would steal focus on every show.
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class NotchWin {
  [DllImport("user32.dll", SetLastError = true)]
  public static extern int GetWindowLong(IntPtr hWnd, int nIndex);
  [DllImport("user32.dll", SetLastError = true)]
  public static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);
  public const int GWL_EXSTYLE      = -20;
  public const int WS_EX_LAYERED    = 0x00080000;
  public const int WS_EX_TRANSPARENT= 0x00000020;
  public const int WS_EX_NOACTIVATE = 0x08000000;
  public const int WS_EX_TOOLWINDOW = 0x00000080;
}
"@

. (Join-Path $PSScriptRoot 'frame.ps1')

$StateDir  = Join-Path $env:USERPROFILE '.claude-notch'
$StateFile = Join-Path $StateDir 'status.txt'
$PidFile   = Join-Path $StateDir 'overlay.pid'
$StopFile  = Join-Path $StateDir 'stop'

if (-not (Test-Path $StateDir)) { New-Item -ItemType Directory -Path $StateDir | Out-Null }
if (Test-Path $StopFile) { Remove-Item $StopFile -Force }
Set-Content -Path $PidFile -Value $PID -Encoding ASCII

# Only the window's own colours live here; the visual language is frame.ps1.
$ColInk    = [System.Drawing.Color]::FromArgb(20, 18, 24)
$ChromaKey = [System.Drawing.Color]::FromArgb(255, 0, 255)

$script:State     = 'idle'
$script:Detail    = ''
$script:StateSince= [DateTime]::Now
$script:LastPaint = ''

$form                 = New-Object System.Windows.Forms.Form
$form.FormBorderStyle = 'None'
$form.TopMost         = $true
$form.ShowInTaskbar   = $false
$form.StartPosition   = 'Manual'
$form.BackColor       = $ChromaKey
$form.TransparencyKey = $ChromaKey
$form.Height          = 26
$form.Width           = 320

$font = New-Object System.Drawing.Font('Consolas', 10, [System.Drawing.FontStyle]::Bold)

function Set-Placement {
  $screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
  $form.Left = [int](($screen.Width - $form.Width) / 2)
  $form.Top  = 0
}

function Get-Frame {
  $age = ([DateTime]::Now - $script:StateSince).TotalMilliseconds
  $now = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
  return Get-NotchFrame -State $script:State -Detail $script:Detail -AgeMs $age -ClockMs $now
}

function To-Colour {
  param($Rgb)
  return [System.Drawing.Color]::FromArgb($Rgb[0], $Rgb[1], $Rgb[2])
}

$form.Add_Paint({
  param($sender, $e)
  $frame = Get-Frame
  $text  = " $($frame.dot) $($frame.label) "

  $g = $e.Graphics
  $g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
  $g.Clear($ChromaKey)

  $size = $g.MeasureString($text, $font)
  $w    = [int]$size.Width + 18
  $h    = $form.Height - 4
  $x    = [int](($form.Width - $w) / 2)
  $y    = 0

  # A pill hanging from the top edge: square at the top, rounded below, so
  # it reads as part of the screen edge rather than a floating box.
  $r    = [int]($h / 2)
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddLine($x, $y, ($x + $w), $y)
  $path.AddArc(($x + $w - $r * 2), ($y + $h - $r * 2), ($r * 2), ($r * 2), 0, 90)
  $path.AddArc($x, ($y + $h - $r * 2), ($r * 2), ($r * 2), 90, 90)
  $path.CloseFigure()

  if ($frame.solid) {
    $fill = New-Object System.Drawing.SolidBrush (To-Colour $frame.colour)
    $g.FillPath($fill, $path)
    $ink = New-Object System.Drawing.SolidBrush $ColInk
    $g.DrawString($text, $font, $ink, $x + 9, $y + 3)
    $fill.Dispose(); $ink.Dispose()
  } else {
    $back = New-Object System.Drawing.SolidBrush $ColInk
    $g.FillPath($back, $path)
    $pen = New-Object System.Drawing.Pen (To-Colour $frame.colour), 1
    $g.DrawPath($pen, $path)
    $brush = New-Object System.Drawing.SolidBrush (To-Colour $frame.colour)
    $g.DrawString($text, $font, $brush, $x + 9, $y + 3)
    $back.Dispose(); $pen.Dispose(); $brush.Dispose()
  }
  $path.Dispose()
})

$timer          = New-Object System.Windows.Forms.Timer
$timer.Interval = 200
$timer.Add_Tick({
  if (Test-Path $StopFile) {
    Remove-Item $StopFile -Force -ErrorAction SilentlyContinue
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

  # Repaint only when the drawing would actually change: a settled READY
  # costs nothing, which is the whole point of it being always on.
  $frame = Get-Frame
  $key   = "$($frame.dot)|$($frame.label)|$($frame.solid)"
  if ($key -ne $script:LastPaint) {
    $script:LastPaint = $key
    $form.Invalidate()
  }
})

$form.Add_Shown({
  $ex = [NotchWin]::GetWindowLong($form.Handle, [NotchWin]::GWL_EXSTYLE)
  $ex = $ex -bor [NotchWin]::WS_EX_LAYERED -bor [NotchWin]::WS_EX_TRANSPARENT `
            -bor [NotchWin]::WS_EX_NOACTIVATE -bor [NotchWin]::WS_EX_TOOLWINDOW
  [void][NotchWin]::SetWindowLong($form.Handle, [NotchWin]::GWL_EXSTYLE, $ex)
  Set-Placement
  $form.TopMost = $true
})

# Follow the screen if its resolution changes.
$resize = New-Object System.Windows.Forms.Timer
$resize.Interval = 3000
$resize.Add_Tick({ Set-Placement })

$form.Add_FormClosed({
  $timer.Stop(); $resize.Stop()
  Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
})

$timer.Start()
$resize.Start()
Set-Placement
[System.Windows.Forms.Application]::Run($form)
