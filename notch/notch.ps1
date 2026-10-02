<#
  Claude Notch -- a thin always-on-top strip at the top of the screen that
  says whether Claude is working or waiting for you, whatever app is in
  front.

  It reads one small file that Claude Code's hooks write (see report.cmd),
  so it needs no connection to Claude itself and keeps working across
  sessions, restarts and multiple terminals.

  Nothing to install: WinForms ships with Windows.

  Run with -Visible to keep a console and see errors as they happen; by
  default every failure goes to overlay.log instead, because a hidden
  window that dies silently is impossible to diagnose.
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

  # Click-through, never focusable, out of Alt-Tab and the taskbar.
  # Note what is NOT here: TransparencyKey. Letting WinForms key a colour
  # out sets up a layered window itself, and ORing WS_EX_LAYERED in
  # afterwards wipes those attributes -- which leaves an invisible window
  # and no error anywhere. The shape comes from a Region instead, and the
  # form is sized to the pill, so there is nothing around it to hide.
  Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class NotchWin {
  [DllImport("user32.dll", SetLastError = true)]
  public static extern int GetWindowLong(IntPtr hWnd, int nIndex);
  [DllImport("user32.dll", SetLastError = true)]
  public static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);
  public const int GWL_EXSTYLE       = -20;
  public const int WS_EX_TRANSPARENT = 0x00000020;
  public const int WS_EX_NOACTIVATE  = 0x08000000;
  public const int WS_EX_TOOLWINDOW  = 0x00000080;
}
"@

  . (Join-Path $PSScriptRoot 'frame.ps1')

  if (Test-Path $StopFile) { Remove-Item $StopFile -Force }
  Set-Content -Path $PidFile -Value $PID -Encoding ASCII

  $ColInk = [System.Drawing.Color]::FromArgb(20, 18, 24)

  $script:State      = 'idle'
  $script:Detail     = ''
  $script:StateSince = [DateTime]::Now
  $script:LastPaint  = ''
  $script:LastWidth  = 0

  $form                 = New-Object System.Windows.Forms.Form
  $form.FormBorderStyle = 'None'
  $form.TopMost         = $true
  $form.ShowInTaskbar   = $false
  $form.StartPosition   = 'Manual'
  $form.BackColor       = $ColInk
  $form.Height          = 24
  $form.Width           = 160

  $font = New-Object System.Drawing.Font('Consolas', 10, [System.Drawing.FontStyle]::Bold)

  function Get-Frame {
    $age = ([DateTime]::Now - $script:StateSince).TotalMilliseconds
    $now = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
    return Get-NotchFrame -State $script:State -Detail $script:Detail -AgeMs $age -ClockMs $now
  }

  function To-Colour {
    param($Rgb)
    return [System.Drawing.Color]::FromArgb($Rgb[0], $Rgb[1], $Rgb[2])
  }

  function Get-PillPath {
    param([int]$W, [int]$H)
    # Square along the top edge, rounded below: it reads as hanging from the
    # edge of the screen rather than floating in front of it.
    $r = [Math]::Max(2, [int]($H / 2))
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddLine(0, 0, $W, 0)
    $path.AddArc(($W - $r * 2), ($H - $r * 2), ($r * 2), ($r * 2), 0, 90)
    $path.AddArc(0, ($H - $r * 2), ($r * 2), ($r * 2), 90, 90)
    $path.CloseFigure()
    return $path
  }

  function Set-Shape {
    param([int]$Width)
    $screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
    $form.Width  = $Width
    $form.Left   = [int]($screen.Left + ($screen.Width - $Width) / 2)
    $form.Top    = $screen.Top
    $path = Get-PillPath -W $Width -H $form.Height
    $form.Region = New-Object System.Drawing.Region $path
    $path.Dispose()
    $script:LastWidth = $Width
  }

  function Measure-Pill {
    param([string]$Text)
    $g = $form.CreateGraphics()
    try {
      $size = $g.MeasureString($Text, $font)
      return [int]$size.Width + 18
    } finally { $g.Dispose() }
  }

  $form.Add_Paint({
    param($sender, $e)
    $frame = Get-Frame
    $text  = " $($frame.dot) $($frame.label) "
    $g = $e.Graphics
    $g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit

    $w = $form.Width
    $h = $form.Height
    $path = Get-PillPath -W $w -H $h

    if ($frame.solid) {
      $fill = New-Object System.Drawing.SolidBrush (To-Colour $frame.colour)
      $g.FillPath($fill, $path)
      $ink = New-Object System.Drawing.SolidBrush $ColInk
      $g.DrawString($text, $font, $ink, 9, 3)
      $fill.Dispose(); $ink.Dispose()
    } else {
      $back = New-Object System.Drawing.SolidBrush $ColInk
      $g.FillPath($back, $path)
      $pen = New-Object System.Drawing.Pen (To-Colour $frame.colour), 1
      $g.DrawPath($pen, $path)
      $brush = New-Object System.Drawing.SolidBrush (To-Colour $frame.colour)
      $g.DrawString($text, $font, $brush, 9, 3)
      $back.Dispose(); $pen.Dispose(); $brush.Dispose()
    }
    $path.Dispose()
  })

  $timer          = New-Object System.Windows.Forms.Timer
  $timer.Interval = 200
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

      # Repaint only when the drawing would actually change: a settled READY
      # costs nothing, which is the whole point of it being always on.
      $frame = Get-Frame
      $key   = "$($frame.dot)|$($frame.label)|$($frame.solid)"
      if ($key -ne $script:LastPaint) {
        $script:LastPaint = $key
        $wanted = Measure-Pill (" $($frame.dot) $($frame.label) ")
        if ($wanted -ne $script:LastWidth) { Set-Shape -Width $wanted }
        $form.Invalidate()
      }

      # Something else may have taken the top; ask for it back now and then.
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

  # Follow the screen if its resolution changes.
  $keeper = New-Object System.Windows.Forms.Timer
  $keeper.Interval = 3000
  $keeper.Add_Tick({ try { Set-Shape -Width $script:LastWidth } catch { } })

  $form.Add_FormClosed({
    $timer.Stop(); $keeper.Stop()
    Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
    Write-Log 'closed'
  })

  Set-Shape -Width 160
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
