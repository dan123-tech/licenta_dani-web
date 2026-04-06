#!/usr/bin/env bash
# FleetShare — full server (Docker) bootstrap for Linux / macOS.
# Download from your company /download page. Clones the full edition repo (same as folder licenta_dani-main),
# detects this machine's primary IPv4, sets NEXT_PUBLIC_APP_URL / NEXTAUTH_URL, optional host ports, then runs ./install.sh
#
# Requires: Docker (Compose V2), git
#
# Usage:
#   chmod +x fleetshare-full-server-install.sh
#   ./fleetshare-full-server-install.sh                  # clone into ./licenta_dani-main under current dir
#   ./fleetshare-full-server-install.sh ..               # parent folder (e.g. put project next to Downloads)
#   FLEETSHARE_HTTP_PORT=8080 ./fleetshare-full-server-install.sh
#   FLEETSHARE_SERVER_REPO=https://github.com/you/your-fork.git ./fleetshare-full-server-install.sh
#
# Environment (optional):
#   FLEETSHARE_SERVER_REPO   Git URL (default: https://github.com/dan123-tech/licenta_dani-main.git)
#   FLEETSHARE_INSTALL_DIR   Folder name to clone into (default: licenta_dani-main)
#   FLEETSHARE_HTTP_PORT     Host port mapped to app :3000 (default: 3000)
#   FLEETSHARE_LAN_PROXY_PORT Host port for :3001 (default: 3001)
#   FLEETSHARE_PUBLIC_HOST   If set, skip IP detection and use this host (e.g. fleet.company.com)
set -euo pipefail

REPO_DEFAULT="https://github.com/dan123-tech/licenta_dani-main.git"
REPO="${FLEETSHARE_SERVER_REPO:-$REPO_DEFAULT}"
DIR_NAME="${FLEETSHARE_INSTALL_DIR:-licenta_dani-main}"
HTTP_PORT="${FLEETSHARE_HTTP_PORT:-3000}"
LAN_PORT="${FLEETSHARE_LAN_PROXY_PORT:-3001}"

PARENT="${1:-.}"
if [[ ! -d "$PARENT" ]]; then
  echo "Not a directory: $PARENT"
  exit 1
fi
PARENT="$(cd "$PARENT" && pwd)"
ROOT="$PARENT/$DIR_NAME"

RED='\033[0;31m'
GRN='\033[0;32m'
YLW='\033[0;33m'
CYA='\033[0;36m'
DIM='\033[0;90m'
RST='\033[0m'
if [[ ! -t 1 ]]; then RED= GRN= YLW= CYA= DIM= RST=; fi

usage() {
  cat <<'EOF'
FleetShare full server — bootstrap (clone + .env + Docker install)

Usage:
  ./fleetshare-full-server-install.sh [PARENT_DIR]

  PARENT_DIR   Where to create the project folder (default: current directory)

Optional env:
  FLEETSHARE_SERVER_REPO, FLEETSHARE_INSTALL_DIR, FLEETSHARE_HTTP_PORT,
  FLEETSHARE_LAN_PROXY_PORT, FLEETSHARE_PUBLIC_HOST

Requires: git, Docker with Compose V2
EOF
  exit 0
}

[[ "${1:-}" == "-h" || "${1:-}" == "--help" ]] && usage

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || { echo -e "${RED}Missing command: $1${RST}"; exit 1; }
}

detect_ipv4() {
  local ip=""
  if [[ -n "${FLEETSHARE_PUBLIC_HOST:-}" ]]; then
    echo "$FLEETSHARE_PUBLIC_HOST"
    return
  fi
  if command -v ip >/dev/null 2>&1; then
    ip="$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src"){print $(i+1); exit}}' || true)"
  fi
  if [[ -z "$ip" ]] && command -v hostname >/dev/null 2>&1; then
    ip="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"
  fi
  if [[ -z "$ip" ]]; then
    ip="127.0.0.1"
    echo -e "${YLW}Could not detect LAN IPv4 — using 127.0.0.1. Set FLEETSHARE_PUBLIC_HOST or edit .env URLs.${RST}" >&2
  fi
  echo "$ip"
}

merge_env_urls() {
  local env_file="$1" base_url="$2"
  local tmp
  tmp="$(mktemp)"
  if [[ -f "$env_file" ]]; then
    grep -vE '^[[:space:]]*(NEXT_PUBLIC_APP_URL|NEXTAUTH_URL)=' "$env_file" >"$tmp" || true
    mv "$tmp" "$env_file"
  fi
  echo "NEXT_PUBLIC_APP_URL=${base_url}" >>"$env_file"
  echo "NEXTAUTH_URL=${base_url}" >>"$env_file"
}

