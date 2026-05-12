# Cloudflare Tunnel

```bash
cloudflared tunnel login
cloudflared tunnel create mesh-server
cloudflared tunnel route dns mesh-server mesh.example.com
cloudflared tunnel run --url http://127.0.0.1:8787 mesh-server
```

Use Cloudflare Access in front of the hostname. Mesh app auth is still required.
