param(
  [ValidateSet("preview", "production")]
  [string]$Environment = "production",
  [string]$Branch = "codex-preview"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$pnpmCommand = Get-Command pnpm.cmd -ErrorAction SilentlyContinue
if (-not $pnpmCommand) { $pnpmCommand = Get-Command pnpm -ErrorAction SilentlyContinue }
if (-not $pnpmCommand) { throw "pnpm is required for deployment." }

function Invoke-Pnpm([string[]]$Arguments) {
  & $pnpmCommand.Source @Arguments
  if ($LASTEXITCODE -ne 0) { throw "pnpm command failed: pnpm $($Arguments -join ' ')" }
}

function Invoke-PnpmCapture([string[]]$Arguments) {
  $output = (& $pnpmCommand.Source @Arguments 2>&1 | Out-String).Trim()
  if ($LASTEXITCODE -ne 0) { throw "pnpm command failed: pnpm $($Arguments -join ' ')" }
  return $output
}

function Get-ReleaseMetadata {
  $raw = Invoke-PnpmCapture @("exec", "node", "scripts/release-metadata.mjs")
  $jsonLine = ($raw -split "`r?`n" | Where-Object { $_.Trim() } | Select-Object -Last 1)
  try { return ($jsonLine | ConvertFrom-Json) } catch { throw "Unable to parse release metadata." }
}

function Write-ReleaseMetadata($metadata, [string]$label) {
  Write-Output "$label entry: $($metadata.entry) ($($metadata.entrySha256))"
  Write-Output "$label sw.js: $($metadata.swSha256)"
  Write-Output "$label Workbox precache entries: $($metadata.workboxPrecacheEntries)"
}

function Invoke-WorkerDeploy {
  Push-Location (Join-Path $root "cloudflare-worker")
  try {
    & $pnpmCommand.Source "dlx" "wrangler@latest" "deploy" "--config" "wrangler.toml"
    if ($LASTEXITCODE -ne 0) { throw "Cloudflare Worker deployment failed." }
  } finally {
    Pop-Location
  }
}

function Invoke-WorkerCorsSmoke {
  $previous = $env:RELEASE_WORKER_URL
  try {
    $env:RELEASE_WORKER_URL = "https://life-vlog-r2-upload.xiudan320-life.workers.dev"
    Invoke-Pnpm @("run", "test:worker-online")
  } finally {
    if ($null -eq $previous) { Remove-Item Env:RELEASE_WORKER_URL -ErrorAction SilentlyContinue }
    else { $env:RELEASE_WORKER_URL = $previous }
  }
}

function Invoke-PagesDeploy([string]$branch) {
  $deployArgs = @("dlx", "wrangler@latest", "pages", "deploy", "dist", "--project-name", "life-vlog-site", "--branch", $branch, "--commit-dirty")
  $previousErrorActionPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = "Continue"
    $output = (& $pnpmCommand.Source @deployArgs 2>&1 | Out-String)
    $deployExitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }
  if ($deployExitCode -ne 0) { throw "Cloudflare Pages deployment failed for branch $branch." }
  $url = [regex]::Matches($output, "https://[a-z0-9-]+\.life-vlog-site\.pages\.dev") | Select-Object -Last 1
  if (-not $url) { throw "Wrangler did not return a deployment URL for branch $branch." }
  return $url.Value
}

function Wait-ReleaseAlias([string]$url, [string]$entry) {
  for ($attempt = 1; $attempt -le 60; $attempt++) {
    try {
      $response = Invoke-WebRequest -Uri "$url/index.html?release=$entry" -UseBasicParsing -TimeoutSec 10
      if ($response.StatusCode -eq 200 -and $response.Content.Contains($entry)) { return }
    } catch { }
    Start-Sleep -Seconds 2
  }
  throw "Release alias did not expose the expected entry ${entry}: $url"
}

function Invoke-ReleaseSmoke([string]$url) {
  $previousBaseUrl = $env:RELEASE_BASE_URL
  try {
    $env:RELEASE_BASE_URL = $url
    Invoke-Pnpm @("run", "test:release")
  } finally {
    if ($null -eq $previousBaseUrl) { Remove-Item Env:RELEASE_BASE_URL -ErrorAction SilentlyContinue }
    else { $env:RELEASE_BASE_URL = $previousBaseUrl }
  }
}

function Invoke-A11ySmoke([string]$url) {
  $previousBaseUrl = $env:A11Y_BASE_URL
  try {
    $env:A11Y_BASE_URL = $url
    Invoke-Pnpm @("run", "test:a11y")
  } finally {
    if ($null -eq $previousBaseUrl) { Remove-Item Env:A11Y_BASE_URL -ErrorAction SilentlyContinue }
    else { $env:A11Y_BASE_URL = $previousBaseUrl }
  }
}

Push-Location $root
try {
  $tokenPath = "C:\Users\xiuda\Documents\照片\cloudfileToken.txt"
  $cloudflareApiToken = $env:CLOUDFLARE_API_TOKEN
  if (-not $cloudflareApiToken -and (Test-Path -LiteralPath $tokenPath)) {
    $cloudflareApiToken = (Get-Content -LiteralPath $tokenPath -Raw).Trim()
  }
  if (-not $cloudflareApiToken) { throw "CLOUDFLARE_API_TOKEN is required for Cloudflare deployment." }
  $env:CLOUDFLARE_API_TOKEN = $cloudflareApiToken

  Invoke-Pnpm @("install", "--frozen-lockfile")
  Invoke-Pnpm @("test")
  Invoke-Pnpm @("run", "assets:optimize")
  Invoke-Pnpm @("run", "build")
  Invoke-Pnpm @("run", "test:build")

  foreach ($required in @("dist/index.html", "dist/sw.js", "dist/_headers")) {
    if (-not (Test-Path -LiteralPath (Join-Path $root $required))) { throw "Missing build output: $required" }
  }
  $metadata = Get-ReleaseMetadata
  Write-ReleaseMetadata $metadata "Local build"

  Invoke-WorkerDeploy
  Invoke-WorkerCorsSmoke
  Write-Output "Worker CORS gate passed: https://life-vlog-r2-upload.xiudan320-life.workers.dev"

  $previewUrl = Invoke-PagesDeploy $Branch
  Write-Output "Preview deployment: $previewUrl"
  Wait-ReleaseAlias "https://codex-preview.life-vlog-site.pages.dev" $metadata.entry
  Invoke-WorkerCorsSmoke
  Invoke-A11ySmoke "https://codex-preview.life-vlog-site.pages.dev"
  Invoke-ReleaseSmoke "https://codex-preview.life-vlog-site.pages.dev"
  Write-Output "Preview release gate passed: https://codex-preview.life-vlog-site.pages.dev"

  if ($Environment -eq "production") {
    $productionUrl = Invoke-PagesDeploy "main"
    Write-Output "Production deployment: $productionUrl"
    Wait-ReleaseAlias "https://life-vlog-site.pages.dev" $metadata.entry
    Invoke-WorkerCorsSmoke
    Invoke-A11ySmoke "https://life-vlog-site.pages.dev"
    Invoke-ReleaseSmoke "https://life-vlog-site.pages.dev"
    Write-Output "Production release gate passed: https://life-vlog-site.pages.dev"
  }
} finally {
  Remove-Item Env:CLOUDFLARE_API_TOKEN -ErrorAction SilentlyContinue
  Pop-Location
}
