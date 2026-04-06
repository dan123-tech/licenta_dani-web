<#
.SYNOPSIS
  FleetShare - full server (Docker) bootstrap for Windows.

.DESCRIPTION
  Clones the full edition from GitHub, sets NEXT_PUBLIC_APP_URL / NEXTAUTH_URL
  from this machine's IPv4 and optional ports, then runs install.ps1 (Docker Compose).

  Download from your company /download page. Requires Docker Desktop + git.

.PARAMETER Parent
  Folder that will contain the project directory (default: current directory).

.PARAMETER Help
  Show help.
#>
param(
  [string]$Parent = ".",
  [switch]$Help
)

$ErrorActionPreference = "Stop"

if ($Help) {
  Get-Help $MyInvocation.MyCommand.Path -Full
  exit 0
}

$RepoDefault = "https://github.com/dan123-tech/licenta_dani-main.git"
if ($env:FLEETSHARE_SERVER_REPO -and $env:FLEETSHARE_SERVER_REPO.Trim()) {
  $Repo = $env:FLEETSHARE_SERVER_REPO.Trim()
} else {
  $Repo = $RepoDefault
}
if ($env:FLEETSHARE_INSTALL_DIR -and $env:FLEETSHARE_INSTALL_DIR.Trim()) {
  $DirName = $env:FLEETSHARE_INSTALL_DIR.Trim()
} else {
  $DirName = "licenta_dani-main"
}
if ($env:FLEETSHARE_HTTP_PORT -and $env:FLEETSHARE_HTTP_PORT.Trim()) {
  $HttpPort = $env:FLEETSHARE_HTTP_PORT.Trim()
} else {
  $HttpPort = "3000"
}
if ($env:FLEETSHARE_LAN_PROXY_PORT -and $env:FLEETSHARE_LAN_PROXY_PORT.Trim()) {
  $LanPort = $env:FLEETSHARE_LAN_PROXY_PORT.Trim()
} else {
  $LanPort = "3001"
}

function Write-Step { param($Msg) Write-Host "==> $Msg" -ForegroundColor Cyan }
function Write-Ok { param($Msg) Write-Host $Msg -ForegroundColor Green }
function Write-Warn { param($Msg) Write-Host $Msg -ForegroundColor Yellow }
function Write-Err { param($Msg) Write-Host $Msg -ForegroundColor Red }

Write-Host ""
Write-Host "------------------------------------------------------------" -ForegroundColor Cyan
Write-Host "  FleetShare - full server (Docker) bootstrap (Windows)" -ForegroundColor Cyan
Write-Host "------------------------------------------------------------" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $Parent -PathType Container)) {
  Write-Err "Not a directory: $Parent"
  exit 1
}
$ParentFull = (Resolve-Path $Parent).Path
$Root = Join-Path $ParentFull $DirName

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Err "Docker not found. Install Docker Desktop."
  exit 1
}
docker info 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Err "Docker daemon is not running."
  exit 1
}
docker compose version 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Err "Docker Compose V2 not available."
  exit 1
}
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Err "git not found. Install Git for Windows."
  exit 1
}

# Do not use $HostIp - PowerShell may parse it as automatic $Host + "Ip" and break the script.
$PublicIp = $null
if ($env:FLEETSHARE_PUBLIC_HOST -and $env:FLEETSHARE_PUBLIC_HOST.Trim()) {
  $PublicIp = $env:FLEETSHARE_PUBLIC_HOST.Trim()
}
if (-not $PublicIp) {
  try {
    $addrs = @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop | Where-Object { $_.IPAddress -notlike "127.*" })
    if ($addrs.Count -gt 0) {
      $PublicIp = [string]$addrs[0].IPAddress
    }
  } catch {
    $PublicIp = $null
  }
}
if (-not $PublicIp) {
  $PublicIp = "127.0.0.1"
  Write-Warn "Could not detect LAN IPv4; using 127.0.0.1. Set environment variable FLEETSHARE_PUBLIC_HOST if you need another address."
}

$BaseUrl = "http://" + $PublicIp + ":" + $HttpPort

Write-Host "Repository: $Repo" -ForegroundColor DarkGray
Write-Host "Target: $Root" -ForegroundColor DarkGray
Write-Host "Public URL: $BaseUrl" -ForegroundColor DarkGray
Write-Host ""

if (Test-Path (Join-Path $Root "docker-compose.yml")) {
  Write-Host "Folder exists with docker-compose.yml - skipping clone." -ForegroundColor DarkGray
} else {
  if (Test-Path $Root) {
    Write-Err "Path exists but is not a clone: $Root"
    exit 1
  }
  Write-Step "Cloning..."
  git clone --depth 1 $Repo $Root
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Set-Location $Root

$envFile = Join-Path $Root ".env"
if (-not (Test-Path $envFile)) {
  $ex = Join-Path $Root ".env.example"
  if (Test-Path $ex) {
    Copy-Item $ex $envFile
    Write-Ok "Created .env from .env.example"
  } else {
    Write-Err "No .env.example in repo."
    exit 1
  }
}

Get-Content $envFile | Where-Object { $_ -notmatch '^\s*(NEXT_PUBLIC_APP_URL|NEXTAUTH_URL)=' } | Set-Content $envFile -Encoding utf8
Add-Content $envFile ("NEXT_PUBLIC_APP_URL=" + $BaseUrl)
Add-Content $envFile ("NEXTAUTH_URL=" + $BaseUrl)

$authLine = Get-Content $envFile | Where-Object { $_ -match '^\s*AUTH_SECRET=' } | Select-Object -First 1
if ($authLine) {
  $parts = $authLine -split "=", 2
  $secretVal = $parts[1].Trim().Trim([char]0x22).Trim([char]0x27)
} else {
  $secretVal = ""
}
if ($secretVal.Length -lt 32) {
  Get-Content $envFile | Where-Object { $_ -notmatch '^\s*AUTH_SECRET=' } | Set-Content $envFile -Encoding utf8
  $bytes = New-Object byte[] 32
  $rng = New-Object System.Security.Cryptography.RNGCryptoServiceProvider
  $rng.GetBytes($bytes)
  $rand = [Convert]::ToBase64String($bytes)
  Add-Content $envFile ("AUTH_SECRET=" + $rand)
  Write-Ok "Set AUTH_SECRET (random)."
}

if ($HttpPort -ne "3000" -or $LanPort -ne "3001") {
  $cf = Join-Path $Root "docker-compose.yml"
  $c = Get-Content $cf -Raw
  $c = $c.Replace('"3000:3000"', ('"' + $HttpPort + ':3000"'))
  $c = $c.Replace('"3001:3001"', ('"' + $LanPort + ':3001"'))
  Set-Content $cf $c -NoNewline -Encoding utf8
}

Write-Step "Running install.ps1 (build may take several minutes)..."
& (Join-Path $Root "install.ps1")
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Ok ("Done. Open from LAN: " + $BaseUrl)
Write-Host ("This PC: http://127.0.0.1:" + $HttpPort) -ForegroundColor DarkGray
Write-Host "If URLs were wrong, edit .env then rebuild the app image (see README)." -ForegroundColor DarkGray
Write-Host ""
