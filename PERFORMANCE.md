# Mesh Server Performance Notes

These are the practical settings for low-latency terminals on an Ubuntu VPS.

## Server Choices Already In Code

- PTY output is batched for 4 ms or 64 KiB, whichever comes first. This avoids
  websocket floods while keeping interactive typing responsive.
- Browser websocket reconnect uses exponential backoff and reattaches to the
  same server-side PTY.
- Closing or refreshing the browser does not kill the PTY. Explicit terminal
  close does.
- Server websocket heartbeat keeps tunnels and proxies from silently idling out.
- The first allowed workspace root is created on boot, so a fresh VPS can spawn
  a shell immediately.

## VPS Setup

Use a region close to you. Terminal feel is dominated by round-trip time:

- 0-40 ms: feels local
- 40-90 ms: good
- 90-160 ms: usable
- 160+ ms: noticeably delayed

Install native build requirements for `node-pty`:

```bash
sudo apt update
sudo apt install -y build-essential python3 make g++ nodejs npm
```

Use Node 24 or newer.

## Process Runtime

Run behind systemd and keep the app bound to loopback:

```bash
MESH_HOST=127.0.0.1
MESH_PORT=8787
MESH_ALLOWED_ROOTS=/home/mesh/projects
```

Expose through Cloudflare Tunnel or ngrok. Do not bind this app to `0.0.0.0`
unless it is behind a private firewall or reverse proxy with auth.

## Tunnel Settings

Cloudflare Tunnel is usually better for always-on use. Put Cloudflare Access in
front of it.

ngrok is good for short sessions. Enable OAuth or an edge policy.

## Terminal Count

For many simultaneous terminals:

- 1 vCPU / 1 GB RAM: 4-6 light shells
- 2 vCPU / 2 GB RAM: 8-12 agent shells
- 4 vCPU / 4 GB RAM: 12-20 agent shells

Most cost comes from the CLIs you launch inside the PTYs, not xterm.js.
