import os from "node:os";
import path from "node:path";

export function expandHome(input: string): string {
  if (input === "~") return os.homedir();
  if (input.startsWith("~/") || input.startsWith("~\\")) {
    return path.join(os.homedir(), input.slice(2));
  }
  return input;
}

function defaultAllowedRoots(): string {
  return [os.homedir(), path.join(os.homedir(), "projects")].join(path.delimiter);
}

export const config = {
  host: process.env.MESH_HOST || "127.0.0.1",
  port: Number(process.env.MESH_PORT || 8787),
  dataDir: path.resolve(expandHome(process.env.MESH_DATA_DIR || "~/.mesh-server")),
  allowedRoots: (process.env.MESH_ALLOWED_ROOTS || defaultAllowedRoots())
    .split(path.delimiter)
    .map((p) => path.resolve(expandHome(p.trim())))
    .filter(Boolean),
  sessionCookie: "mesh_session",
  secureCookies: process.env.MESH_SECURE_COOKIES === "true",
  adminUser: process.env.MESH_ADMIN_USER || "",
  adminPassword: process.env.MESH_ADMIN_PASSWORD || ""
};
