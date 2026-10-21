# Safe legacy screenshot cleanup for v11.12.1-beta.12. Read before use.
# Default mode reports candidates only. -Apply removes ONLY files with exact historic SHA256.
param([switch]$Apply)
$root = (Get-Location).Path
$items = Get-Content -Raw -Encoding UTF8 (Join-Path $PSScriptRoot 'SAFE-DELETIONS.json') | ConvertFrom-Json
$items.PSObject.Properties | ForEach-Object {
 $rel = $_.Name
 $want = $_.Value
 if(-not $rel.StartsWith('screenshots/')) { throw "Unexpected path in deletion manifest: $rel" }
 $path = Join-Path $root $rel
 if(Test-Path -LiteralPath $path -PathType Leaf){
   $actual = (Get-FileHash -Algorithm SHA256 -LiteralPath $path).Hash.ToLowerInvariant()
   if($actual -eq $want){
     if($Apply){ Remove-Item -LiteralPath $path -Force; Write-Host "Removed verified historical file: $rel" }
     else { Write-Host "Candidate (safe hash match): $rel" }
   }else { Write-Warning "SKIPPED changed file: $rel" }
 }
}
