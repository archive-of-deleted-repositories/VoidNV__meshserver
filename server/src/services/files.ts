import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { config, expandHome } from "../config.js";
import type { FsEntry } from "../../../shared/types.js";

function isInside(root: string, target: string): boolean {
  const rel = path.relative(root, target);
  return rel === "" || (!!rel && !rel.startsWith("..") && !path.isAbsolute(rel));
}

export function allowedRoots() {
  return config.allowedRoots;
}

export function safeResolve(input: string): string {
  const target = path.resolve(expandHome(input));
  if (!config.allowedRoots.some((root) => isInside(root, target))) {
    throw new Error(
      [
        `Path is outside allowed workspace roots: ${target}`,
        `Allowed roots: ${config.allowedRoots.join(", ")}`,
        "Set MESH_ALLOWED_ROOTS to include this folder, then restart Mesh Server."
      ].join("\n")
    );
  }
  return target;
}

export function homePath() {
  const preferred = config.allowedRoots[0];
  return preferred || os.homedir();
}

export async function listDir(input: string): Promise<FsEntry[]> {
  const dir = safeResolve(input);
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const rows = await Promise.all(
    entries.slice(0, 800).map(async (entry) => {
      const full = path.join(dir, entry.name);
      const stat = await fs.stat(full).catch(() => null);
      return {
        name: entry.name,
        path: full,
        is_dir: entry.isDirectory(),
        size: stat?.size ?? 0
      };
    })
  );
  return rows.sort((a, b) => Number(b.is_dir) - Number(a.is_dir) || a.name.localeCompare(b.name));
}

export async function readFile(input: string, maxBytes = 1_000_000): Promise<string> {
  const file = safeResolve(input);
  const stat = await fs.stat(file);
  if (!stat.isFile()) throw new Error("Path is not a file");
  const handle = await fs.open(file, "r");
  try {
    const size = Math.min(stat.size, maxBytes);
    const buf = Buffer.alloc(size);
    await handle.read(buf, 0, size, 0);
    return buf.toString("utf8");
  } finally {
    await handle.close();
  }
}

export async function writeFile(input: string, contents: string): Promise<void> {
  const file = safeResolve(input);
  const parent = path.dirname(file);
  safeResolve(parent);
  await fs.mkdir(parent, { recursive: true });
  await fs.writeFile(file, contents, "utf8");
}
