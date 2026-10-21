# Safe, opt-in migration for old files after applying the changed-only archive.
# Default is preview. -Apply deletes a top-level historical CSS file ONLY if
# the equivalent archived file exists and SHA-256 matches the baseline.
param([switch]$Apply)
$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$expected = @{
  "styles.css" = "ca9ea955d72108b3a8cc7d2c9ec2c2e5486538cbeaaf05572c5ae47a6970822e"
  "v9.css" = "eaa9d8827bd5898d605d3185a526f440e531ff9081ab07be6fd4001a712eedef"
  "v10.css" = "e4d356ac5b94834eba94661c023afd6665a438edb64953aaf42240d2c09b78df"
  "v11.css" = "27d01ded6c327acd95c4efb1d4f84297345911c2236cd7d78bd512847396640b"
}
$ref = @("index.html", "sw.js")
foreach ($name in $expected.Keys) {
  $old = Join-Path $root $name
  $archived = Join-Path $root ("archive\historical-css\" + $name)
  if (-not (Test-Path $archived)) { throw "Missing archive: $archived" }
  $archiveHash = (Get-FileHash -Path $archived -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($archiveHash -ne $expected[$name]) { throw "Archived snapshot has unexpected SHA256: $name" }
  if (-not (Test-Path $old)) { Write-Host "Already migrated: $name"; continue }
  $currentHash = (Get-FileHash -Path $old -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($currentHash -ne $expected[$name]) { throw "Root CSS differs from verified snapshot, refusing deletion: $name" }
  foreach ($entry in $ref) {
    $content = Get-Content -Raw (Join-Path $root $entry)
    if ($content.Contains('href="' + $name) -or $content.Contains("href='" + $name)) { throw "Stylesheet still referenced by $entry: $name" }
  }
  if ($Apply) { Remove-Item -LiteralPath $old -Force; Write-Host "Archived safely: $name" }
  else { Write-Host "Would remove historical root file: $name (use -Apply)" }
}
Write-Host "Legacy CSS migration check complete."
