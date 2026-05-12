import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import fastify from "fastify";
import cookie from "@fastify/cookie";
import websocket from "@fastify/websocket";
import fastifyStatic from "@fastify/static";
import { config } from "./config.js";
import { db, now } from "./db.js";
import {
  clearSession,
  createSession,
  createUser,
  ensureBootstrapAdmin,
  getUserFromRequest,
  hasUsers,
  login,
  requireAuth
} from "./auth.js";
import { fsListSchema, fsReadSchema, fsWriteSchema, loginSchema, skillSaveSchema, terminalCreateSchema, workspaceUpsertSchema } from "../../shared/schemas.js";
import { allowedRoots, homePath, listDir, readFile, writeFile } from "./services/files.js";
import { detectTools } from "./services/detect.js";
import { defaultSkillDir, deleteSkill, discover, discoverIn, listRoots, saveSkill } from "./services/skills.js";
import { getServerStats } from "./services/stats.js";
import { attachClient, createOrAttachTerminal, getScrollback, killTerminal, terminalRecords } from "./ptyManager.js";

ensureBootstrapAdmin();
for (const root of allowedRoots()) {
  fs.mkdirSync(root, { recursive: true });
}

const app = fastify({ logger: true });
await app.register(cookie);
await app.register(websocket);

app.addHook("preHandler", async (req, reply) => {
  if (!req.url.startsWith("/api/")) return;
  if (req.url.startsWith("/api/auth/")) return;
  await requireAuth(req, reply);
});

app.get("/api/auth/status", async (req) => ({
  setupRequired: !hasUsers(),
  user: getUserFromRequest(req)
}));

app.post("/api/auth/setup", async (req, reply) => {
  if (hasUsers()) return reply.code(409).send({ error: "admin user already exists" });
  const body = loginSchema.parse(req.body);
  const user = createUser(body.username, body.password);
  createSession(reply, user);
  return { user };
});

app.post("/api/auth/login", async (req, reply) => {
  const body = loginSchema.parse(req.body);
  const user = login(body.username, body.password);
  if (!user) return reply.code(401).send({ error: "invalid credentials" });
  createSession(reply, user);
  return { user };
});

app.post("/api/auth/logout", async (req, reply) => {
  clearSession(req, reply);
  return { ok: true };
});

app.get("/api/workspaces", async () => {
  return db.prepare("SELECT * FROM workspaces ORDER BY updated_at DESC").all();
});

app.put("/api/workspaces/:id", async (req) => {
  const body = workspaceUpsertSchema.parse(req.body);
  db.prepare(
    `INSERT INTO workspaces (id, name, color, cwd, mode, state_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name=excluded.name,
       color=excluded.color,
       cwd=excluded.cwd,
       mode=excluded.mode,
       state_json=excluded.state_json,
       updated_at=excluded.updated_at`
  ).run(body.id, body.name, body.color, body.cwd, body.mode, body.stateJson, now(), now());
  return { ok: true };
});

app.delete("/api/workspaces/:id", async (req) => {
  const { id } = req.params as { id: string };
  db.prepare("DELETE FROM workspaces WHERE id = ?").run(id);
  return { ok: true };
});

app.get("/api/fs/home", async () => ({ path: homePath(), roots: allowedRoots() }));
app.get("/api/fs/list", async (req) => listDir(fsListSchema.parse(req.query).path));
app.get("/api/fs/read", async (req) => {
  const input = fsReadSchema.parse(req.query);
  return { contents: await readFile(input.path, input.maxBytes ?? 1_000_000) };
});
app.post("/api/fs/write", async (req) => {
  const input = fsWriteSchema.parse(req.body);
  await writeFile(input.path, input.contents);
  return { ok: true };
});

app.get("/api/detect/tools", async () => detectTools());
app.get("/api/server/stats", async () => getServerStats());

