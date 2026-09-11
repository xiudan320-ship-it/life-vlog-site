param(
  [ValidateSet("preview", "production")]
  [string]$Environment = "production"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$pnpmCommand = Get-Command pnpm.cmd -ErrorAction SilentlyContinue
if (-not $pnpmCommand) { $pnpmCommand = Get-Command pnpm -ErrorAction SilentlyContinue }
if (-not $pnpmCommand) { throw "pnpm is required for deployment." }

function Invoke-GitCapture([string[]]$Arguments) {
  $output = & git @Arguments
  if ($LASTEXITCODE -ne 0) { throw "Git release check failed: git $($Arguments -join ' ')" }
  return ($output -join "`n").Trim()
}

function Assert-ReleaseSource {
  if ((Invoke-GitCapture @("branch", "--show-current")) -ne "main") { throw "Release must run from main." }
  if (Invoke-GitCapture @("status", "--porcelain")) { throw "Commit all intended changes before release; working tree must be clean." }
  $head = Invoke-GitCapture @("rev-parse", "HEAD")
  if ($head -ne (Invoke-GitCapture @("rev-parse", "origin/main"))) { throw "Push main and synchronize origin/main before release." }
  if ($script:releaseCommit -and $head -ne $script:releaseCommit) { throw "Source changed during release." }
  return $head
}

function Get-BuildFingerprint {
  return ((Get-ChildItem -LiteralPath (Join-Path $root "dist") -File -Recurse | Sort-Object FullName | ForEach-Object {
    "$($_.FullName.Substring($root.Length)):$((Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash)"
  }) -join "`n")
}

function Assert-ReleaseUnchanged {
  Invoke-GitCapture @("fetch", "origin") | Out-Null
  Assert-ReleaseSource | Out-Null
  if ((Get-BuildFingerprint) -ne $script:releaseFingerprint) { throw "Build changed during release; restart validation." }
}

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
  Push-Location $root
  try {
    & $pnpmCommand.Source "exec" "wrangler" "deploy" "--config" "cloudflare-worker/wrangler.toml"
    if ($LASTEXITCODE -ne 0) { throw "Cloudflare Worker deployment failed." }
  } finally { Pop-Location }
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
  Assert-ReleaseUnchanged
  $deployArgs = @("exec", "wrangler", "pages", "deploy", "dist", "--project-name", "life-vlog-site", "--branch", $branch, "--commit-hash", $script:releaseCommit)
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
      $cacheBust = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
      $response = Invoke-WebRequest -Uri "$url/?release=$entry&probe=$cacheBust" -UseBasicParsing -TimeoutSec 10
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
$previousToken = $env:CLOUDFLARE_API_TOKEN
$script:releaseCommit = $null
try {
  Invoke-GitCapture @("fetch", "origin") | Out-Null
  $script:releaseCommit = Assert-ReleaseSource
  Write-Output "Release source: main $script:releaseCommit"
  $tokenPath = Join-Path $root "cloudfileToken.txt"
  $cloudflareApiToken = $env:CLOUDFLARE_API_TOKEN
  if (-not $cloudflareApiToken -and (Test-Path -LiteralPath $tokenPath)) {
    $cloudflareApiToken = (Get-Content -LiteralPath $tokenPath -Raw).Trim()
  }
  if (-not $cloudflareApiToken) { throw "CLOUDFLARE_API_TOKEN is required for Cloudflare deployment." }
  $env:CLOUDFLARE_API_TOKEN = $cloudflareApiToken

  Invoke-Pnpm @("install", "--frozen-lockfile")
  Invoke-Pnpm @("test")

  foreach ($required in @("dist/index.html", "dist/sw.js", "dist/_headers")) {
    if (-not (Test-Path -LiteralPath (Join-Path $root $required))) { throw "Missing build output: $required" }
  }
  $metadata = Get-ReleaseMetadata
  Write-ReleaseMetadata $metadata "Local build"
  $script:releaseFingerprint = Get-BuildFingerprint
  Invoke-Pnpm @("run", "test:release-local")
  Assert-ReleaseUnchanged

  $previewUrl = Invoke-PagesDeploy "codex-preview"
  Write-Output "Preview deployment: $previewUrl"
  Wait-ReleaseAlias "https://codex-preview.life-vlog-site.pages.dev" $metadata.entry
  Invoke-A11ySmoke "https://codex-preview.life-vlog-site.pages.dev"
  Invoke-ReleaseSmoke "https://codex-preview.life-vlog-site.pages.dev"
  Write-Output "Preview release gate passed: https://codex-preview.life-vlog-site.pages.dev"

  if ($Environment -eq "preview") { return }

  Assert-ReleaseUnchanged
  Invoke-WorkerDeploy
  Invoke-WorkerCorsSmoke
  Write-Output "Worker CORS gate passed: https://life-vlog-r2-upload.xiudan320-life.workers.dev"

  $productionUrl = Invoke-PagesDeploy "main"
  Write-Output "Production deployment: $productionUrl"
  Wait-ReleaseAlias "https://life-vlog-site.pages.dev" $metadata.entry
  Invoke-WorkerCorsSmoke
  Invoke-A11ySmoke "https://life-vlog-site.pages.dev"
  Invoke-ReleaseSmoke "https://life-vlog-site.pages.dev"
  Write-Output "Production release gate passed: https://life-vlog-site.pages.dev"
} finally {
  if ($null -eq $previousToken) { Remove-Item Env:CLOUDFLARE_API_TOKEN -ErrorAction SilentlyContinue }
  else { $env:CLOUDFLARE_API_TOKEN = $previousToken }
  Pop-Location
}
