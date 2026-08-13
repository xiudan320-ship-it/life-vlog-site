$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$dist = Join-Path $root ".cloudflare-pages-dist"
$nodeBin = "C:\Users\xiuda\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
$pnpmBin = "C:\Users\xiuda\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback"

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
  (Join-Path $root "redesign.css"), `
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

$env:Path = "$nodeBin;$pnpmBin;$env:Path"
& (Join-Path $pnpmBin "pnpm.cmd") dlx wrangler@latest pages deploy $dist --project-name life-vlog-site