app.get("/api/skills/discover", async () => discover());
app.get("/api/skills/discover-in", async (req) => {
  const dir = String((req.query as { dir?: string }).dir || "");
  return discoverIn(dir);
});
app.get("/api/skills/roots", async () => listRoots());
app.get("/api/skills/default-dir", async () => ({ path: defaultSkillDir() }));
app.post("/api/skills/save", async (req) => ({ path: await saveSkill(skillSaveSchema.parse(req.body)) }));
app.post("/api/skills/delete", async (req) => {
  const file = String((req.body as { path?: string }).path || "");
  await deleteSkill(file);
  return { ok: true };
});

app.get("/api/terminals", async () => terminalRecords());
app.post("/api/terminals", async (req) => createOrAttachTerminal(terminalCreateSchema.parse(req.body)));
app.get("/api/terminals/:id/scrollback", async (req) => {
  const { id } = req.params as { id: string };
  return { data: getScrollback(id) };
});
app.delete("/api/terminals/:id", async (req) => {
  const { id } = req.params as { id: string };
  killTerminal(id);
  return { ok: true };
});

function originAllowed(req: { headers: Record<string, string | string[] | undefined> }) {
  const origin = String(req.headers.origin || "");
  if (!origin) return true;
  const host = String(req.headers.host || "");
  try {
    const u = new URL(origin);
    if (u.host === host) return true;
    if (["127.0.0.1", "localhost"].includes(u.hostname)) return true;
    if (devClientProxy && (u.hostname.endsWith(".ngrok-free.dev") || u.hostname.endsWith(".ngrok.app"))) {
      return true;
    }
    if (devClientProxy && (u.hostname.endsWith(".trycloudflare.com") || u.hostname.endsWith(".cfargotunnel.com"))) {
      return true;
    }
    const allowed = (process.env.MESH_ALLOWED_ORIGINS || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    return allowed.includes(origin);
  } catch {
    return false;
  }
}

app.get("/api/terminals/:id/socket", { websocket: true }, (socket, req) => {
  if (!originAllowed(req)) {
    socket.close(1008, "origin denied");
    return;
  }
  const user = getUserFromRequest(req);
  if (!user) {
    socket.close(1008, "login required");
    return;
  }
  const { id } = req.params as { id: string };
  attachClient(id, socket, user);
});

const devClientPort = Number(process.env.MESH_DEV_CLIENT_PORT || 5174);
const devClientProxy =
  process.env.MESH_DEV_CLIENT_PROXY === "true" ||
  process.env.npm_lifecycle_event === "dev:server";
const clientDist = path.resolve("dist/client");

if (devClientProxy) {
  app.setNotFoundHandler(async (req, reply) => {
    if (req.url.startsWith("/api/")) return reply.code(404).send({ error: "not found" });
    const upstream = `http://127.0.0.1:${devClientPort}${req.url}`;
    try {
      const res = await fetch(upstream, {
        method: req.method,
        headers: {
          accept: String(req.headers.accept || "*/*"),
          "user-agent": String(req.headers["user-agent"] || "MeshServer")
        }
      });
      reply.code(res.status);
      res.headers.forEach((value, key) => {
        if (!["content-encoding", "content-length", "transfer-encoding"].includes(key)) {
          reply.header(key, value);
        }
      });
      if (!res.body) return reply.send();
      return reply.send(Readable.fromWeb(res.body as import("node:stream/web").ReadableStream));
    } catch {
      reply.code(503).type("text/html").send(`
        <!doctype html>
        <html>
          <body style="background:#000;color:#e9eaec;font-family:system-ui;padding:32px">
            <h1>Mesh client is not ready</h1>
            <p>Vite is expected at <code>127.0.0.1:${devClientPort}</code>.</p>
            <p>Keep <code>npm run dev</code> running, then refresh.</p>
          </body>
        </html>
      `);
    }
  });
} else if (fs.existsSync(clientDist)) {
  await app.register(fastifyStatic, { root: clientDist, wildcard: false });
  app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith("/api/")) return reply.code(404).send({ error: "not found" });
    return reply.sendFile("index.html");
  });
}

app.listen({ host: config.host, port: config.port }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