ensure_auth_secret() {
  local env_file="$1"
  local line val len
  line="$(grep -E '^[[:space:]]*AUTH_SECRET=' "$env_file" 2>/dev/null | head -1 || true)"
  val="${line#*=}"
  val="${val//\"/}"
  val="${val//\'/}"
  len="${#val}"
  if [[ "$len" -lt 32 ]]; then
    tmp="$(mktemp)"
    grep -vE '^[[:space:]]*AUTH_SECRET=' "$env_file" >"$tmp" 2>/dev/null || true
    mv "$tmp" "$env_file"
    if command -v openssl >/dev/null 2>&1; then
      echo "AUTH_SECRET=$(openssl rand -base64 32)" >>"$env_file"
      echo -e "${GRN}Set AUTH_SECRET (random 32+ chars).${RST}"
    else
      echo -e "${YLW}Add AUTH_SECRET= (32+ chars) to $env_file — openssl not found.${RST}"
    fi
  fi
}

patch_compose_ports() {
  local f="$1"
  [[ -f "$f" ]] || return
  if [[ "$HTTP_PORT" == "3000" && "$LAN_PORT" == "3001" ]]; then
    return
  fi
  if command -v perl >/dev/null 2>&1; then
    perl -i.bak -pe "s/\"3000:3000\"/\"${HTTP_PORT}:3000\"/g; s/\"3001:3001\"/\"${LAN_PORT}:3001\"/g" "$f"
    rm -f "${f}.bak" 2>/dev/null || true
  else
    sed -i.bak \
      -e "s/\"3000:3000\"/\"${HTTP_PORT}:3000\"/" \
      -e "s/\"3001:3001\"/\"${LAN_PORT}:3001\"/" "$f" 2>/dev/null || {
      echo -e "${YLW}Could not patch docker-compose.yml ports (install perl or edit ports manually).${RST}"
    }
    rm -f "${f}.bak" 2>/dev/null || true
  fi
}

echo -e "${CYA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RST}"
echo -e "${CYA}  FleetShare — full server (Docker) bootstrap${RST}"
echo -e "${CYA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RST}"

need_cmd git
need_cmd docker
if ! docker info >/dev/null 2>&1; then
  echo -e "${RED}Docker is not running or you lack permission.${RST}"
  exit 1
fi
if docker compose version >/dev/null 2>&1; then
  :
elif docker-compose version >/dev/null 2>&1; then
  :
else
  echo -e "${RED}Docker Compose not found.${RST}"
  exit 1
fi

HOST_IP="$(detect_ipv4)"
BASE_URL="http://${HOST_IP}:${HTTP_PORT}"

echo -e "${DIM}Repository:${RST} $REPO"
echo -e "${DIM}Target:${RST} $ROOT"
echo -e "${DIM}Public URL (cookies / links):${RST} $BASE_URL"
echo ""

if [[ -f "$ROOT/docker-compose.yml" ]]; then
  echo -e "${DIM}Folder exists with docker-compose.yml — skipping clone.${RST}"
else
  if [[ -e "$ROOT" ]]; then
    echo -e "${RED}Path exists but is not a FleetShare clone: $ROOT${RST}"
    exit 1
  fi
  echo -e "${CYA}==>${RST} Cloning…"
  git clone --depth 1 "$REPO" "$ROOT"
fi

cd "$ROOT"

if [[ ! -f .env ]]; then
  if [[ -f .env.example ]]; then
    cp .env.example .env
    echo -e "${GRN}Created .env from .env.example${RST}"
  else
    echo -e "${RED}No .env.example in repo.${RST}"
    exit 1
  fi
fi

merge_env_urls ".env" "$BASE_URL"
ensure_auth_secret ".env"
patch_compose_ports "docker-compose.yml"

if [[ ! -x ./install.sh ]]; then
  chmod +x install.sh 2>/dev/null || true
fi

echo -e "${CYA}==>${RST} Running Docker installer (build may take several minutes)…"
bash ./install.sh

echo ""
echo -e "${GRN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RST}"
echo -e "${GRN}  Done${RST}"
echo -e "${GRN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RST}"
echo -e "  Open from other devices on your network: ${CYA}${BASE_URL}${RST}"
echo -e "  This machine: ${CYA}http://127.0.0.1:${HTTP_PORT}${RST}"
echo -e "${DIM}  HTTPS (Caddy): see docker-compose / deploy/certs — often https://localhost:8443${RST}"
echo -e "${DIM}  If URLs were wrong, edit .env then: docker compose build --no-cache app && docker compose up -d app${RST}"
echo ""
