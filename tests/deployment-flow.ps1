$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$source = Get-Content -Raw (Join-Path $root "deploy-cloudflare-pages.ps1")
$tokens = $null
$errors = $null
$ast = [Management.Automation.Language.Parser]::ParseInput($source, [ref]$tokens, [ref]$errors)
if ($errors.Count) { throw ($errors | Out-String) }
$functions = $ast.FindAll({ param($node) $node -is [Management.Automation.Language.FunctionDefinitionAst] }, $false)
foreach ($definition in $functions) { Invoke-Expression $definition.Extent.Text }

function Expect-Failure([scriptblock]$Action, [string]$Message) {
  try { & $Action } catch {
    if ($_.Exception.Message -notlike "*$Message*") { throw }
    return
  }
  throw "Expected failure: $Message"
}

# Git and build states are deterministic fixtures; no repository mutations or remote calls.
function Invoke-GitCapture([string[]]$Arguments) {
  switch ($Arguments -join " ") {
    "branch --show-current" { return $script:branch }
    "status --porcelain" { return $script:dirty }
    "rev-parse HEAD" { return $script:head }
    "rev-parse origin/main" { return $script:remote }
    "fetch origin" { if ($script:fetchFails) { throw "fetch failed" }; return }
    default { throw "Unexpected git call" }
  }
}
$script:branch = "main"; $script:dirty = ""; $script:head = "fixture-a"; $script:remote = "fixture-a"
$script:releaseCommit = $null
if ((Assert-ReleaseSource) -ne "fixture-a") { throw "Clean main rejected" }
foreach ($value in @("codex/task", "")) {
  $script:branch = $value
  Expect-Failure { Assert-ReleaseSource } "from main"
}
$script:branch = "main"; $script:dirty = " M app.js"
Expect-Failure { Assert-ReleaseSource } "working tree must be clean"
$script:dirty = ""; $script:remote = "fixture-b"
Expect-Failure { Assert-ReleaseSource } "synchronize"
$script:remote = "fixture-a"; $script:releaseCommit = "fixture-b"
Expect-Failure { Assert-ReleaseSource } "Source changed"
$script:releaseCommit = "fixture-a"
function Get-BuildFingerprint { return $script:fingerprint }
$script:fingerprint = "build-a"; $script:releaseFingerprint = "build-a"
Assert-ReleaseUnchanged
$script:fingerprint = "build-b"
Expect-Failure { Assert-ReleaseUnchanged } "Build changed"
$script:fingerprint = "build-a"; $script:fetchFails = $true
Expect-Failure { Assert-ReleaseUnchanged } "fetch failed"
$script:fetchFails = $false

# Execute the real top-level orchestration with only side effects replaced.
function Record([string]$Event) {
  $script:events.Add($Event)
  if ($Event -eq $script:failureAt) { throw "fixture gate failure" }
}
function Invoke-Pnpm([string[]]$Arguments) { Record ($Arguments -join " ") }
function Get-ReleaseMetadata { return @{ entry = "fixture.js" } }
function Write-ReleaseMetadata { }
function Invoke-WorkerDeploy { Record "worker" }
function Invoke-WorkerCorsSmoke { Record "cors" }
function Invoke-PagesDeploy([string]$branch) { Assert-ReleaseUnchanged; Record "upload:$branch"; return "https://fixture.invalid" }
function Wait-ReleaseAlias { }
function Invoke-A11ySmoke([string]$url) { Record "axe:$url" }
function Invoke-ReleaseSmoke([string]$url) { Record "smoke:$url" }
function Test-Path { return $true }
$body = $source.Substring($source.IndexOf('Push-Location $root'))
$savedToken = $env:CLOUDFLARE_API_TOKEN
try {
  $env:CLOUDFLARE_API_TOKEN = "fixture-deployment-token"
  $expected = @("install --frozen-lockfile", "test", "run test:release-local", "worker", "cors", "upload:codex-preview", "cors", "axe:https://codex-preview.life-vlog-site.pages.dev", "smoke:https://codex-preview.life-vlog-site.pages.dev", "upload:main", "cors", "axe:https://life-vlog-site.pages.dev", "smoke:https://life-vlog-site.pages.dev")
  $Environment = "production"
  $script:events = [Collections.Generic.List[string]]::new(); $script:failureAt = ""
  Invoke-Expression $body | Out-Null
  if (($script:events -join "|") -ne ($expected -join "|")) { throw "Unexpected release sequence: $script:events" }
  foreach ($gate in @("test", "run test:release-local", "worker", "cors", "upload:codex-preview", "axe:https://codex-preview.life-vlog-site.pages.dev", "smoke:https://codex-preview.life-vlog-site.pages.dev")) {
    $script:events = [Collections.Generic.List[string]]::new(); $script:failureAt = $gate
    Expect-Failure { Invoke-Expression $body | Out-Null } "fixture gate failure"
    if ($script:events.Contains("upload:main")) { throw "Production ran after failed gate: $gate" }
    if ($env:CLOUDFLARE_API_TOKEN -ne "fixture-deployment-token") { throw "Caller environment not restored" }
  }
  $Environment = "preview"; $script:failureAt = ""; $script:events = [Collections.Generic.List[string]]::new()
  Invoke-Expression $body | Out-Null
  if ($script:events.Contains("upload:main")) { throw "Preview-only run published production" }
} finally {
  $env:CLOUDFLARE_API_TOKEN = $savedToken
}
Write-Output "Deployment fixture checks passed: source guards, build drift, gate failures, production order and preview-only mode."
