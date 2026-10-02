<#
  Adds or removes a Startup shortcut, so the notch comes up with Windows.

  A shortcut in shell:startup rather than a Run registry key or a scheduled
  task: it is the one place a person can look, see it, and delete it
  without being told how.
#>
param(
  [ValidateSet('on','off','status')]
  [string]$Mode = 'on'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$Startup  = [Environment]::GetFolderPath('Startup')
$Link     = Join-Path $Startup 'Claude Notch.lnk'
$Launcher = Join-Path $env:USERPROFILE '.claude-notch\start-notch.vbs'

switch ($Mode) {
  'status' {
    if (Test-Path $Link) { Write-Host "Autostart is ON  ($Link)" }
    else { Write-Host "Autostart is OFF" }
    exit 0
  }
  'off' {
    if (Test-Path $Link) { Remove-Item $Link -Force; Write-Host "Autostart off; removed $Link" }
    else { Write-Host "Autostart was already off." }
    exit 0
  }
  'on' {
    if (-not (Test-Path $Launcher)) {
      Write-Host "Cannot find $Launcher -- run install.cmd first." -ForegroundColor Red
      exit 1
    }
    $shell = New-Object -ComObject WScript.Shell
    $sc = $shell.CreateShortcut($Link)
    # wscript, not cscript: cscript opens a console window for a moment.
    $sc.TargetPath       = Join-Path $env:WINDIR 'System32\wscript.exe'
    $sc.Arguments        = '"' + $Launcher + '"'
    $sc.WorkingDirectory = Split-Path $Launcher
    $sc.Description      = 'Shows whether Claude is working or waiting for you'
    $sc.Save()
    Write-Host "Autostart on; created $Link"
    exit 0
  }
}
