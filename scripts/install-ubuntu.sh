#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICE_NAME="${SERVICE_NAME:-mesh-server}"
ENV_FILE="${ENV_FILE:-/etc/mesh-server.env}"
USER_NAME="${USER_NAME:-$USER}"
GROUP_NAME="${GROUP_NAME:-$(id -gn "$USER_NAME")}"
MESH_HOST="${MESH_HOST:-127.0.0.1}"
MESH_PORT="${MESH_PORT:-8787}"
MESH_DATA_DIR="${MESH_DATA_DIR:-$HOME/.mesh-server}"
MESH_ALLOWED_ROOTS="${MESH_ALLOWED_ROOTS:-$HOME/projects}"
MESH_ADMIN_USER="${MESH_ADMIN_USER:-}"
MESH_ADMIN_PASSWORD="${MESH_ADMIN_PASSWORD:-}"
INSTALL_TUNNELS=0
START_SERVICE=1
CLOUDFLARE_TUNNEL_TOKEN="${CLOUDFLARE_TUNNEL_TOKEN:-}"
NGROK_AUTHTOKEN="${NGROK_AUTHTOKEN:-}"

usage() {
  cat <<'EOF'
Usage: ./scripts/install-ubuntu.sh [options]

Options:
  --install-tunnels             Install cloudflared and ngrok CLIs
  --cloudflare-token TOKEN      Install and run a cloudflared tunnel service
  --ngrok-token TOKEN           Configure ngrok authtoken for this user
  --host HOST                   Mesh bind host, default 127.0.0.1
  --port PORT                   Mesh bind port, default 8787
  --allowed-roots PATHS         Allowed workspace roots, default ~/projects
  --data-dir PATH               Mesh data dir, default ~/.mesh-server
  --admin-user USER             Optional first-boot admin username
  --admin-password PASSWORD     Optional first-boot admin password
  --no-start                    Install and build, but do not start systemd
  -h, --help                    Show this help

No browser links are opened. The script prints local/tunnel commands only.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --install-tunnels) INSTALL_TUNNELS=1; shift ;;
    --cloudflare-token) CLOUDFLARE_TUNNEL_TOKEN="${2:?missing token}"; INSTALL_TUNNELS=1; shift 2 ;;
    --ngrok-token) NGROK_AUTHTOKEN="${2:?missing token}"; INSTALL_TUNNELS=1; shift 2 ;;
    --host) MESH_HOST="${2:?missing host}"; shift 2 ;;
    --port) MESH_PORT="${2:?missing port}"; shift 2 ;;
    --allowed-roots) MESH_ALLOWED_ROOTS="${2:?missing path list}"; shift 2 ;;
    --data-dir) MESH_DATA_DIR="${2:?missing data dir}"; shift 2 ;;
    --admin-user) MESH_ADMIN_USER="${2:?missing username}"; shift 2 ;;
    --admin-password) MESH_ADMIN_PASSWORD="${2:?missing password}"; shift 2 ;;
    --no-start) START_SERVICE=0; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 2 ;;
  esac
done

need_sudo() {
  if [[ "$(id -u)" -eq 0 ]]; then
    "$@"
  else
    sudo "$@"
  fi
}

install_node_if_needed() {
  local major
  major="$(node -p 'Number(process.versions.node.split(".")[0])' 2>/dev/null || echo 0)"
  if [[ "$major" -ge 24 ]]; then
    return
  fi
  echo "Installing Node.js 24 apt repository..."
  need_sudo apt-get update
  need_sudo apt-get install -y ca-certificates curl gnupg
  local tmp_key
  tmp_key="$(mktemp)"
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key -o "$tmp_key"
  need_sudo install -d -m 0755 /etc/apt/keyrings
  gpg --dearmor < "$tmp_key" | need_sudo tee /etc/apt/keyrings/nodesource.gpg >/dev/null
  rm -f "$tmp_key"
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_24.x nodistro main" |
    need_sudo tee /etc/apt/sources.list.d/nodesource.list >/dev/null
  need_sudo apt-get update
  need_sudo apt-get install -y nodejs
}

