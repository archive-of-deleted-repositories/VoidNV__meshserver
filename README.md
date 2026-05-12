# Mesh Server

<p align="center">
  <strong>Mesh Desktop design, running as a VPS web terminal.</strong>
</p>

<p align="center">
  <img alt="Server" src="https://img.shields.io/badge/runtime-Node%2024-0b0b0d?style=flat-square" />
  <img alt="Fastify" src="https://img.shields.io/badge/backend-Fastify-111827?style=flat-square" />
  <img alt="PTY" src="https://img.shields.io/badge/PTY-node--pty-9be7b7?style=flat-square" />
  <img alt="Auth" src="https://img.shields.io/badge/auth-HTTP--only%20cookie-0b0b0d?style=flat-square" />
  <img alt="Tunnel" src="https://img.shields.io/badge/tunnels-ngrok%20%7C%20Cloudflare-9be7b7?style=flat-square" />
</p>

---

## What It Is

Mesh Server is the server-only edition of Mesh. It keeps the desktop app's TSX
layout and matte terminal UI, but replaces Tauri with a backend that owns the
real work: PTYs, files, skills, CLI detection, auth, workspace metadata, and VPS
stats.

```text
Browser UI
   |
   | HTTPS through ngrok / Cloudflare Tunnel
   v
Fastify backend on 127.0.0.1:8787
   |        |          |          |
 node-pty  SQLite     files      skills
 real sh   metadata   allowlist  ~/.mesh-server/skills
```

## Feature Grid

| Area | What Mesh Server Does |
| --- | --- |
| **Terminals** | Real server-side PTYs through `node-pty`; browser reconnect does not kill shells |
| **Design** | One-to-one reuse of the desktop TSX/CSS interface, with web shims replacing Tauri |
| **Workspaces** | SQLite metadata plus terminal scrollback logs under `~/.mesh-server` |
| **Files** | Server filesystem browser with `MESH_ALLOWED_ROOTS` traversal protection |
| **Skills** | Import/save/delete Markdown skills, stored in SQLite and optional files |
| **Detection** | Finds `claude`, `codex`, `gemini`, `opencode`, `cursor`, `kiro-cli`, `droid`, shells, `ngrok`, and `cloudflared` |
| **Security** | Required login, HTTP-only cookie, websocket session/origin validation |
| **VPS UX** | Compact top/bottom bars, panel collapse controls, server CPU/RAM/network/disk stats |

## Quick Start

```bash
cd "Mesh Server"
npm install
npm run rebuild:pty
npm run doctor:pty
npm run dev
```

Open locally:

```text
http://127.0.0.1:8787
```

Dev mode runs Vite on `5174`, but the backend on `8787` proxies it. Tunnel the
backend port only:

```bash
ngrok http 8787
```

Cloudflare quick tunnel:

```bash
cloudflared tunnel --url http://127.0.0.1:8787
```

## Ubuntu VPS Install

The installer does not open browser links. It installs build/runtime packages,
optionally installs tunnel CLIs, rebuilds `node-pty`, builds Mesh Server, writes
`/etc/mesh-server.env`, creates a systemd service, and starts it.

```bash
chmod +x scripts/install-ubuntu.sh
./scripts/install-ubuntu.sh --install-tunnels
```

Useful variants:

```bash
./scripts/install-ubuntu.sh --allowed-roots /root:/root/projects
./scripts/install-ubuntu.sh --cloudflare-token "$CLOUDFLARE_TUNNEL_TOKEN"
./scripts/install-ubuntu.sh --ngrok-token "$NGROK_AUTHTOKEN"
./scripts/install-ubuntu.sh --no-start
```

## Production

```bash
npm run build
npm start
```

The production server serves the built client and API from:

```text
http://127.0.0.1:8787
```

## Native PTY Check

If Ubuntu reports `Failed to load native module: pty.node`, rebuild the binding:

```bash
sudo apt-get update
sudo apt-get install -y build-essential python3 make g++
npm run rebuild:pty
npm run doctor:pty
```

## Environment

```bash
MESH_HOST=127.0.0.1
MESH_PORT=8787
MESH_DATA_DIR=~/.mesh-server
MESH_ALLOWED_ROOTS=~:~/projects
MESH_ADMIN_USER=admin
MESH_ADMIN_PASSWORD=change-this-before-first-boot
MESH_ALLOWED_ORIGINS=https://your-domain.example
```

`MESH_ALLOWED_ROOTS` uses `:` on Linux/macOS and `;` on Windows. Default roots
are `~` and `~/projects`.

## Security Model

```text
Public internet
   |
Tunnel/proxy auth recommended
   |
Mesh login required
   |
HTTP-only session cookie
   |
Filesystem allowlist + websocket origin/session validation
```

- Keep the app bound to `127.0.0.1`.
- Use Cloudflare Access or ngrok auth for public URLs.
- App auth remains required even behind a tunnel.
- File APIs reject paths outside `MESH_ALLOWED_ROOTS`.

## Folder Layout

```text
Mesh Server/
├── server/src/
│   ├── index.ts          # Fastify routes, static/proxy serving
│   ├── auth.ts           # first admin, login, sessions
│   ├── db.ts             # SQLite schema
│   ├── ptyManager.ts     # node-pty lifecycle and websocket fanout
│   └── services/         # files, skills, detect, stats
├── client/src/           # copied Mesh desktop TSX/CSS + web shims
├── shared/               # shared types and zod schemas
└── scripts/              # install, systemd, tunnel notes
```

## Notes

Terminal processes stay alive while the server process runs. If the server
restarts, live PTYs are gone, but workspaces, skills, metadata, and scrollback
logs remain.
