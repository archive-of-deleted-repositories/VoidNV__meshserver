import crypto from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { config } from "./config.js";
import { db, now } from "./db.js";

export type SessionUser = { id: string; username: string };

function randomId(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("base64url");
  const hash = crypto.scryptSync(password, salt, 64).toString("base64url");
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [kind, salt, hash] = stored.split("$");
  if (kind !== "scrypt" || !salt || !hash) return false;
  const actual = Buffer.from(hash, "base64url");
  const expected = crypto.scryptSync(password, salt, actual.length);
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

export function ensureBootstrapAdmin() {
  const count = db.prepare("SELECT COUNT(*) AS count FROM users").get() as { count: number };
  if (count.count > 0) return;
  if (!config.adminUser || !config.adminPassword) return;
  db.prepare(
    "INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)"
  ).run(randomId(12), config.adminUser, hashPassword(config.adminPassword), now());
}

export function hasUsers(): boolean {
  const row = db.prepare("SELECT COUNT(*) AS count FROM users").get() as { count: number };
  return row.count > 0;
}

export function createUser(username: string, password: string) {
  const id = randomId(12);
  db.prepare(
    "INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)"
  ).run(id, username, hashPassword(password), now());
  return { id, username };
}

export function login(username: string, password: string): SessionUser | null {
  const row = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as
    | { id: string; username: string; password_hash: string }
    | undefined;
  if (!row || !verifyPassword(password, row.password_hash)) return null;
  return { id: row.id, username: row.username };
}

export function createSession(reply: FastifyReply, user: SessionUser) {
  const id = randomId();
  const expires = now() + 1000 * 60 * 60 * 24 * 14;
  db.prepare("INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)").run(
    id,
    user.id,
    expires,
    now()
  );
  reply.setCookie(config.sessionCookie, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.secureCookies,
    path: "/",
    expires: new Date(expires)
  });
}

export function clearSession(req: FastifyRequest, reply: FastifyReply) {
  const id = req.cookies?.[config.sessionCookie];
  if (id) db.prepare("DELETE FROM sessions WHERE id = ?").run(id);
  reply.clearCookie(config.sessionCookie, { path: "/" });
}

export function getUserFromRequest(req: FastifyRequest): SessionUser | null {
  const sessionId = req.cookies?.[config.sessionCookie];
  if (!sessionId) return null;
  const row = db
    .prepare(
      `SELECT users.id, users.username, sessions.expires_at
       FROM sessions JOIN users ON users.id = sessions.user_id
       WHERE sessions.id = ?`
    )
    .get(sessionId) as { id: string; username: string; expires_at: number } | undefined;
  if (!row || row.expires_at < now()) {
    if (sessionId) db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
    return null;
  }
  return { id: row.id, username: row.username };
}

export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  const user = getUserFromRequest(req);
  if (!user) {
    reply.code(401).send({ error: "login required" });
    return;
  }
  (req as FastifyRequest & { user: SessionUser }).user = user;
}