install_cloudflared() {
  if command -v cloudflared >/dev/null 2>&1; then
    return
  fi
  echo "Installing cloudflared..."
  need_sudo apt-get install -y curl gnupg ca-certificates
  local tmp_key
  tmp_key="$(mktemp)"
  curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg -o "$tmp_key"
  need_sudo install -d -m 0755 /usr/share/keyrings
  gpg --dearmor < "$tmp_key" | need_sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
  rm -f "$tmp_key"
  echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main" |
    need_sudo tee /etc/apt/sources.list.d/cloudflared.list >/dev/null
  need_sudo apt-get update
  need_sudo apt-get install -y cloudflared
}

install_ngrok() {
  if command -v ngrok >/dev/null 2>&1; then
    return
  fi
  echo "Installing ngrok..."
  need_sudo apt-get install -y curl gnupg ca-certificates
  local tmp_key
  tmp_key="$(mktemp)"
  curl -fsSL https://ngrok-agent.s3.amazonaws.com/ngrok.asc -o "$tmp_key"
  need_sudo install -d -m 0755 /etc/apt/keyrings
  gpg --dearmor < "$tmp_key" | need_sudo tee /etc/apt/keyrings/ngrok.gpg >/dev/null
  rm -f "$tmp_key"
  echo "deb [signed-by=/etc/apt/keyrings/ngrok.gpg] https://ngrok-agent.s3.amazonaws.com buster main" |
    need_sudo tee /etc/apt/sources.list.d/ngrok.list >/dev/null
  need_sudo apt-get update
  need_sudo apt-get install -y ngrok
}

write_env() {
  local secret
  secret="$(openssl rand -base64 48 | tr -d '\n')"
  need_sudo install -d -m 0755 "$(dirname "$ENV_FILE")"
  need_sudo tee "$ENV_FILE" >/dev/null <<EOF
NODE_ENV=production
MESH_HOST=$MESH_HOST
MESH_PORT=$MESH_PORT
MESH_DATA_DIR=$MESH_DATA_DIR
MESH_ALLOWED_ROOTS=$MESH_ALLOWED_ROOTS
MESH_SESSION_SECRET=$secret
MESH_ADMIN_USER=$MESH_ADMIN_USER
MESH_ADMIN_PASSWORD=$MESH_ADMIN_PASSWORD
EOF
  need_sudo chmod 0600 "$ENV_FILE"
}

write_service() {
  need_sudo tee "/etc/systemd/system/${SERVICE_NAME}.service" >/dev/null <<EOF
[Unit]
Description=Mesh Server
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=$APP_DIR
EnvironmentFile=$ENV_FILE
ExecStart=$(command -v npm) start
Restart=always
RestartSec=5
User=$USER_NAME
Group=$GROUP_NAME
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=false

[Install]
WantedBy=multi-user.target
EOF
  need_sudo systemctl daemon-reload
  need_sudo systemctl enable "$SERVICE_NAME"
}

echo "Installing system packages..."
need_sudo apt-get update
need_sudo apt-get install -y build-essential python3 make g++ git curl ca-certificates gnupg openssl
install_node_if_needed

if [[ "$INSTALL_TUNNELS" -eq 1 ]]; then
  install_cloudflared
  install_ngrok
fi

if [[ -n "$NGROK_AUTHTOKEN" ]]; then
  ngrok config add-authtoken "$NGROK_AUTHTOKEN"
fi

mkdir -p "$MESH_ALLOWED_ROOTS" "$MESH_DATA_DIR"

echo "Installing npm dependencies..."
cd "$APP_DIR"
npm install --include=dev --foreground-scripts
npm run rebuild:pty
npm run doctor:pty
npm run build

write_env
write_service

if [[ -n "$CLOUDFLARE_TUNNEL_TOKEN" ]]; then
  echo "Installing cloudflared service from token..."
  need_sudo cloudflared service install "$CLOUDFLARE_TUNNEL_TOKEN"
fi

if [[ "$START_SERVICE" -eq 1 ]]; then
  need_sudo systemctl restart "$SERVICE_NAME"
  need_sudo systemctl --no-pager --full status "$SERVICE_NAME" || true
fi

cat <<EOF

Mesh Server installed.
Local URL: http://$MESH_HOST:$MESH_PORT

Tunnel commands:
  cloudflared tunnel --url http://127.0.0.1:$MESH_PORT
  ngrok http $MESH_PORT

No browser was opened.
EOF
