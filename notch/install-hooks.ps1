<#
  Merges the Claude Notch hooks into %USERPROFILE%\.claude\settings.json.

  Three rules, because this edits a file the user owns and may have put
  real work into:
    - back it up before touching it,
    - keep every hook that is not ours,
    - be safe to run twice (our own entries are removed first, by their
      command text, then re-added).

  Written for Windows PowerShell 5.1, which is what Windows ships: no
  ConvertFrom-Json -AsHashtable, no ?? operator, no ternary.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$SettingsDir  = Join-Path $env:USERPROFILE '.claude'
$SettingsFile = Join-Path $SettingsDir 'settings.json'
$Marker       = '.claude-notch'
$Report       = Join-Path $env:USERPROFILE '.claude-notch\report.cmd'

$Wanted = @(
  @{ Event = 'UserPromptSubmit'; Args = 'busy' }
  @{ Event = 'Notification';     Args = 'waiting "needs you"' }
  @{ Event = 'Stop';             Args = 'idle' }
  @{ Event = 'SessionEnd';       Args = 'idle' }
)

# ConvertFrom-Json hands back PSCustomObjects, which cannot take new keys.
# Walk them into hashtables, keeping every key -- including ones this script
# knows nothing about, which must survive untouched.
function ConvertTo-Hashtable {
  param($InputObject)
  if ($null -eq $InputObject) { return $null }
  if ($InputObject -is [string] -or $InputObject.GetType().IsPrimitive) { return $InputObject }
  if ($InputObject -is [System.Collections.IDictionary]) {
    $copy = @{}
    foreach ($key in $InputObject.Keys) { $copy[$key] = ConvertTo-Hashtable $InputObject[$key] }
    return $copy
  }
  if ($InputObject -is [System.Management.Automation.PSCustomObject]) {
    $copy = @{}
    foreach ($prop in $InputObject.PSObject.Properties) {
      $copy[$prop.Name] = ConvertTo-Hashtable $prop.Value
    }
    return $copy
  }
  if ($InputObject -is [System.Collections.IEnumerable]) {
    $list = @()
    foreach ($item in $InputObject) { $list += ,(ConvertTo-Hashtable $item) }
    return ,$list
  }
  return $InputObject
}

if (-not (Test-Path $SettingsDir)) { New-Item -ItemType Directory -Path $SettingsDir | Out-Null }

$parsed = $null
if (Test-Path $SettingsFile) {
  $raw = Get-Content -Path $SettingsFile -Raw
  if ($raw -and $raw.Trim()) {
    try {
      $parsed = $raw | ConvertFrom-Json
    } catch {
      Write-Host "Your settings.json is not valid JSON, so this script will not touch it." -ForegroundColor Red
      Write-Host "  $SettingsFile"
      Write-Host "Fix or move that file, then run install.cmd again."
      exit 1
    }
  }
  Copy-Item -Path $SettingsFile -Destination "$SettingsFile.notch-backup" -Force
  Write-Host "Backed up your settings to $SettingsFile.notch-backup"
}

$root = ConvertTo-Hashtable $parsed
if ($null -eq $root -or $root -isnot [System.Collections.IDictionary]) { $root = @{} }
if (-not $root.ContainsKey('hooks') -or $root['hooks'] -isnot [System.Collections.IDictionary]) {
  $root['hooks'] = @{}
}
$hooks = $root['hooks']

$kept = 0
foreach ($want in $Wanted) {
  $evt = $want.Event
  $groups = @()
  if ($hooks.ContainsKey($evt) -and $null -ne $hooks[$evt]) {
    foreach ($group in @($hooks[$evt])) {
      if ($group -isnot [System.Collections.IDictionary]) { continue }
      $commands = @()
      if ($group.ContainsKey('hooks') -and $null -ne $group['hooks']) {
        foreach ($cmd in @($group['hooks'])) {
          $text = ''
          if ($cmd -is [System.Collections.IDictionary] -and $cmd.ContainsKey('command')) {
            $text = [string]$cmd['command']
          }
          if ($text -like "*$Marker*") { continue }   # ours, from an earlier run
          $commands += ,$cmd
          $kept++
        }
      }
      if ($commands.Count -gt 0) {
        $group['hooks'] = $commands
        $groups += ,$group
      }
    }
  }
  $groups += ,@{ hooks = @( @{
    type    = 'command'
    command = ('"{0}" {1}' -f $Report, $want.Args)
    async   = $true
  } ) }
  $hooks[$evt] = $groups
}

$root['hooks'] = $hooks
$json = $root | ConvertTo-Json -Depth 32

# Write without a BOM: Set-Content -Encoding UTF8 adds one on 5.1, and a
# BOM in front of JSON trips strict parsers.
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($SettingsFile, $json, $utf8NoBom)

Write-Host "Wired up $($Wanted.Count) notch hooks; kept $kept hook(s) that were already there."
exit 0
