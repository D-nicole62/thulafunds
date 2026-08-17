# Sync .env variables to Vercel (Production, Preview, Development)
# Usage: from project root, after `vercel login` and `vercel link`:
#   powershell -ExecutionPolicy Bypass -File scripts/sync-vercel-env.ps1

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
  Write-Error "Vercel CLI not found. Install: npm i -g vercel"
}

$whoami = vercel whoami 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host "Not logged in to Vercel. Run: vercel login" -ForegroundColor Yellow
  exit 1
}
Write-Host "Logged in as: $whoami"

if (-not (Test-Path ".vercel/project.json")) {
  Write-Host "Linking to Vercel project thulafunds..."
  vercel link --project thulafunds --yes
}

$envFile = ".env"
if (-not (Test-Path $envFile)) {
  Write-Error ".env file not found"
}

# Production app URL (override localhost from local .env)
$productionOverrides = @{
  "NEXT_PUBLIC_APP_URL" = "https://www.thulafunds.com"
  "NEXT_PUBLIC_PRODUCTION_URL" = "https://www.thulafunds.com"
}

$targets = @("production", "preview", "development")
$added = 0
$skipped = 0

Get-Content $envFile | ForEach-Object {
  $line = $_.Trim()
  if (-not $line -or $line.StartsWith("#")) { return }

  $eq = $line.IndexOf("=")
  if ($eq -lt 1) { return }

  $name = $line.Substring(0, $eq).Trim()
  $value = $line.Substring($eq + 1).Trim()

  if ($productionOverrides.ContainsKey($name)) {
    $value = $productionOverrides[$name]
  }

  if ([string]::IsNullOrWhiteSpace($value)) {
    Write-Host "  skip (empty): $name" -ForegroundColor DarkGray
    $skipped++
    return
  }

  Write-Host "  add: $name" -ForegroundColor Cyan
  foreach ($target in $targets) {
    $value | vercel env add $name $target --force 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
      Write-Warning "Failed to set $name for $target"
    }
  }
  $added++
}

Write-Host ""
Write-Host "Done. Added/updated $added variables ($skipped empty skipped)." -ForegroundColor Green
Write-Host "Redeploy without cache: vercel --prod" -ForegroundColor Yellow
