# Claude Island - Deinstallation: entfernt Hooks, Autostart und Programmdateien.
[CmdletBinding()]
param([string]$SettingsPath = (Join-Path $env:USERPROFILE '.claude\settings.json'))

$ErrorActionPreference = 'Stop'
$target = Join-Path $env:USERPROFILE '.claude\claude-island'
$dataDir = Join-Path $env:LOCALAPPDATA 'ClaudeIsland'
$chainFile = Join-Path $dataDir 'statusline-previous.txt'

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
        # Statuszeile: die vorherige wiederherstellen oder unsere entfernen
        if ($cfg.PSObject.Properties['statusLine'] -and $cfg.statusLine -and "$($cfg.statusLine.command)" -like '*ClaudeIsland.exe*') {
            if (Test-Path $chainFile) { $cfg.statusLine.command = [IO.File]::ReadAllText($chainFile).Trim() }
            else { $cfg.PSObject.Properties.Remove('statusLine') }
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
foreach ($dir in @($target, $dataDir)) {
    if (Test-Path $dir) { Remove-Item -Recurse -Force $dir }
}

Write-Host '  Claude Island wurde entfernt.' -ForegroundColor Green
