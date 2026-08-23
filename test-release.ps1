param(
  [string]$BaseUrl = "https://life-vlog-site.pages.dev"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$credentialPath = Join-Path $env:LOCALAPPDATA "LifeVlog\release-test-credential.xml"
$pnpmCommand = Get-Command pnpm.cmd -ErrorAction SilentlyContinue
if (-not $pnpmCommand) {
  $pnpmCommand = Get-Command pnpm -ErrorAction SilentlyContinue
}
if (-not $pnpmCommand) {
  throw "pnpm is required for release verification."
}
$nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
if (-not $nodeCommand) {
  $pnpmDirectory = Split-Path -Parent $pnpmCommand.Source
  $dependencyRoot = Split-Path -Parent (Split-Path -Parent $pnpmDirectory)
  $bundledNode = Join-Path $dependencyRoot "node\bin\node.exe"
  if (Test-Path -LiteralPath $bundledNode) {
    $env:Path = "$(Split-Path -Parent $bundledNode);$env:Path"
  } else {
    throw "node is required for release verification."
  }
}

$tokenPath = Join-Path $root "cloudfileToken.txt"
$cloudflareToken = if ($env:CLOUDFLARE_API_TOKEN) {
  $env:CLOUDFLARE_API_TOKEN
} elseif (Test-Path -LiteralPath $tokenPath) {
  (Get-Content -Raw -LiteralPath $tokenPath).Trim()
} else {
  ""
}
if (-not $cloudflareToken) {
  throw "CLOUDFLARE_API_TOKEN or cloudfileToken.txt is required for the release fixture."
}

if (-not (Test-Path -LiteralPath $credentialPath)) {
  throw "Missing encrypted release test credential: $credentialPath"
}

$credential = Import-Clixml -LiteralPath $credentialPath
$plainPassword = $credential.GetNetworkCredential().Password
if (-not $credential.UserName -or -not $plainPassword) {
  throw "Encrypted release test credential is incomplete."
}

$env:RELEASE_BASE_URL = $BaseUrl.TrimEnd("/")
$env:RELEASE_TEST_USERNAME = $credential.UserName
$env:RELEASE_TEST_PASSWORD = $plainPassword
$fixturePhotoId = [guid]::NewGuid().ToString()
$fixtureTitle = "codex-release-favorite-$fixturePhotoId"
$env:RELEASE_TEST_FAVORITE_PHOTO_ID = $fixturePhotoId
$env:RELEASE_TEST_FAVORITE_TITLE = $fixtureTitle

function Invoke-ReleaseD1([string]$Sql) {
  $previousToken = $env:CLOUDFLARE_API_TOKEN
  $env:CLOUDFLARE_API_TOKEN = $cloudflareToken
  try {
    $output = & $pnpmCommand.Source dlx wrangler@latest d1 execute life-vlog-db --remote --command $Sql --json
    if ($LASTEXITCODE -ne 0) {
      throw "Remote D1 release fixture command failed."
    }
    return ($output | Out-String)
  } finally {
    if ($previousToken) {
      $env:CLOUDFLARE_API_TOKEN = $previousToken
    } else {
      Remove-Item Env:CLOUDFLARE_API_TOKEN -ErrorAction SilentlyContinue
    }
  }
}

$safeUsername = $credential.UserName.Replace("'", "''")
$safeTitle = $fixtureTitle.Replace("'", "''")
$safeBaseUrl = $env:RELEASE_BASE_URL.Replace("'", "''")
$insertFixtureSql = "insert into photos (id,user_id,title,note,category,taken_at,is_public,image_path,image_url,width,height,is_featured,is_pinned,created_at,updated_at) select '$fixturePhotoId',id,'$safeTitle','Automated favorite release fixture.','QA','2000-01-01T00:00:00.000Z',0,'','$safeBaseUrl/assets/home-logo.jpg',512,512,0,0,strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now') from users where username='$safeUsername' limit 1;"
$cleanupFixtureSql = "delete from notifications where photo_id='$fixturePhotoId'; delete from photo_favorites where photo_id='$fixturePhotoId'; delete from photo_comments where photo_id='$fixturePhotoId'; delete from photos where id='$fixturePhotoId';"
$locationPushed = $false

try {
  Invoke-ReleaseD1 $insertFixtureSql | Out-Null
  $fixtureCheck = Invoke-ReleaseD1 "select count(*) as fixture_count from photos where id='$fixturePhotoId';" | ConvertFrom-Json
  if ([int]$fixtureCheck[0].results[0].fixture_count -ne 1) {
    throw "Release favorite fixture was not created for the test account."
  }

  Push-Location $root
  $locationPushed = $true
  & $pnpmCommand.Source run test:release
  if ($LASTEXITCODE -ne 0) {
    throw "Release account verification failed."
  }
} finally {
  if ($locationPushed) {
    Pop-Location
  }
  Invoke-ReleaseD1 $cleanupFixtureSql | Out-Null
  Remove-Item Env:RELEASE_TEST_USERNAME -ErrorAction SilentlyContinue
  Remove-Item Env:RELEASE_TEST_PASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:RELEASE_TEST_FAVORITE_PHOTO_ID -ErrorAction SilentlyContinue
  Remove-Item Env:RELEASE_TEST_FAVORITE_TITLE -ErrorAction SilentlyContinue
  $plainPassword = $null
  $cloudflareToken = $null
}
