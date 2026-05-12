import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import type { IPty } from "node-pty";
import type { WebSocket } from "@fastify/websocket";
import { config } from "./config.js";
import { db, now } from "./db.js";
import { safeResolve } from "./services/files.js";

type Client = { socket: WebSocket; userId: string; username: string };

type Session = {
  id: string;
  pty: IPty;
  logPath: string;
  clients: Set<Client>;
  pendingOutput: string;
  outputTimer: NodeJS.Timeout | null;
};

const sessions = new Map<string, Session>();
const logDir = path.join(config.dataDir, "terminal-logs");
fs.mkdirSync(logDir, { recursive: true });
const require = createRequire(import.meta.url);

function loadPty(): typeof import("node-pty") {
  try {
    return require("node-pty") as typeof import("node-pty");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      [
        "node-pty native binding is not available, so Mesh cannot spawn real terminals.",
        "On Ubuntu install build tools, then rebuild it:",
        "  sudo apt-get update && sudo apt-get install -y build-essential python3 make g++",
        "  npm run rebuild:pty",
        "  npm run doctor:pty",
        `Original error: ${message}`
      ].join("\n")
    );
  }
}

function cleanId(id: string) {
  return id.replace(/[^a-zA-Z0-9_.-]/g, "_");
}

function defaultShell() {
  if (process.platform === "win32") return process.env.ComSpec || "cmd.exe";
  return process.env.SHELL || "bash";
}

function logPath(id: string) {
  return path.join(logDir, `${cleanId(id)}.log`);
}

function broadcast(session: Session, payload: unknown) {
  const data = JSON.stringify(payload);
  for (const client of session.clients) {
    if (client.socket.readyState === 1) client.socket.send(data);
  }
}

function flushOutput(session: Session) {
  if (!session.pendingOutput) return;
  const data = session.pendingOutput;
  session.pendingOutput = "";
  session.outputTimer = null;
  broadcast(session, { type: "output", data });
}

function queueOutput(session: Session, data: string) {
  session.pendingOutput += data;
  if (session.pendingOutput.length >= 64 * 1024) {
    if (session.outputTimer) clearTimeout(session.outputTimer);
    flushOutput(session);
    return;
  }
  if (session.outputTimer) return;
  session.outputTimer = setTimeout(() => flushOutput(session), 4);
}

export function terminalRecords() {
  const rows = db.prepare("SELECT * FROM terminals ORDER BY created_at DESC").all() as Array<{
    id: string;
    shell: string | null;
    cwd: string | null;
    cols: number;
    rows: number;
    created_at: number;
    last_active_user: string | null;
  }>;
  return rows.map((row) => ({
    id: row.id,
    shell: row.shell,
    cwd: row.cwd,
    cols: row.cols,
    rows: row.rows,
    createdAt: row.created_at,
    lastActiveUser: row.last_active_user,
    alive: sessions.has(row.id)
  }));
}

export function getScrollback(id: string, maxBytes = 250_000) {
  const file = logPath(id);
  if (!fs.existsSync(file)) return "";
  const stat = fs.statSync(file);
  const size = Math.min(stat.size, maxBytes);
  const fd = fs.openSync(file, "r");
  try {
    const buf = Buffer.alloc(size);
    fs.readSync(fd, buf, 0, size, Math.max(0, stat.size - size));
    return buf.toString("utf8");
  } finally {
    fs.closeSync(fd);
  }
}

export function createOrAttachTerminal(input: {
  id: string;
  shell?: string | null;
  cwd?: string | null;
  cols: number;
  rows: number;
  initialCommand?: string | null;
}) {
  if (sessions.has(input.id)) return terminalRecords().find((t) => t.id === input.id);
  const cwd = input.cwd ? safeResolve(input.cwd) : os.homedir();
  const shell = input.shell || defaultShell();
  const sessionLogPath = logPath(input.id);
  const pty = loadPty();
  let term: IPty;
  try {
    term = pty.spawn(shell, [], {
    name: "xterm-256color",
    cols: input.cols,
    rows: input.rows,
    cwd,
      env: {
        ...process.env,
        TERM: "xterm-256color",
        COLORTERM: process.env.COLORTERM || "truecolor"
      }
    });
  } catch {
    if (shell !== defaultShell()) {
      term = pty.spawn(defaultShell(), [], {
        name: "xterm-256color",
        cols: input.cols,
        rows: input.rows,
        cwd,
        env: { ...process.env, TERM: "xterm-256color" }
      });
    } else {
      throw new Error(`Failed to spawn shell: ${shell}`);
    }
  }
  const session: Session = {
    id: input.id,
    pty: term,
    logPath: sessionLogPath,
    clients: new Set(),
    pendingOutput: "",
    outputTimer: null
  };
  sessions.set(input.id, session);
  db.prepare(
    `INSERT INTO terminals (id, shell, cwd, cols, rows, created_at, alive)
     VALUES (?, ?, ?, ?, ?, ?, 1)
     ON CONFLICT(id) DO UPDATE SET shell=excluded.shell, cwd=excluded.cwd, cols=excluded.cols, rows=excluded.rows, alive=1`
  ).run(input.id, shell, cwd, input.cols, input.rows, now());

  term.onData((data) => {
    fs.appendFile(sessionLogPath, data, () => {});
    queueOutput(session, data);
  });
  term.onExit(() => {
    if (session.outputTimer) clearTimeout(session.outputTimer);
    flushOutput(session);
    db.prepare("UPDATE terminals SET alive = 0 WHERE id = ?").run(input.id);
    broadcast(session, { type: "exit" });
    sessions.delete(input.id);
  });
  if (input.initialCommand?.trim()) {
    windowlessWrite(term, `${input.initialCommand}\r`);
  }
  return terminalRecords().find((t) => t.id === input.id);
}

function windowlessWrite(term: IPty, data: string) {
  setTimeout(() => term.write(data), 80);
}

export function attachClient(
  id: string,
  socket: WebSocket,
  user: { id: string; username: string }
) {
  const session = sessions.get(id);
  if (!session) {
    socket.send(JSON.stringify({ type: "exit" }));
    return;
  }
  const client: Client = { socket, userId: user.id, username: user.username };
  session.clients.add(client);
  const scrollback = getScrollback(id);
  if (scrollback) socket.send(JSON.stringify({ type: "output", data: scrollback }));
  const heartbeat = setInterval(() => {
    if (socket.readyState === 1) socket.send(JSON.stringify({ type: "ping", t: Date.now() }));
  }, 25_000);

  socket.on("message", (raw: unknown) => {
    let msg: { type?: string; data?: string; cols?: number; rows?: number };
    try {
      msg = JSON.parse(String(raw));
    } catch {
      return;
    }
    db.prepare("UPDATE terminals SET last_active_user = ? WHERE id = ?").run(user.username, id);
    if (msg.type === "input" && typeof msg.data === "string") {
      session.pty.write(msg.data);
    }
    if (msg.type === "resize" && msg.cols && msg.rows) {
      session.pty.resize(msg.cols, msg.rows);
      db.prepare("UPDATE terminals SET cols = ?, rows = ? WHERE id = ?").run(msg.cols, msg.rows, id);
    }
  });
  socket.on("close", () => {
    clearInterval(heartbeat);
    session.clients.delete(client);
  });
}

export function killTerminal(id: string) {
  const session = sessions.get(id);
  if (session) session.pty.kill();
  sessions.delete(id);
  db.prepare("UPDATE terminals SET alive = 0 WHERE id = ?").run(id);
}
