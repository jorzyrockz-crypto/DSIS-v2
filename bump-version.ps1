param(
  [ValidateSet('patch', 'minor', 'major')]
  [string]$Bump = 'patch',
  [string]$SetVersion
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Parse-VersionTuple {
  param([Parameter(Mandatory = $true)][string]$VersionText)
  $v = $VersionText.Trim()
  if ($v -match '^(?<maj>\d+)$') {
    return [pscustomobject]@{ Major = [int]$Matches.maj; Minor = 0; Patch = 0 }
  }
  if ($v -match '^(?<maj>\d+)\.(?<min>\d+)$') {
    return [pscustomobject]@{ Major = [int]$Matches.maj; Minor = [int]$Matches.min; Patch = 0 }
  }
  if ($v -match '^(?<maj>\d+)\.(?<min>\d+)\.(?<pat>\d+)$') {
    return [pscustomobject]@{ Major = [int]$Matches.maj; Minor = [int]$Matches.min; Patch = [int]$Matches.pat }
  }
  throw "Unsupported version format: '$VersionText'. Use N, N.N, or N.N.N"
}

function Format-AppVersion {
  param([int]$Major, [int]$Minor, [int]$Patch)
  if ($Patch -gt 0) { return "$Major.$Minor.$Patch" }
  if ($Minor -gt 0) { return "$Major.$Minor" }
  return "$Major"
}

function Format-SchemaVersion {
  param([int]$Major, [int]$Minor, [int]$Patch)
  return "$Major.$Minor.$Patch"
}

function Escape-JsSingleQuoted {
  param([Parameter(Mandatory = $true)][string]$Text)
  return $Text.Replace('\', '\\').Replace("'", "\'")
}

function Get-AutoReleaseNotes {
  param([Parameter(Mandatory = $true)][string]$ProjectStatusPath)

  if (-not (Test-Path $ProjectStatusPath)) {
    return @("Release notes auto-generated on $(Get-Date -Format 'yyyy-MM-dd').")
  }

  $lines = Get-Content $ProjectStatusPath
  $start = -1
  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match '^##\s+Newly Implemented') {
      $start = $i
      break
    }
  }

  if ($start -lt 0) {
    return @("Release notes auto-generated on $(Get-Date -Format 'yyyy-MM-dd').")
  }

  $sectionLines = @()
  for ($j = $start + 1; $j -lt $lines.Count; $j++) {
    if ($lines[$j] -match '^##\s+') { break }
    $sectionLines += $lines[$j]
  }

  $notes = @()
  foreach ($line in $sectionLines) {
    if ($line -notmatch '^\s*-\s+(.+)$') { continue }
    $text = ($Matches[1] -replace '\s+', ' ').Trim()
    if ([string]::IsNullOrWhiteSpace($text)) { continue }
    $notes += $text
    if ($notes.Count -ge 6) { break }
  }

  if ($notes.Count -eq 0) {
    return @("Release notes auto-generated on $(Get-Date -Format 'yyyy-MM-dd').")
  }

  return $notes
}

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$manifestPath = Join-Path $repoRoot 'manifest.webmanifest'
$entryPath = Join-Path $repoRoot 'core-main-entry.js'
$bootstrapPath = Join-Path $repoRoot 'core-app-bootstrap.js'
$swPath = Join-Path $repoRoot 'sw.js'
$projectStatusPath = Join-Path $repoRoot 'PROJECT_STATUS.md'

$manifestRaw = Get-Content -Raw $manifestPath
if ($manifestRaw -notmatch '"version"\s*:\s*"([^"]+)"') {
  throw "Could not find manifest version in $manifestPath"
}
$currentManifestVersion = $Matches[1]
$current = Parse-VersionTuple $currentManifestVersion

if ($SetVersion) {
  $next = Parse-VersionTuple $SetVersion
} else {
  $next = [pscustomobject]@{
    Major = $current.Major
    Minor = $current.Minor
    Patch = $current.Patch
  }
  switch ($Bump) {
    'major' {
      $next.Major += 1
      $next.Minor = 0
      $next.Patch = 0
    }
    'minor' {
      $next.Minor += 1
      $next.Patch = 0
    }
    'patch' {
      $next.Patch += 1
    }
  }
}

$newAppVersion = Format-AppVersion -Major $next.Major -Minor $next.Minor -Patch $next.Patch
$newSchemaVersion = Format-SchemaVersion -Major $next.Major -Minor $next.Minor -Patch $next.Patch

# 1) manifest.webmanifest version
$manifestUpdated = [regex]::Replace($manifestRaw, '"version"\s*:\s*"[^"]+"', "`"version`": `"$newAppVersion`"", 1)
Set-Content -NoNewline -Path $manifestPath -Value $manifestUpdated

# 2) core-main-entry.js version constants
$entryRaw = Get-Content -Raw $entryPath
$entryRaw = [regex]::Replace($entryRaw, "const ICS_SCHEMA_VERSION = '[^']+';", "const ICS_SCHEMA_VERSION = '$newSchemaVersion';", 1)
$entryRaw = [regex]::Replace($entryRaw, "const APP_UI_VERSION_FALLBACK = '[^']+';", "const APP_UI_VERSION_FALLBACK = '$newAppVersion';", 1)
Set-Content -NoNewline -Path $entryPath -Value $entryRaw

# 3) sw.js cache namespace increment
$swRaw = Get-Content -Raw $swPath
if ($swRaw -notmatch "const CACHE_VERSION = '([^']*?-v)(\d+)';") {
  throw "Could not parse CACHE_VERSION in $swPath"
}
$cachePrefix = $Matches[1]
$cacheCounter = [int]$Matches[2]
$nextCacheVersion = "$cachePrefix$($cacheCounter + 1)"
$swUpdated = [regex]::Replace($swRaw, "const CACHE_VERSION = '[^']+';", "const CACHE_VERSION = '$nextCacheVersion';", 1)
Set-Content -NoNewline -Path $swPath -Value $swUpdated

# 4) core-app-bootstrap.js release notes map entry (auto-generated)
$bootstrapRaw = Get-Content -Raw $bootstrapPath
$autoNotes = Get-AutoReleaseNotes -ProjectStatusPath $projectStatusPath
$notesLines = $autoNotes | ForEach-Object { "    '" + (Escape-JsSingleQuoted -Text $_) + "'" }
$notesEntry = "  '$newAppVersion': [`r`n" + ($notesLines -join ",`r`n") + "`r`n  ],"
$escapedVersion = [regex]::Escape($newAppVersion)
if ($bootstrapRaw -match "(?s)'$escapedVersion'\s*:\s*\[(.*?)\],") {
  $bootstrapRaw = [regex]::Replace(
    $bootstrapRaw,
    "(?s)\s*'$escapedVersion'\s*:\s*\[(.*?)\],",
    "`r`n$notesEntry",
    1
  )
} else {
  $bootstrapRaw = [regex]::Replace(
    $bootstrapRaw,
    'const RELEASE_NOTES_BY_VERSION = \{\r?\n',
    "const RELEASE_NOTES_BY_VERSION = {`r`n$notesEntry",
    1
  )
}
Set-Content -NoNewline -Path $bootstrapPath -Value $bootstrapRaw

Write-Host "Version bump complete."
Write-Host "  Manifest/App version : $newAppVersion"
Write-Host "  Schema version       : $newSchemaVersion"
Write-Host "  Cache version        : $nextCacheVersion"
Write-Host "  Release notes source : $projectStatusPath"
Write-Host ""
Write-Host "Next:"
Write-Host "  1) Review release notes in core-app-bootstrap.js"
Write-Host "  2) Commit and push"
