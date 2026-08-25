param(
  [string]$VerificationBaseUrl = "https://life-vlog-site.pages.dev"
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$dist = Join-Path $root ".cloudflare-pages-dist"
$pnpmCommand = Get-Command pnpm.cmd -ErrorAction SilentlyContinue
if (-not $pnpmCommand) {
  $pnpmCommand = Get-Command pnpm -ErrorAction SilentlyContinue
}
if (-not $pnpmCommand) {
  throw "pnpm is required for deployment."
}
$nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
if (-not $nodeCommand) {
  $pnpmDirectory = Split-Path -Parent $pnpmCommand.Source
  $dependencyRoot = Split-Path -Parent (Split-Path -Parent $pnpmDirectory)
  $bundledNode = Join-Path $dependencyRoot "node\bin\node.exe"
  if (Test-Path -LiteralPath $bundledNode) {
    $env:Path = "$(Split-Path -Parent $bundledNode);$env:Path"
  } else {
    throw "node is required for deployment."
  }
}

& $pnpmCommand.Source test
if ($LASTEXITCODE -ne 0) {
  throw "Validation failed. Deployment was stopped before uploading files."
}

& (Join-Path $root "test-release.ps1") -BaseUrl $VerificationBaseUrl
if ($LASTEXITCODE -ne 0) {
  throw "Test-account verification failed. Deployment was stopped before uploading files."
}

if (-not $env:CLOUDFLARE_API_TOKEN) {
  $tokenPath = Join-Path $root "cloudfileToken.txt"
  if (-not (Test-Path $tokenPath)) {
    throw "Missing CLOUDFLARE_API_TOKEN and cloudfileToken.txt."
  }
  $env:CLOUDFLARE_API_TOKEN = (Get-Content -Raw -Path $tokenPath).Trim()
}

if (Test-Path $dist) {
  $resolvedRoot = (Resolve-Path $root).Path
  $resolvedDist = (Resolve-Path $dist).Path
  if (-not $resolvedDist.StartsWith($resolvedRoot)) {
    throw "Refuse to remove outside workspace: $resolvedDist"
  }
  Remove-Item -LiteralPath $resolvedDist -Recurse -Force
}

New-Item -ItemType Directory -Path $dist | Out-Null
Copy-Item -LiteralPath `
  (Join-Path $root "index.html"), `
  (Join-Path $root "app.js"), `
  (Join-Path $root "weekend-board.css"), `
  (Join-Path $root "diary-detail.css"), `
  (Join-Path $root "secret-viewer.css"), `
  (Join-Path $root "wardrobe.css"), `
  (Join-Path $root "styles.css"), `
  (Join-Path $root "service-worker.js"), `
  (Join-Path $root "manifest.webmanifest"), `
  (Join-Path $root ".nojekyll"), `
  (Join-Path $root "_headers") `
  -Destination $dist
Copy-Item -LiteralPath (Join-Path $root "assets") -Destination $dist -Recurse
Copy-Item -LiteralPath (Join-Path $root "modules") -Destination $dist -Recurse
Copy-Item -LiteralPath (Join-Path $root "styles") -Destination $dist -Recurse

& $pnpmCommand.Source dlx wrangler@latest pages deploy $dist --project-name life-vlog-site
