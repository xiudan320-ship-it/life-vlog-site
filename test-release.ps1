param(
  [string]$BaseUrl = "https://life-vlog-site.pages.dev"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$pnpmCommand = Get-Command pnpm.cmd -ErrorAction SilentlyContinue
if (-not $pnpmCommand) { $pnpmCommand = Get-Command pnpm -ErrorAction SilentlyContinue }
if (-not $pnpmCommand) { throw "pnpm is required for release verification." }

Push-Location $root
try {
  $env:RELEASE_BASE_URL = $BaseUrl.TrimEnd("/")
  & $pnpmCommand.Source run test:release
  if ($LASTEXITCODE -ne 0) { throw "Deterministic fixture release verification failed." }
} finally {
  Pop-Location
  Remove-Item Env:RELEASE_BASE_URL -ErrorAction SilentlyContinue
}
