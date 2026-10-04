# Claude Island - Deinstallation: entfernt Hooks, Autostart und Programmdateien.
[CmdletBinding()]
param([string]$SettingsPath = (Join-Path $env:USERPROFILE '.claude\settings.json'))

$ErrorActionPreference = 'Stop'
$target = Join-Path $env:LOCALAPPDATA 'ClaudeIsland'

Get-Process -Name 'ClaudeIsland' -ErrorAction SilentlyContinue | Stop-Process -Force

if (Test-Path $SettingsPath) {
    $raw = [IO.File]::ReadAllText($SettingsPath)
    if (-not [string]::IsNullOrWhiteSpace($raw)) {
        Copy-Item $SettingsPath ("$SettingsPath.bak-claude-island-" + (Get-Date -Format 'yyyyMMdd-HHmmss'))
        $cfg = ConvertFrom-Json -InputObject $raw
        if ($cfg.PSObject.Properties['hooks']) {
            foreach ($prop in @($cfg.hooks.PSObject.Properties)) {
                $kept = @()
                foreach ($group in @($prop.Value)) {
                    $others = @(@($group.hooks) | Where-Object { -not ("$($_.command)" -like '*ClaudeIsland.exe*') })
                    if ($others.Count -gt 0) { $group.hooks = $others; $kept += $group }
                }
                if ($kept.Count -gt 0) { $cfg.hooks.($prop.Name) = $kept }
                else { $cfg.hooks.PSObject.Properties.Remove($prop.Name) }
            }
            if (@($cfg.hooks.PSObject.Properties).Count -eq 0) { $cfg.PSObject.Properties.Remove('hooks') }
        }
        [IO.File]::WriteAllText($SettingsPath, (ConvertTo-Json -InputObject $cfg -Depth 64), (New-Object Text.UTF8Encoding $false))
    }
}

$startup = [Environment]::GetFolderPath('Startup')
if ($startup) {
    $lnk = Join-Path $startup 'Claude Island.lnk'
    if (Test-Path $lnk) { Remove-Item $lnk }
}
Start-Sleep -Milliseconds 300
if (Test-Path $target) { Remove-Item -Recurse -Force $target }

Write-Host '  Claude Island wurde entfernt.' -ForegroundColor Green
